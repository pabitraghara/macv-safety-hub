"use client";

import { Badge } from "@/components/ui/badge";
import type { CraneAlertStatus, CranePairLevel } from "@/api/cranes";
import { CRANE_LEVEL_STYLE, CRANE_STATUS_STYLE } from "../_hooks/craneFilters";

const LEVEL_LABEL: Record<CranePairLevel, string> = {
  none: "clear",
  warning: "warning",
  critical: "critical",
};

/** Proximity level of a pair or a crane, in the house outline-badge style. */
export function CraneLevelBadge({ level }: { level: CranePairLevel }) {
  return (
    <Badge variant="outline" className={`text-xs ${CRANE_LEVEL_STYLE[level]}`}>
      {LEVEL_LABEL[level]}
    </Badge>
  );
}

/** Whether an alert is still open or has been resolved. */
export function CraneAlertStatusBadge({
  status,
}: {
  status: CraneAlertStatus;
}) {
  return (
    <Badge
      variant="outline"
      className={`text-xs ${CRANE_STATUS_STYLE[status]}`}
    >
      {status}
    </Badge>
  );
}

/**
 * Liveness of a crane's GPS feed. "stale" means the newest fix is older than
 * the site's `stale_after_s`, so the crane is excluded from pair evaluation
 * and its marker is dimmed — it is a data-freshness state, not a proximity one.
 */
export function CraneLivenessBadge({ isStale }: { isStale: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        isStale
          ? "border-gray-200 bg-gray-100 text-xs text-gray-600"
          : "border-emerald-200 bg-emerald-100 text-xs text-emerald-800"
      }
    >
      {isStale ? "stale" : "live"}
    </Badge>
  );
}
