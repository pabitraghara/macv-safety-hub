// Shared domain types used across observations and incidents

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  avatar_url: string | null;
  avatar_color?: string;
}

export interface EntityType {
  id: string;
  code: string;
  name: string;
  sla_hours: number | null;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  timezone: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
}

export interface ActivityMetadata {
  comment_id?: string;
  full_comment?: string;
  [key: string]: unknown;
}

export interface Activity {
  id: string;
  type: 'activity' | 'comment';
  actor_id: string;
  activity_type: string;
  description: string | null;
  activity_metadata: ActivityMetadata | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  actor: User;
  parent_comment_id: string | null;
  replies: Activity[];
}

export interface Attachment {
  id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  url: string;
  blob_name: string;
  media_type: string;
  uploaded_by: string;
  uploaded_at: string;
  meta_data: {
    file_size: number;
    content_type: string;
    file_extension: string;
    original_filename: string;
  };
}
