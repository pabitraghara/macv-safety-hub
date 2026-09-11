"use client";

import { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CraneProximityAlert } from "@/api/cranes";
import { formatMetres } from "../_hooks/craneFilters";
import { useRelativeTime } from "../_hooks/useRelativeTime";

interface AlertBannerProps {
  alerts: CraneProximityAlert[];
  /** Undefined when the viewer lacks crane:manage — the button is then hidden. */
  onAcknowledge?: (alertId: string) => Promise<void> | void;
}

function craneNames(alert: CraneProximityAlert): string {
  const a = alert.crane_a_name ?? "Unknown crane";
  const b = alert.crane_b_name ?? "Unknown crane";
  return `${a} ↔ ${b}`;
}

function AlertRow({
  alert,
  onAcknowledge,
}: {
  alert: CraneProximityAlert;
  onAcknowledge?: (alertId: string) => Promise<void> | void;
}) {
  const [acknowledging, setAcknowledging] = useState(false);
  const isCritical = alert.level === "critical";

  // Recomputed on a timer rather than only at mount: an open alert can sit
  // unchanged for a long time, and "opened a few seconds ago" on a breach that
  // is ten minutes old is the kind of number people act on.
  const opened = useRelativeTime(alert.opened_at);

  async function acknowledge() {
    if (!onAcknowledge) return;
    try {
      setAcknowledging(true);
      await onAcknowledge(alert.id);
    } finally {
      setAcknowledging(false);
    }
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-sm ${
        isCritical
          ? "border-red-300 bg-red-50 text-red-900"
          : "border-amber-300 bg-amber-50 text-amber-900"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="font-semibold uppercase">{alert.level}</span>
        <span className="min-w-0 break-words">
          {craneNames(alert)} at{" "}
          <b className="tabular-nums">{formatMetres(alert.last_distance_m)}</b>{" "}
          (closest {formatMetres(alert.min_distance_m)}) · opened {opened}
        </span>
      </div>
      {alert.acknowledged_at ? (
        <span className="shrink-0 text-xs opacity-80">
          acknowledged
          {alert.acknowledged_by ? ` by ${alert.acknowledged_by}` : ""}
        </span>
      ) : (
        onAcknowledge && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 bg-white/70"
            disabled={acknowledging}
            onClick={acknowledge}
          >
            {acknowledging ? "Acknowledging…" : "Acknowledge"}
          </Button>
        )
      )}
    </div>
  );
}

/**
 * The open-alert banner above the live map.
 *
 * Acknowledging is explicitly NOT resolving: the edge closes an alert when the
 * cranes separate, so a human can only record that they have seen it. The
 * all-clear state is rendered too rather than collapsing to nothing, so an
 * empty banner never reads as "the feed is broken".
 */
export function AlertBanner({ alerts, onAcknowledge }: AlertBannerProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        No active proximity alerts
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <AlertRow key={alert.id} alert={alert} onAcknowledge={onAcknowledge} />
      ))}
    </div>
  );
}

export default AlertBanner;
