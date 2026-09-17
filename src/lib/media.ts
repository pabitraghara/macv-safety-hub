/**
 * Clip media lives in `public/data/` as a pair sharing one basename: the
 * web-encoded 720p mp4 and a poster frame extracted from it. Only the mp4 path
 * is recorded in observations.json, so the poster is derived from it.
 */
export function posterUrlFor(videoUrl: string): string {
  return videoUrl.replace(/\.mp4$/i, ".jpg");
}
