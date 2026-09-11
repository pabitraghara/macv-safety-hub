// Wire types for the alert delivery record (`notification_logs`). Mirrors
// macv-safety-hub/app/schemas/notification.py::DeliveryLogEntry field-for-field
// (snake_case). Read-only — the log is immutable, so there are no write types.

export type DeliveryStatus = "queued" | "sent" | "failed" | "suppressed";
export type DeliveryChannel = "email" | "whatsapp" | "in_app";
export type DeliveryTriggerType = "observation" | "speed_violation" | "alpr";

// DeliveryLogEntry. `policy_name` / `recipient_label` / `trigger_summary` are
// resolved server-side per page; the stored row carries only ids, so any of
// them can be null for a deleted policy or an entity outside the org.
export interface DeliveryLogEntry {
  id: string;
  source: string;
  trigger_type: string;
  trigger_id: string;
  channel: string;
  sent_to: string | null;
  status: string;
  failed_reason: string | null;
  sent_at: string | null;
  policy_id: string | null;
  policy_name: string | null;
  recipient_id: string | null;
  recipient_label: string | null;
  trigger_summary: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

// DeliveryLogSummary — per-status tallies for the selected range.
export interface DeliveryLogSummary {
  sent: number;
  failed: number;
  suppressed: number;
  queued: number;
}

export interface DeliveryLogFilters {
  page?: number;
  page_size?: number;
  status?: DeliveryStatus;
  channel?: DeliveryChannel;
  policy_id?: string;
  trigger_type?: DeliveryTriggerType;
  // Every delivery for one entity — what the "Alerts sent" panel asks for.
  trigger_id?: string;
  source?: string;
  recipient_search?: string;
  start_date?: string; // ISO 8601
  end_date?: string; // ISO 8601
}

export interface DeliverySummaryFilters {
  start_date?: string;
  end_date?: string;
}
