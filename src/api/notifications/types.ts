export type Notification = {
  id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  user_id: string;
  event_type: string;
  resource_type: 'incident' | 'observation';
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
  'incident.assigned_to_me': 'Incident assigned to me',
  'incident.unassigned': 'Incident unassigned from me',
  'incident.comment_added': 'Comment added to incident',
  'incident.status_changed': 'Incident status changed',
  'observation.triage_status_changed': 'Observation triage status changed',
};
