/**
 * Types for the Vehicles module's vehicle-registration registry.
 *
 * Mirrors `app/api/endpoints/vehicle_registrations.py` and
 * `app/schemas/vehicle_registration.py` on the backend. Response bodies on
 * that endpoint are hand-built dicts (no `response_model`), so these types
 * are shaped directly off the `_vehicle_to_dict` / `_alpr_to_dict` /
 * `_violation_to_dict` / `_paginated` helpers rather than Pydantic schemas.
 */

export type VehicleListStatus = "none" | "whitelist" | "blacklist";

export interface VehicleOwner {
  id: string;
  name: string | null;
  employee_id: string | null;
  type: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
}

export interface Vehicle {
  id: string;
  license_plate: string;
  site_id: string | null;
  vehicle_type: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_year: number | null;
  mulkia_image_url: string | null;
  registration_date: string | null;
  expiry_date: string | null;
  registration_status: string;
  is_active: boolean;
  is_expired: boolean;
  list_status: VehicleListStatus;
  list_status_reason: string | null;
  list_status_updated_by: string | null;
  list_status_updated_at: string | null;
  owner: VehicleOwner | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Row shape returned by GET /vehicle-registrations — adds the violation count enrichment. */
export interface VehicleListItem extends Vehicle {
  total_violations: number;
}

/** Vehicle placeholder returned by the history endpoint when the plate isn't registered. */
export interface UnregisteredVehicle {
  license_plate: string;
  registration_status: "Not Registered";
  is_registered: false;
}

export interface VehiclePaginationMetadata {
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** The endpoint's bespoke `{ metadata, data }` envelope (distinct from the shared `PaginatedResponse` in base/http.ts). */
export interface VehiclePaginatedResponse<T> {
  metadata: VehiclePaginationMetadata;
  data: T[];
}

export interface VehicleListParams {
  page?: number;
  page_size?: number;
  license_plate?: string;
  owner_name?: string;
  employee_id?: string;
  department?: string;
  owner_type?: string;
  list_status?: VehicleListStatus;
  registration_status?: string;
  vehicle_type?: string;
  is_active?: boolean;
  expiry_start?: string;
  expiry_end?: string;
  strict_search?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface VehicleSearchParams {
  q: string;
  limit?: number;
  fuzzy?: boolean;
}

export interface VehicleSearchResponse {
  query: string;
  fuzzy: boolean;
  count: number;
  data: Vehicle[];
}

export interface VehicleOwnerInput {
  name?: string | null;
  employee_id?: string | null;
  contractor_id?: string | null;
  type?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface VehicleInfoInput {
  type?: string | null;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  year?: number | null;
  mulkia_image_url?: string | null;
}

export interface VehicleRegistrationInput {
  expiry_date?: string | null;
}

export interface CreateVehicleRegistrationRequest {
  license_plate?: string | null;
  site_id?: string | null;
  owner: VehicleOwnerInput;
  vehicle_info?: VehicleInfoInput | null;
  registration?: VehicleRegistrationInput | null;
}

/** POST /vehicle-registrations/ returns either a person-only or a vehicle+person creation result. */
export interface CreateVehicleRegistrationResponse {
  id: string;
  license_plate?: string;
  message: string;
}

export interface UpdateVehicleRegistrationRequest {
  license_plate?: string | null;
  site_id?: string | null;
  owner?: VehicleOwnerInput | null;
  vehicle_info?: VehicleInfoInput | null;
  registration?: VehicleRegistrationInput | null;
  registration_status?: string | null;
  is_active?: boolean | null;
}

export interface VehicleListStatusResponse {
  license_plate: string;
  list_status: VehicleListStatus;
  message: string;
}

export interface VehicleViolationRow {
  id: string;
  license_plate: string;
  timestamp: string | null;
  avg_speed: number | null;
  max_speed: number | null;
  speed_limit: number | null;
  camera_name: string | null;
}

/** Lean ANPR row for the vehicle-history view — leaner than the `alpr` module's detection shape (see `_alpr_to_dict`). */
export interface VehicleAnprRow {
  id: string;
  license_plate: string;
  vehicle_type: string | null;
  direction: string | null;
  confidence: number | null;
  timestamp: string | null;
  entry_time: string | null;
  exit_time: string | null;
  image_url: string | null;
  plate_image_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  camera_name: string | null;
  site_id: string | null;
  site_name: string | null;
  job_id: string | null;
  job_name: string | null;
  created_at: string | null;
}

export interface VehicleHistoryParams {
  violations_page?: number;
  violations_page_size?: number;
  anpr_page?: number;
  anpr_page_size?: number;
  start_date?: string;
  end_date?: string;
  include_anpr?: boolean;
}

export interface VehicleHistorySummary {
  total_violations: number;
  total_anpr_detections: number | null;
  is_registered: boolean;
  owner_name: string | null;
  owner_company: string | null;
  max_speed: number | null;
  last_seen: string | null;
  vehicle_status: string;
  registration_status: string;
}

export interface VehicleHistoryResponse {
  vehicle: Vehicle | UnregisteredVehicle;
  owner: VehicleOwner | null;
  violations: VehiclePaginatedResponse<VehicleViolationRow>;
  anpr_detections: VehiclePaginatedResponse<VehicleAnprRow> | null;
  summary: VehicleHistorySummary;
}

export interface BulkImportRowError {
  row: number;
  error: string;
}

export interface BulkImportVehiclesResponse {
  total_processed: number;
  successful_imports: number;
  failed_imports: number;
  errors: BulkImportRowError[];
}
