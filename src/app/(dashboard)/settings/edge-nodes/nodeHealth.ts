// Shared health derivations for edge (pipeline) nodes. Kept pure so the table
// and the detail page agree on liveness, and so the thresholds live in one
// place. See macv-safety-hub/app/schemas/pipeline_node.py for the source data.

import type { PipelineNode } from "@/api/pipeline-nodes";

export type Liveness = "online" | "stale" | "offline" | "never";

// A healthy box checks in every 300s; cameras heartbeat more often. Tolerate
// one missed check-in before "stale", and a longer gap before "offline".
const ONLINE_WITHIN_MS = 10 * 60_000;
const STALE_WITHIN_MS = 30 * 60_000;

/** The most recent sign of life: camera heartbeats bump `last_seen_at`, the
 * node check-in bumps `checkin_at`. A node with zero cameras only has the
 * latter, so we take whichever is newer. */
export function nodeFreshestAt(node: PipelineNode): string | null {
  const times = [node.last_seen_at, node.checkin_at]
    .filter((t): t is string => Boolean(t))
    .map((t) => new Date(t).getTime())
    .filter((ms) => !Number.isNaN(ms));
  if (times.length === 0) return null;
  return new Date(Math.max(...times)).toISOString();
}

export function nodeLiveness(node: PipelineNode, nowMs: number): Liveness {
  const freshest = nodeFreshestAt(node);
  if (!freshest) return "never";
  const age = nowMs - new Date(freshest).getTime();
  if (age <= ONLINE_WITHIN_MS) return "online";
  if (age <= STALE_WITHIN_MS) return "stale";
  return "offline";
}

export type CamerasHealth = "ok" | "degraded" | "idle";

/** `idle` = nothing assigned; `degraded` = fewer streaming than assigned;
 * `ok` = every assigned camera is streaming. */
export function camerasHealth(node: PipelineNode): CamerasHealth {
  if (node.cameras_assigned === 0) return "idle";
  return node.cameras_streaming < node.cameras_assigned ? "degraded" : "ok";
}

export function formatUptime(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** MB → human string. Input is whole megabytes (the check-in unit). */
export function formatMb(mb: number | null): string {
  if (mb === null || mb < 0) return "—";
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export function formatPercent(pct: number | null): string {
  return pct === null ? "—" : `${Math.round(pct)}%`;
}

/** Ratio 0–100 for a used/total pair, clamped; null when either side is
 * missing so the bar can render an empty/`—` state instead of a wrong 0. */
export function usedRatio(
  used: number | null,
  total: number | null,
): number | null {
  if (used === null || total === null || total <= 0) return null;
  return Math.min(100, Math.max(0, (used / total) * 100));
}
