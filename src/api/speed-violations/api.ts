import api, { createEventSource } from "@/lib/api";
import { request } from "../base/http";
import type {
  SpeedViolation,
  SpeedViolationDetail,
  SpeedViolationDetailParams,
  SpeedViolationListParams,
  SpeedViolationListResponse,
  SpeedViolationSummary,
  SpeedViolationSummaryParams,
  UpdateSpeedViolationRequest,
} from "./types";

export class SpeedViolationsApi {
  async getViolations(
    params: SpeedViolationListParams = {},
  ): Promise<SpeedViolationListResponse> {
    return request<SpeedViolationListResponse>(
      "GET",
      "/api/v1/speed-violations/",
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  async getViolation(
    violationId: string,
    params: SpeedViolationDetailParams = {},
  ): Promise<SpeedViolationDetail> {
    return request<SpeedViolationDetail>(
      "GET",
      `/api/v1/speed-violations/${violationId}`,
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  async updateViolation(
    violationId: string,
    data: UpdateSpeedViolationRequest,
  ): Promise<SpeedViolation> {
    return request<SpeedViolation>(
      "PUT",
      `/api/v1/speed-violations/${violationId}`,
      data,
    );
  }

  async deleteViolation(violationId: string): Promise<void> {
    return request<void>("DELETE", `/api/v1/speed-violations/${violationId}`);
  }

  /** JSON summary for a date range (GET .../violations/summary). */
  async getSummary(
    params: SpeedViolationSummaryParams,
  ): Promise<SpeedViolationSummary> {
    return request<SpeedViolationSummary>(
      "GET",
      "/api/v1/speed-violations/violations/summary",
      undefined,
      { params: params as unknown as Record<string, unknown> },
    );
  }

  /**
   * Same endpoint as getSummary(), but sends `Accept: application/pdf` so the
   * backend returns the rendered PDF report as a blob. Uses the raw axios
   * instance directly (rather than the `request()` helper) because this is
   * the one call in this module that needs a custom request header.
   */
  async getSummaryPdf(params: SpeedViolationSummaryParams): Promise<Blob> {
    const res = await api.get<Blob>(
      "/api/v1/speed-violations/violations/summary",
      {
        params,
        responseType: "blob",
        headers: { Accept: "application/pdf" },
      },
    );
    return res.data;
  }
}

export const speedViolationsApi = new SpeedViolationsApi();

/**
 * Open an authenticated SSE connection to the live speed-violations stream.
 * See `createEventSource` in `@/lib/api` — the token is passed as a `?token=`
 * query param since EventSource cannot send headers.
 */
export async function createSpeedViolationEventSource(): Promise<EventSource> {
  return createEventSource("/api/v1/speed-violations/stream");
}
