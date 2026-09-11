/**
 * Types for the speed-violations domain.
 *
 * Mirrors the flat violation row built by `serialize_violation()` in
 * `app/api/endpoints/speed_violations.py` plus the request/response shapes of
 * the surrounding endpoints. See app/schemas/speed_violation.py and
 * app/crud/speed_violation.py for the backend source of truth.
 */

/** Owner enrichment attached to a violation row when include_vehicle_owner=true. */
export interface SpeedViolationOwner {
  name: string | null;
  employee_id: string | null;
  type: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  vehicle_type: string | null;
  is_expired: boolean;
  is_active: boolean;
  list_status: string | null;
}

/**
 * Canonical speed-violation row.
 * Returned by GET /speed-violations/ (data[]), GET /speed-violations/{id}
 * (.violation), PUT /speed-violations/{id}, and SSE /speed-violations/stream.
 * All media fields (`video_url`, `thumbnail_url`, `plate_image_url`) are
 * short-lived signed GCS URLs, usable directly as <video>/<img> src — do NOT
 * append query params (that invalidates the V4 signature).
 */
export interface SpeedViolation {
  id: string;
  alert_id: string | null;
  alert_group: string | null;
  alert_type: string | null;
  status: string;
  timestamp: string | null;
  site_id: string | null;
  site_name: string | null;
  job_id: string | null;
  job_name: string | null;
  /** Camera UUID (streams were consolidated into cameras, 2026-07-10). */
  camera_id: string | null;
  camera_name: string | null;
  license_plate: string | null;
  plate_confidence: number | null;
  plate_image_url: string | null;
  avg_speed: number | null;
  max_speed: number | null;
  speed_limit: number | null;
  object_class: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  monthly_violation_count: number;
  warning_level: string | null;
  owner: SpeedViolationOwner | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SpeedViolationListParams {
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
  /** Filter by camera UUID. */
  camera_id?: string;
  camera_name?: string;
  job_id?: string;
  site_id?: string;
  min_speed?: number;
  max_speed?: number;
  license_plate?: string;
  has_license_plate?: boolean;
  owner_name?: string;
  include_vehicle_owner?: boolean;
  timezone?: string;
}

export interface SpeedViolationListResponse {
  metadata: {
    total_count: number;
    page: number;
    page_size: number;
  };
  data: SpeedViolation[];
}

/** Flat ANPR-history row for a violation's license plate (GET /{id}). */
export interface AnprHistoryDetection {
  id: string;
  license_plate: string | null;
  confidence: number | null;
  vehicle_type: string | null;
  camera_name: string | null;
  timestamp: string | null;
  entry_time: string | null;
  exit_time: string | null;
  plate_image_url: string | null;
  vehicle_image_url: string | null;
  job_name: string | null;
  site_name: string | null;
}

export interface AnprHistoryResponse {
  metadata: {
    total_count: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
  data: AnprHistoryDetection[];
}

export interface SpeedViolationDetailParams {
  include_vehicle_owner?: boolean;
  include_anpr?: boolean;
  anpr_page?: number;
  anpr_page_size?: number;
  timezone?: string;
}

export interface SpeedViolationDetail {
  violation: SpeedViolation;
  anpr_detections: AnprHistoryResponse | null;
}

/** Editable fields for PUT /speed-violations/{id} (exclude_unset on the backend). */
export interface UpdateSpeedViolationRequest {
  license_plate?: string;
  avg_speed?: number;
  max_speed?: number;
  speed_limit?: number;
  alert_type?: string;
  camera_id?: string;
  camera_name?: string;
}

export interface SpeedViolationSummaryParams {
  start_date: string;
  end_date: string;
  license_plate?: string;
  limit?: number;
}

export interface SpeedViolationSummary {
  violation: SpeedViolation[];
  total_violations: number;
  average_violation_speed: number;
  top_vehicles: { numberplate: string | null; violation_count: number }[];
  top_locations: { location: string | null; violation_count: number }[];
  top_cameras: { camera_name: string | null; violation_count: number }[];
}
