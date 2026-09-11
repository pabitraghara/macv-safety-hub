import { createEventSource } from "@/lib/api";
import { request } from "../base/http";
import type {
  AlprAnalyticsParams,
  AlprAnalyticsSummary,
  AlprDetection,
  AlprExportParams,
  AlprFilterOptions,
  AlprHeatmap,
  AlprListParams,
  AlprListResponse,
  CsvImportOptions,
  CsvImportResult,
  UpdateAlprDetectionRequest,
} from "./types";

export class AlprApi {
  async getDetections(params: AlprListParams = {}): Promise<AlprListResponse> {
    return request<AlprListResponse>("GET", "/api/v1/alpr/", undefined, {
      params: params as Record<string, unknown>,
    });
  }

  async getDetection(detectionId: string): Promise<AlprDetection> {
    return request<AlprDetection>("GET", `/api/v1/alpr/${detectionId}`);
  }

  async updateDetection(
    detectionId: string,
    data: UpdateAlprDetectionRequest,
  ): Promise<AlprDetection> {
    return request<AlprDetection>("PUT", `/api/v1/alpr/${detectionId}`, data);
  }

  async getAnalyticsSummary(
    params: AlprAnalyticsParams = {},
  ): Promise<AlprAnalyticsSummary> {
    return request<AlprAnalyticsSummary>(
      "GET",
      "/api/v1/alpr/analytics/summary",
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  async getHeatmap(params: AlprAnalyticsParams = {}): Promise<AlprHeatmap> {
    return request<AlprHeatmap>(
      "GET",
      "/api/v1/alpr/analytics/heatmap",
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  async getFilterOptions(
    params: Pick<AlprAnalyticsParams, "start_date" | "end_date"> = {},
  ): Promise<AlprFilterOptions> {
    return request<AlprFilterOptions>(
      "GET",
      "/api/v1/alpr/analytics/filter-options",
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  async exportOverview(params: AlprExportParams = {}): Promise<Blob> {
    return request<Blob>("GET", "/api/v1/alpr/export/overview", undefined, {
      params: params as Record<string, unknown>,
      responseType: "blob",
    });
  }

  async exportEntry(params: AlprExportParams = {}): Promise<Blob> {
    return request<Blob>("GET", "/api/v1/alpr/export/entry", undefined, {
      params: params as Record<string, unknown>,
      responseType: "blob",
    });
  }

  async exportExit(params: AlprExportParams = {}): Promise<Blob> {
    return request<Blob>("GET", "/api/v1/alpr/export/exit", undefined, {
      params: params as Record<string, unknown>,
      responseType: "blob",
    });
  }

  async exportPdf(params: AlprExportParams = {}): Promise<Blob> {
    return request<Blob>("GET", "/api/v1/alpr/export/pdf", undefined, {
      params: params as Record<string, unknown>,
      responseType: "blob",
    });
  }

  async importCsv(
    file: File,
    options: CsvImportOptions,
  ): Promise<CsvImportResult> {
    const formData = new FormData();
    formData.append("file", file);
    return request<CsvImportResult>(
      "POST",
      "/api/v1/alpr/import/csv",
      formData,
      { params: options as unknown as Record<string, unknown> },
    );
  }
}

export const alprApi = new AlprApi();

/**
 * Open an authenticated SSE connection to the live ALPR detection stream.
 * See `createEventSource` in `@/lib/api` — the token is passed as a `?token=`
 * query param since EventSource cannot send headers.
 */
export async function createAlprEventSource(): Promise<EventSource> {
  return createEventSource("/api/v1/alpr/events/stream");
}
