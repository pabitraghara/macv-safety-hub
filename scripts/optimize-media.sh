#!/bin/bash
#
# Prepare clips in public/data/ for the web.
#
# Source clips come off the camera as 4K/12Mbps with the moov atom written
# AFTER the media data, which means a browser must download the whole ~15MB
# file before it can paint a single frame. Combined with one clip per list row,
# nothing ever finishes loading and every player stays black.
#
# This rewrites each clip as 720p (~2Mbps) with +faststart, and extracts a
# poster frame next to it so the list can show stills instead of video
# elements. Output replaces the input in place; originals are recoverable from
# git (`git checkout -- public/data`).
#
# Safe to re-run: clips that already have a poster and are 720p are skipped.
#
# Usage: ./scripts/optimize-media.sh [parallel_jobs]
set -euo pipefail

DATA_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/data"
JOBS="${1:-5}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

command -v ffmpeg >/dev/null || { echo "ffmpeg is required" >&2; exit 1; }
command -v ffprobe >/dev/null || { echo "ffprobe is required" >&2; exit 1; }

transcode_one() {
  set -euo pipefail
  src="$1"; work="$2"
  base="$(basename "$src" .mp4)"
  dir="$(dirname "$src")"

  height="$(ffprobe -v error -select_streams v:0 -show_entries stream=height \
    -of csv=p=0 "$src")"
  if [ "$height" -le 720 ] && [ -s "$dir/$base.jpg" ]; then
    echo "skip   $base (already optimized)"
    return
  fi

  ffmpeg -v error -y -i "$src" \
    -vf "scale=-2:720" \
    -c:v libx264 -preset fast -crf 26 -maxrate 2000k -bufsize 4000k \
    -pix_fmt yuv420p -g 60 \
    -c:a aac -b:a 64k \
    -movflags +faststart \
    "$work/$base.mp4"

  # 0.5s in, so a clip that opens on a camera adjustment still gets a usable frame.
  ffmpeg -v error -y -ss 0.5 -i "$src" -frames:v 1 -vf "scale=-2:288" -q:v 5 \
    "$work/$base.jpg"

  # Only replace the source once both outputs exist and are non-empty.
  [ -s "$work/$base.mp4" ] && [ -s "$work/$base.jpg" ]
  mv "$work/$base.mp4" "$dir/$base.mp4"
  mv "$work/$base.jpg" "$dir/$base.jpg"
  echo "ok     $base"
}
export -f transcode_one

find "$DATA_DIR" -name '*.mp4' -print0 \
  | xargs -0 -P "$JOBS" -I{} bash -c 'transcode_one "$@"' _ {} "$WORK_DIR"

echo "Done. public/data is now $(du -sh "$DATA_DIR" | cut -f1)."
