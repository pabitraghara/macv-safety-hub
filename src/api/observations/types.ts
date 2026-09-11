export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  avatar_url: string | null;
  avatar_color?: string;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  timezone: string;
}

export interface ViolationType {
  id: string;
  code: string;
  name: string;
  category: string | null;
  description: string | null;
}

export interface Violation {
  id: string;
  observation_id: string;
  violation_type_id: string;
  description: string | null;
  confidence_score: number | null;
  meta_data: {
    source?: string;
    frame_number?: number;
    violation_type?: string;
    [key: string]: unknown;
  } | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  // Always included from API
  violation_type: ViolationType | null;
}

export type ObservationStatus =
  | "open"
  | "confirmed"
  | "false_positive"
  | "escalated";

export interface Observation {
  id: string;
  code: string;
  site_id: string;
  timestamp: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  description: string | null;
  severity: string;
  review_status: ObservationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  // Extended fields from expand=true
  site?: Site;
  reviewer?: User | null;
  violations?: Violation[];
}

export interface UpdateObservationRequest {
  severity?: string;
  description?: string;
}

export interface TriageObservationRequest {
  review_status: ObservationStatus;
  review_notes?: string;
}

export interface CreateObservationRequest {
  site_id: string;
  timestamp?: string;
  video_url?: string;
  thumbnail_url?: string;
  description?: string;
  severity: string;
  violations?: Array<{
    violation_type_id: string;
    confidence_score?: number;
    description?: string;
  }>;
}

export interface AddViolationRequest {
  violation_type_id: string;
  description?: string;
  confidence_score?: number;
}

export interface ObservationListParams {
  page?: number;
  page_size?: number;
  review_status?: ObservationStatus | ObservationStatus[];
  severity?: string | string[];
  site_id?: string | string[];
  violation_type_id?: string | string[];
  timestamp_start?: string;
  timestamp_end?: string;
}

export type ValidationDecision = "true_positive" | "false_positive";

export interface ObservationValidation {
  id: string;
  observation_id: string;
  validator_id: string;
  decision: ValidationDecision;
  confidence: number | null;
  notes: string | null;
  model_id: string | null;
  model_version: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface CreateValidationRequest {
  decision: ValidationDecision;
  confidence?: number;
  notes?: string;
  model_id?: string;
  model_version?: string;
}

export interface ValidationQueueNextResponse {
  observation: Observation;
  queue_position: number;
  queue_total: number;
}

export interface ObservationStats {
  total: number;
  open: number;
  escalated: number;
  critical: number;
  by_violation_type: { name: string; code: string; count: number }[];
  by_camera: { label: string; count: number }[];
  by_severity: { severity: string; count: number }[];
  daily_counts: {
    date: string;
    total: number;
    open: number;
    critical: number;
  }[];
}

export interface DailyViolationTypeEntry {
  date: string;
  violation_type_code: string;
  violation_type_name: string;
  count: number;
}

export interface ExportValidationsParams {
  format?: "json" | "csv";
  since?: string;
  decision?: ValidationDecision;
  site_id?: string;
}
