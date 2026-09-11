import type { PaginatedResponse } from "../base/http";
import type { Observation } from "../observations/types";

/** Aggregate status/severity counts returned by the home observations endpoint */
export type ObservationCounts = {
  open_count: number;
  escalated_count: number;
  in_progress_count: number;
  resolved_count: number;
  closed_count: number;
  critical_count: number;
};

/** Pre-aggregated violation-type breakdown over the full dataset */
export type ViolationTypeCount = {
  violation_type_id: string;
  code: string;
  name: string;
  category: string | null;
  count: number;
};

export type ViolationDescriptionCount = {
  description: string;
  count: number;
};

/** Pre-aggregated per-site breakdown over the full dataset */
export type SiteCount = {
  site_id: string;
  code: string;
  name: string;
  count: number;
};

export type ObservationsHomePageResponse = PaginatedResponse<Observation> &
  Partial<ObservationCounts> & {
    observations_by_violation_type?: ViolationTypeCount[];
    observations_by_description?: ViolationDescriptionCount[];
    observations_by_site?: SiteCount[];
  };

export type Notification = {
  id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  user_id: string;
  event_type: string;
  resource_type: "incident" | "observation";
  resource_id: string;
  actor_id: string | null;
  title: string;
  body: string | null;
  read_at: string | null;
};

export type NotificationPreference = {
  id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  user_id: string;
  event_type: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
};

export type NotificationPreferenceUpdate = {
  preferences: Array<{
    event_type: string;
    in_app_enabled: boolean;
    email_enabled: boolean;
  }>;
};

export const NOTIFICATION_EVENT_LABELS: Record<string, string> = {
  "incident.assigned_to_me": "Incident assigned to me",
  "incident.unassigned": "Incident unassigned from me",
  "incident.comment_added": "Comment added to incident",
  "incident.status_changed": "Incident status changed",
  "observation.triage_status_changed": "Observation triage status changed",
};
