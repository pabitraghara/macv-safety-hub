export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  avatar_url: string | null;
  avatar_color?: string;
}

export interface IncidentType {
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
  type: "activity" | "comment";
  incident_id: string;
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
  incident_id: string;
  uploaded_by: string;
  uploaded_at: string;
  meta_data: {
    file_size: number;
    content_type: string;
    file_extension: string;
    original_filename: string;
  };
}

export interface Comment {
  id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  comment: string;
  incident_id: string;
  parent_comment_id: string | null;
  author_id: string;
  created_by: string;
  author: User;
  creator: User;
}

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  code: string;
  incident_type_id: string | null;
  site_id: string;
  department_id: string | null;
  status: string;
  assigned_to: string | null;
  occurred_at: string | null;
  priority: number | null;
  reported_by: string | null;
  reported_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  due_by: string | null;
  meta_data: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  // Extended fields
  incident_type?: IncidentType;
  site?: Site;
  department?: Department;
  reporter?: User;
  assignee?: User | null;
  resolver?: User | null;
  closer?: User | null;
  creator?: User;
  comments?: Comment[];
  attachments?: Attachment[];
}

export interface CreateIncidentRequest {
  title: string;
  description?: string;
  severity: string;
  incident_type_id?: string;
  site_id: string;
  department_id?: string;
  occurred_at?: string;
  priority?: number;
  meta_data?: Record<string, unknown>;
}

export interface UpdateIncidentRequest {
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  assigned_to?: string;
  priority?: number;
  meta_data?: Record<string, unknown>;
}

export interface CreateCommentRequest {
  comment: string;
  parent_comment_id?: string;
}

export interface IncidentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  severity?: string | string[];
  status?: string | string[];
  assigned_to?: string | string[];
  site_id?: string | string[];
  department_id?: string | string[];
  incident_type_id?: string | string[];
  occurred_at_start?: string;
  occurred_at_end?: string;
  due_by_start?: string;
  due_by_end?: string;
}
