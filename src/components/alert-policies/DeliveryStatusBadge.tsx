"use client";

import { Badge } from "@/components/ui/badge";

/**
 * Presentation for a `notification_logs` row's status, shared by the delivery
 * log table and the per-entity "Alerts sent" panel so the two never drift.
 *
 * `suppressed` is not a failure — it means a policy cooldown deliberately
 * swallowed a repeat delivery — so it reads neutral, not red.
 */

export const DELIVERY_STATUS_CLASSES: Record<string, string> = {
  sent: "border-green-200 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
  failed:
    "border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  suppressed:
    "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  queued:
    "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
};

export const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  in_app: "In-app",
};

export const TRIGGER_TYPE_LABELS: Record<string, string> = {
  observation: "Observation",
  speed_violation: "Speed violation",
  alpr: "ANPR detection",
};

export function DeliveryStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs capitalize ${
        DELIVERY_STATUS_CLASSES[status] ?? "text-muted-foreground"
      }`}
    >
      {status}
    </Badge>
  );
}

/** Absolute local time — a delivery record is an audit trail, not a feed. */
export function formatDeliveryTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
