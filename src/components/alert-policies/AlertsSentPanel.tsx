"use client";

import { useMemo, useState } from "react";
import { BellRing, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveryLog } from "@/api/notification-logs";
import {
  CHANNEL_LABELS,
  DeliveryStatusBadge,
  formatDeliveryTime,
} from "./DeliveryStatusBadge";

/**
 * "Alerts sent" for one entity — who was told about this violation /
 * observation, on which channel, and whether it actually went out.
 *
 * Rendered as a single collapsible row: the header carries the whole summary
 * (delivery count + a failure hint) so the panel costs one line when nobody
 * needs the detail, and expands to the full per-recipient breakdown on click.
 *
 * One `?trigger_id=` call against the delivery log. An empty result is shown
 * rather than hidden: "nobody was alerted" is the answer people come here for,
 * and silently rendering nothing looks identical to a failed fetch.
 */

// A single event fans out to at most a handful of recipients x channels; one
// page covers every realistic case, so the panel has no pagination.
const MAX_ROWS = 50;

export interface AlertsSentPanelProps {
  triggerId: string;
  className?: string;
}

export function AlertsSentPanel({
  triggerId,
  className,
}: AlertsSentPanelProps) {
  const [open, setOpen] = useState(false);
  const filters = useMemo(
    () => ({ trigger_id: triggerId, page_size: MAX_ROWS }),
    [triggerId],
  );
  const { items, loading, error, initialized } = useDeliveryLog(filters);

  const failedCount = items.filter((e) => e.status === "failed").length;

  // The header summary describes what the collapsed row stands in for.
  let summary: React.ReactNode = null;
  if (!initialized && loading) {
    summary = <Skeleton className="h-4 w-16" />;
  } else if (error) {
    summary = (
      <span className="text-muted-foreground text-xs">Couldn&apos;t load</span>
    );
  } else if (items.length === 0) {
    summary = (
      <span className="text-muted-foreground text-xs">No alerts sent</span>
    );
  } else {
    summary = (
      <span className="text-muted-foreground text-xs">
        {items.length} {items.length === 1 ? "delivery" : "deliveries"}
        {failedCount > 0 && (
          <span className="text-destructive">
            {" · "}
            {failedCount} failed
          </span>
        )}
      </span>
    );
  }

  // Only offer expansion when there is a detail worth revealing.
  const expandable = !error && items.length > 0;

  return (
    <Card className={`p-4 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        disabled={!expandable}
        aria-expanded={expandable ? open : undefined}
        className={`flex w-full items-center gap-2 text-left ${
          expandable ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <BellRing className="text-muted-foreground h-4 w-4 shrink-0" />
        <h2 className="text-sm font-semibold tracking-wide uppercase">
          Alerts sent
        </h2>
        <div className="ml-auto flex items-center gap-2">
          {summary}
          {expandable && (
            <ChevronDown
              className={`text-muted-foreground h-4 w-4 shrink-0 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          )}
        </div>
      </button>

      {expandable && open && (
        <ul className="divide-border mt-3 divide-y border-t pt-3">
          {items.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {entry.recipient_label ??
                    entry.sent_to ??
                    "Unknown recipient"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {CHANNEL_LABELS[entry.channel] ?? entry.channel}
                  {entry.policy_name ? ` · ${entry.policy_name}` : ""}
                  {" · "}
                  {formatDeliveryTime(entry.sent_at ?? entry.created_at)}
                </p>
                {entry.failed_reason && (
                  <p className="text-destructive mt-0.5 text-xs">
                    {entry.failed_reason}
                  </p>
                )}
              </div>
              <DeliveryStatusBadge status={entry.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
