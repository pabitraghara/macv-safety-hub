"use client";

import { Check, CircleCheckBig } from "lucide-react";
import {
  MobileCardList,
  RecordCard,
  type RecordCardField,
} from "@/components/common/RecordCard";
import { DataTable } from "@/components/ui/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/common/TablePagination";
import { useTimezone } from "@/contexts/TimezoneContext";
import type { CraneProximityAlert } from "@/api/cranes";
import { formatMetres } from "../_hooks/craneFilters";
import { CraneAlertStatusBadge, CraneLevelBadge } from "./CraneStatusBadge";

interface CraneAlertsTableProps {
  alerts: CraneProximityAlert[];
  metadata: { total_count: number; page: number; page_size: number };
  onPageChange: (page: number) => void;
  /** Both undefined when the viewer lacks crane:manage. */
  onAcknowledge?: (alert: CraneProximityAlert) => void;
  onResolve?: (alert: CraneProximityAlert) => void;
  /** Alert id currently being mutated, so its buttons can disable. */
  pendingId?: string | null;
}

/**
 * Timezone-aware timestamp rendering. The platform has no shared date
 * formatter, so this formats inline with Intl in the user's active timezone
 * (from TimezoneContext), matching SpeedViolationsTable.
 */
function formatTimestamp(timestamp: string | null, timezone: string): string {
  if (!timestamp) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return timestamp;
  }
}

function pairLabel(alert: CraneProximityAlert): string {
  return `${alert.crane_a_name ?? "Unknown"} ↔ ${alert.crane_b_name ?? "Unknown"}`;
}

function RowActions({
  alert,
  onAcknowledge,
  onResolve,
  pendingId,
}: Pick<CraneAlertsTableProps, "onAcknowledge" | "onResolve" | "pendingId"> & {
  alert: CraneProximityAlert;
}) {
  const busy = pendingId === alert.id;
  const canAck = onAcknowledge && !alert.acknowledged_at;
  // Resolving is a manual override of an alert the edge would normally close
  // itself, so it is offered only while the alert is actually open.
  const canResolve = onResolve && alert.status === "open";

  if (!canAck && !canResolve) return <span>—</span>;

  return (
    <div className="flex items-center justify-end gap-1">
      {canAck && (
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={busy}
          onClick={() => onAcknowledge?.(alert)}
        >
          <Check className="h-3.5 w-3.5" />
          Ack
        </Button>
      )}
      {canResolve && (
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={busy}
          onClick={() => onResolve?.(alert)}
        >
          Resolve
        </Button>
      )}
    </div>
  );
}

export function CraneAlertsTable({
  alerts,
  metadata,
  onPageChange,
  onAcknowledge,
  onResolve,
  pendingId,
}: CraneAlertsTableProps) {
  const { timezone } = useTimezone();

  return (
    <>
      {/* DataTable is hidden below md, so the mobile breakpoint needs its own list. */}
      <MobileCardList>
        {alerts.map((alert) => {
          const fields: RecordCardField[] = [
            { label: "Level", value: <CraneLevelBadge level={alert.level} /> },
            {
              label: "Status",
              value: <CraneAlertStatusBadge status={alert.status} />,
            },
            { label: "Closest", value: formatMetres(alert.min_distance_m) },
            { label: "Last", value: formatMetres(alert.last_distance_m) },
            {
              label: "Opened",
              value: formatTimestamp(alert.opened_at, timezone),
              full: true,
            },
            {
              label: "Resolved",
              value: alert.resolved_at
                ? `${formatTimestamp(alert.resolved_at, timezone)}${
                    alert.resolution_reason
                      ? ` (${alert.resolution_reason})`
                      : ""
                  }`
                : "—",
              full: true,
            },
            {
              label: "Acknowledged",
              value: alert.acknowledged_at
                ? (alert.acknowledged_by ??
                  formatTimestamp(alert.acknowledged_at, timezone))
                : "—",
              full: true,
            },
          ];

          return (
            <RecordCard
              key={alert.id}
              title={pairLabel(alert)}
              subtitle={alert.site_name ?? undefined}
              fields={fields}
              footer={
                <RowActions
                  alert={alert}
                  onAcknowledge={onAcknowledge}
                  onResolve={onResolve}
                  pendingId={pendingId}
                />
              }
            />
          );
        })}
      </MobileCardList>

      <DataTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Cranes</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Closest</TableHead>
              <TableHead className="text-right">Last</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Resolved</TableHead>
              <TableHead>Acknowledged</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell className="pl-6 font-medium">
                  {pairLabel(alert)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {alert.site_name ?? "—"}
                </TableCell>
                <TableCell>
                  <CraneLevelBadge level={alert.level} />
                </TableCell>
                <TableCell>
                  <CraneAlertStatusBadge status={alert.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMetres(alert.min_distance_m)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMetres(alert.last_distance_m)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatTimestamp(alert.opened_at, timezone)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {alert.resolved_at ? (
                    <span>
                      {formatTimestamp(alert.resolved_at, timezone)}
                      {alert.resolution_reason && (
                        <span className="ml-1 opacity-70">
                          ({alert.resolution_reason})
                        </span>
                      )}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {alert.acknowledged_at ? (
                    <span className="flex items-center gap-1">
                      <CircleCheckBig className="h-3.5 w-3.5 text-emerald-600" />
                      {alert.acknowledged_by ??
                        formatTimestamp(alert.acknowledged_at, timezone)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <RowActions
                    alert={alert}
                    onAcknowledge={onAcknowledge}
                    onResolve={onResolve}
                    pendingId={pendingId}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTable>

      <TablePagination
        page={metadata.page}
        pageSize={metadata.page_size}
        totalCount={metadata.total_count}
        onPageChange={onPageChange}
      />
    </>
  );
}

export default CraneAlertsTable;
