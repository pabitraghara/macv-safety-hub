/**
 * Types for the ALPR (Automatic License Plate Recognition) domain.
 *
 * Mirrors the flat detection row built by `serialize_detection()` in
 * `app/api/endpoints/alpr.py` plus the request/response shapes of the
 * surrounding endpoints. See app/schemas/alpr.py and app/crud/alpr.py for the
 * backend source of truth.
 */

export interface VehicleOwner {
  name: string | null;
  employee_id: string | null;
  type: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
}

export interface VehicleInfo {
  type: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  year: number | null;
}

/**
 * Canonical ALPR detection row.
 * Returned by GET /alpr/ (data[]), GET /alpr/{id}, PUT /alpr/{id}, and SSE
 * /alpr/events/stream. Timestamps are tz-aware UTC ISO strings. The entry_
 * and exit_ fields are null when that event does not exist on the detection.
 */
export interface AlprDetection {
  id: string;
  license_plate: string | null;
  vehicle_type: string | null;
  direction: string | null;

  timestamp: string | null;
  entry_time: string | null;
  exit_time: string | null;

  entry_plate_number: string | null;
  entry_confidence: number | null;
  entry_vehicle_type: string | null;
  entry_stream_name: string | null;
  entry_plate_image_url: string | null;
  entry_vehicle_image_url: string | null;

  exit_plate_number: string | null;
  exit_confidence: number | null;
  exit_vehicle_type: string | null;
  exit_stream_name: string | null;
  exit_plate_image_url: string | null;
  exit_vehicle_image_url: string | null;

  site_id: string | null;
  site_name: string | null;
  job_id: string | null;
  job_name: string | null;

  owner: VehicleOwner | null;
  vehicle_info: VehicleInfo | null;
  registration_status: string | null;
  is_registered: boolean;

  created_at: string;
}

/** Sortable columns accepted by GET /alpr/ (sort_by). */
export type AlprSortField =
  | "timestamp"
  | "entry_time"
  | "exit_time"
  | "license_plate"
  | "created_at";

export interface AlprListParams {
  page?: number;
  page_size?: number;
  search?: string;
  name?: string;
  direction?: string;
  start_date?: string;
  end_date?: string;
  site_id?: string;
  camera_id?: string;
  sort_by?: AlprSortField;
  sort_order?: "asc" | "desc";
}

/** Per-direction employee/contractor/other breakdown from the list endpoint. */
export interface AlprDirectionStats {
  total: number;
  employees: number;
  contractors: number;
  others: number;
}

export interface AlprListResponse {
  metadata: {
    total_count: number;
    page: number;
    page_size: number;
  };
  aggregated_data: {
    entry: AlprDirectionStats;
    exit: AlprDirectionStats;
  };
  data: AlprDetection[];
}

/** Partial update body for PUT /alpr/{id} (exclude_unset on the backend). */
export interface UpdateAlprDetectionRequest {
  license_plate?: string;
  direction?: string;
  vehicle_type?: string;
  is_plate_verified?: boolean;
  entry_time?: string;
  exit_time?: string;
  confidence?: number;
}

export interface AlprAnalyticsParams {
  start_date?: string;
  end_date?: string;
  license_plate?: string;
  timezone?: string;
}

export interface AlprAnalyticsSummary {
  total_vehicles: number;
  total_entries: number;
  total_exits: number;
  employee_breakdown: {
    employees: number;
    contractors: number;
    unknown: number;
  };
}

export interface AlprHeatmap {
  /** Keyed by formatted hour label, e.g. "1:00 AM" — 24 entries. */
  hourly_breakdown: Record<string, number>;
  peak_hour: string | null;
}

/** Distinct filter values for the current org (optionally date-scoped). */
export interface AlprFilterOptions {
  directions: string[];
  vehicle_types: string[];
  cameras: string[];
}

export interface AlprExportParams {
  start_date?: string;
  end_date?: string;
  timezone?: string;
}

export interface CsvImportResult {
  total_processed: number;
  entries_created: number;
  exits_updated: number;
  failed_imports: number;
  errors: unknown[];
}

export interface CsvImportOptions {
  site_id: string;
  job_id: string;
}
