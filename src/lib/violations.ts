import { posterUrlFor } from "@/lib/media";
import {
  parseSafetyAnalysis,
  type SafetyAnalysis,
} from "@/lib/safety-analysis";

/**
 * Loader for the manually uploaded violation clips.
 *
 * Everything on this deployment comes from `public/observations.json`, which
 * `generate-index` writes by pairing each clip in `public/data/` with the
 * safety-agent transcript beside it. There is no backend, so this module is
 * the single place that turns those raw records into the shape the UI uses.
 */

/** Shape of one entry in public/observations.json, written by generate-index. */
interface RawObservation {
  id: string;
  code: string;
  videoUrl: string;
  description: string;
  timestamp: string | null;
}

export interface Violation {
  id: string;
  code: string;
  videoUrl: string;
  posterUrl: string;
  /** When the footage was actually recorded, read from the clip code. */
  capturedAt: Date | null;
  /** The recording this clip was cut from — all clips in one share a code prefix. */
  sessionId: string;
  /** Human-readable label for `sessionId`, e.g. "Jul 2, 13:29". */
  sessionLabel: string;
  analysis: SafetyAnalysis;
}

/**
 * Clip codes carry the capture time the records themselves lack:
 * `S7P_S710177_000001_20260702132959_0005_clip_000` is device
 * `S7P_S710177_000001`, recorded 2026-07-02 13:29:59, clip 0 of that session.
 * The `timestamp` field in observations.json is just when the index was
 * generated — identical across every record — so it is useless for trends.
 */
const SESSION_CODE =
  /^(.*_(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})_\d+)_clip_\d+$/;

function parseCode(code: string): {
  capturedAt: Date | null;
  sessionId: string;
} {
  const match = SESSION_CODE.exec(code);
  if (!match) return { capturedAt: null, sessionId: code };

  const [, sessionId, year, month, day, hour, minute, second] = match;
  const capturedAt = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  return {
    capturedAt: Number.isNaN(capturedAt.getTime()) ? null : capturedAt,
    sessionId,
  };
}

function formatSessionLabel(
  capturedAt: Date | null,
  sessionId: string,
): string {
  if (!capturedAt) return sessionId;
  // 24-hour clock keeps the label short enough for the donut legend, which is
  // only about a third of a dashboard row wide.
  return capturedAt.toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function toViolation(raw: RawObservation): Violation {
  const { capturedAt, sessionId } = parseCode(raw.code);
  return {
    id: raw.id,
    code: raw.code,
    videoUrl: raw.videoUrl,
    posterUrl: posterUrlFor(raw.videoUrl),
    capturedAt,
    sessionId,
    sessionLabel: formatSessionLabel(capturedAt, sessionId),
    analysis: parseSafetyAnalysis(raw.description),
  };
}

/** Load every violation, newest footage first. */
export async function loadViolations(
  signal?: AbortSignal,
): Promise<Violation[]> {
  const res = await fetch("/observations.json", { signal });
  if (!res.ok) throw new Error(`Request failed with ${res.status}`);

  const raw: RawObservation[] = await res.json();
  return raw
    .map(toViolation)
    .sort(
      (a, b) => (b.capturedAt?.getTime() ?? 0) - (a.capturedAt?.getTime() ?? 0),
    );
}
