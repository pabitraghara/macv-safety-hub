"use client";

import { useMemo } from "react";
import { Satellite } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CraneLiveCrane, CranePairDistance } from "@/api/cranes";
import {
  CRANE_DEFAULT_COLOUR,
  formatMetres,
  nearestPair,
  otherCraneId,
  worstLevelForCrane,
} from "../_hooks/craneFilters";
import { useRelativeTime } from "../_hooks/useRelativeTime";
import { CraneLevelBadge, CraneLivenessBadge } from "./CraneStatusBadge";

interface CraneLivePanelProps {
  cranes: CraneLiveCrane[];
  pairs: CranePairDistance[];
}

function LastFix({ recordedAt }: { recordedAt: string | null }) {
  // Recomputed on a timer: how old the fix is IS the number this card exists
  // to show, so it must not freeze at whatever it was when the card mounted.
  return <>{useRelativeTime(recordedAt)}</>;
}

function CraneCard({
  crane,
  pairs,
  names,
}: {
  crane: CraneLiveCrane;
  pairs: CranePairDistance[];
  names: Map<string, string>;
}) {
  const nearest = nearestPair(crane.crane_id, pairs);
  const nearestId = nearest ? otherCraneId(nearest, crane.crane_id) : null;
  const nearestName = nearestId ? (names.get(nearestId) ?? "—") : null;

  return (
    // A stale crane is dimmed to match its map marker: its numbers are the
    // last known values, not current ones, and must not read as live.
    <Card className={crane.is_stale ? "gap-0 py-0 opacity-60" : "gap-0 py-0"}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full"
              style={{ background: crane.colour || CRANE_DEFAULT_COLOUR }}
            />
            <span className="truncate text-sm font-semibold">{crane.name}</span>
            <span className="text-muted-foreground shrink-0 font-mono text-xs">
              {crane.code}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <CraneLevelBadge
              level={worstLevelForCrane(crane.crane_id, pairs)}
            />
            <CraneLivenessBadge isStale={crane.is_stale} />
          </div>
        </div>

        <dl className="text-muted-foreground mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <dt>Last fix</dt>
          <dd className="text-foreground text-right">
            <LastFix recordedAt={crane.recorded_at} />
          </dd>

          <dt>Position</dt>
          <dd className="text-foreground text-right font-mono">
            {crane.latitude != null && crane.longitude != null
              ? `${crane.latitude.toFixed(6)}, ${crane.longitude.toFixed(6)}`
              : "—"}
          </dd>

          <dt>Satellites / accuracy</dt>
          <dd className="text-foreground flex items-center justify-end gap-1">
            <Satellite className="h-3 w-3" />
            {crane.satellites ?? "—"} /{" "}
            {crane.accuracy != null ? `${crane.accuracy} m` : "—"}
          </dd>

          <dt>Nearest crane</dt>
          <dd className="text-foreground text-right">
            {nearest && nearestName
              ? `${nearestName} · ${formatMetres(nearest.effective_m)}`
              : "—"}
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}

/**
 * Per-crane status cards under the live map: how fresh the fix is, how good
 * it is, and which crane is closest. These answer "can I trust the map right
 * now?", which the map itself cannot show.
 */
export function CraneLivePanel({ cranes, pairs }: CraneLivePanelProps) {
  const names = useMemo(
    () => new Map(cranes.map((c) => [c.crane_id, c.name])),
    [cranes],
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cranes.map((crane) => (
        <CraneCard
          key={crane.crane_id}
          crane={crane}
          pairs={pairs}
          names={names}
        />
      ))}
    </div>
  );
}

export default CraneLivePanel;
