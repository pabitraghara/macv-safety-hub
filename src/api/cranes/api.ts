import { createEventSource } from "@/lib/api";
import { request } from "../base/http";
import type {
  Crane,
  CraneAlertListParams,
  CraneAlertListResponse,
  CraneInput,
  CraneLiveParams,
  CraneLiveResponse,
  CraneProximityAlert,
  CraneProximitySettings,
  CraneSettingsParams,
  UpdateCraneRequest,
  UpdateCraneSettingsRequest,
} from "./types";

/**
 * Dashboard client for the cranes module (scopes `crane:view` / `crane:manage`).
 *
 * Route order on the backend puts the literal paths before `/{crane_id}`, so
 * `/cranes/positions/live` and `/cranes/proximity-alerts` are siblings of the
 * crane detail route rather than nested under a crane.
 */
export class CranesApi {
  /** All cranes visible to the caller. Small collection — not paginated. */
  async getCranes(
    params: { site_id?: string; is_active?: boolean } = {},
  ): Promise<Crane[]> {
    return request<Crane[]>("GET", "/api/v1/cranes", undefined, {
      params: params as Record<string, unknown>,
    });
  }

  async createCrane(data: CraneInput): Promise<Crane> {
    return request<Crane>("POST", "/api/v1/cranes", data);
  }

  async updateCrane(craneId: string, data: UpdateCraneRequest): Promise<Crane> {
    return request<Crane>("PUT", `/api/v1/cranes/${craneId}`, data);
  }

  async deleteCrane(craneId: string): Promise<void> {
    return request<void>("DELETE", `/api/v1/cranes/${craneId}`);
  }

  /**
   * Latest fix per crane plus every pair distance, recomputed server-side with
   * the site's thresholds. Polled every few seconds by the live page.
   */
  async getLivePositions(
    params: CraneLiveParams = {},
  ): Promise<CraneLiveResponse> {
    return request<CraneLiveResponse>(
      "GET",
      "/api/v1/cranes/positions/live",
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  async getProximityAlerts(
    params: CraneAlertListParams = {},
  ): Promise<CraneAlertListResponse> {
    return request<CraneAlertListResponse>(
      "GET",
      "/api/v1/cranes/proximity-alerts",
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  /** Record that a human has seen the alert. Does not close it. */
  async acknowledgeAlert(alertId: string): Promise<CraneProximityAlert> {
    return request<CraneProximityAlert>(
      "POST",
      `/api/v1/cranes/proximity-alerts/${alertId}/ack`,
    );
  }

  /** Close the alert by hand (`resolution_reason: "manual"`). */
  async resolveAlert(alertId: string): Promise<CraneProximityAlert> {
    return request<CraneProximityAlert>(
      "POST",
      `/api/v1/cranes/proximity-alerts/${alertId}/resolve`,
    );
  }

  /**
   * Thresholds for a site. Omitting `site_id` reads the org-wide defaults;
   * the backend falls back to those when a site has no row of its own.
   */
  async getSettings(
    params: CraneSettingsParams = {},
  ): Promise<CraneProximitySettings> {
    return request<CraneProximitySettings>(
      "GET",
      "/api/v1/cranes/settings",
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  async updateSettings(
    data: UpdateCraneSettingsRequest,
    params: CraneSettingsParams = {},
  ): Promise<CraneProximitySettings> {
    return request<CraneProximitySettings>(
      "PUT",
      "/api/v1/cranes/settings",
      data,
      { params: params as Record<string, unknown> },
    );
  }
}

export const cranesApi = new CranesApi();

/**
 * Open an authenticated SSE connection to the proximity-alert stream.
 * See `createEventSource` in `@/lib/api` — the token rides in a `?token=`
 * query param because EventSource cannot send headers.
 */
export async function createCraneAlertEventSource(): Promise<EventSource> {
  return createEventSource("/api/v1/cranes/proximity-alerts/stream");
}
