/**
 * Types for the Vehicles module's people (employee/contractor) registry.
 *
 * Mirrors `app/schemas/person.py` and `app/api/endpoints/people.py` on the
 * backend. List/search use the shared `PaginatedResponse` envelope from
 * `base/http.ts` (`items` / `pagination`), NOT the vehicle-registrations
 * module's bespoke `{ metadata, data }` shape — the two modules diverge here.
 */

import type { PaginatedResponse } from "../base/http";

export interface Person {
  id: string;
  org_id: string;
  name: string;
  employee_id: string | null;
  type: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  vehicle_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

/** Minimal vehicle-registration shape nested under a person (see PersonVehicleSummary on the backend). */
export interface PersonVehicleSummary {
  id: string;
  license_plate: string;
  vehicle_type: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_year: number | null;
  registration_status: string;
  list_status: string;
  expiry_date: string | null;
  is_active: boolean;
}

export interface PersonWithVehicles extends Person {
  vehicles: PersonVehicleSummary[];
}

/** Response body for GET /people/{id}/vehicles. */
export interface PersonVehiclesResponse {
  person: Person;
  count: number;
  data: PersonVehicleSummary[];
}

export type PersonListResponse = PaginatedResponse<Person>;

/** Response body for GET /people/search — query/count/data, not page-based. */
export interface PersonSearchResponse {
  query: string;
  count: number;
  data: Person[];
}

export interface PersonListParams {
  page?: number;
  page_size?: number;
  name?: string;
  employee_id?: string;
  type?: string;
  department?: string;
  is_active?: boolean;
  strict_search?: boolean;
  sort_field?: string;
  sort_direction?: 1 | -1;
}

export interface PersonSearchParams {
  q: string;
  limit?: number;
  strict_search?: boolean;
}

export interface CreatePersonRequest {
  name: string;
  employee_id?: string | null;
  type?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface UpdatePersonRequest {
  name?: string;
  employee_id?: string | null;
  type?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
}
