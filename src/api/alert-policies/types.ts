// Wire types for policy-first alerting: AlertPolicy, AlertRecipient, and the
// org-scoped AlertTarget contact book. Mirrors
// macv-safety-hub/app/schemas/alert_policy.py field-for-field (snake_case).

export type AlertChannel = "email" | "whatsapp";
export type AlertTargetType = "user" | "external";
export type AlertTriggerType = "safety" | "speed_violation" | "alpr";
export type SeverityValue = "Low" | "Medium" | "High" | "Critical";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface ScheduleWindow {
  days: Weekday[];
  start: string; // "HH:MM" 24h
  end: string; // "HH:MM" 24h
}

export interface QuietHours {
  start: string; // "HH:MM" 24h
  end: string; // "HH:MM" 24h
}

// `schedule` jsonb; null on the policy means "always active".
export interface AlertSchedule {
  timezone: string; // IANA/zoneinfo id
  windows: ScheduleWindow[];
  quiet_hours: QuietHours[];
}

export type AlprListStatus = "blacklist" | "whitelist" | "none";

// `match` jsonb, discriminated by the policy's trigger_type. A single
// pragmatic shape carries the optional per-trigger fields; omitting a field
// means "match everything" for that trigger.
export interface AlertMatch {
  min_severity?: SeverityValue; // safety
  min_overspeed?: number; // speed_violation
  // alpr: fire only for plates whose live registration has this list status.
  // Omitted = every detection (the only way to alert on unregistered plates).
  list_status?: AlprListStatus;
}

// AlertTargetOut
export interface AlertTarget {
  id: string;
  org_id: string | null;
  site_id: string | null;
  target_type: AlertTargetType;
  target_ref: string | null;
  label: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

// AlertRecipientOut
export interface AlertRecipient {
  id: string;
  policy_id: string;
  target_id: string;
  channels: AlertChannel[];
  is_active: boolean;
  target: AlertTarget | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

// AlertPolicyOut
export interface AlertPolicy {
  id: string;
  org_id: string;
  site_id: string | null;
  name: string;
  trigger_type: AlertTriggerType;
  match: AlertMatch;
  schedule: AlertSchedule | null;
  cooldown_seconds: number | null;
  is_active: boolean;
  created_by: string | null;
  recipients: AlertRecipient[];
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

// ── Requests ──

// RecipientCreate: nested in policy create AND POST recipients. Exactly one
// of target_id OR inline external OR inline user must be provided (validated
// server-side; 422 on violation).
export interface RecipientInput {
  target_id?: string;
  target_type?: AlertTargetType;
  target_ref?: string; // logto_user_id for inline user
  label?: string;
  email?: string;
  phone?: string;
  channels: AlertChannel[];
}

// AlertPolicyCreate
export interface CreatePolicyRequest {
  name: string;
  site_id?: string | null; // null => org-wide
  trigger_type: AlertTriggerType;
  match?: AlertMatch;
  schedule?: AlertSchedule | null;
  cooldown_seconds?: number | null;
  is_active?: boolean;
  recipients?: RecipientInput[];
}

// AlertPolicyUpdate — trigger_type is immutable and intentionally absent.
export interface UpdatePolicyRequest {
  name?: string;
  site_id?: string | null;
  match?: AlertMatch;
  schedule?: AlertSchedule | null;
  cooldown_seconds?: number | null;
  is_active?: boolean;
}

// RecipientUpdate
export interface RecipientUpdate {
  channels?: AlertChannel[];
  is_active?: boolean;
}

// OrgTargetCreate
export interface CreateContactRequest {
  target_type: AlertTargetType;
  target_ref?: string; // required for user
  label?: string;
  email?: string; // required for external
  phone?: string;
  is_active?: boolean;
}

// OrgTargetUpdate — for user targets, sending email/phone -> 400.
export interface UpdateContactRequest {
  label?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
}

export interface PolicyFilters {
  site_id?: string;
  trigger_type?: AlertTriggerType;
  is_active?: boolean;
}
