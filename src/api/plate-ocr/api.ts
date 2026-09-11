import { request } from "@/api/base/http";
import type {
  PlateOcrListParams,
  PlateOcrReviewRequest,
  PlateOcrSample,
  PlateOcrSamplePage,
  PlateOcrSummary,
  PlateOcrTrainingRun,
  PlateOcrTrainingRunCreate,
  PlateOcrTrainingRunPage,
  PlateOcrVerificationRun,
  PlateOcrVerificationRunCreate,
  PlateOcrVerificationRunPage,
  PlateOcrVerificationSummary,
} from "./types";

export class PlateOcrApi {
  list(params: PlateOcrListParams = {}): Promise<PlateOcrSamplePage> {
    return request<PlateOcrSamplePage>(
      "GET",
      "/api/v1/plate-ocr-samples/",
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  summary(): Promise<PlateOcrSummary> {
    return request<PlateOcrSummary>("GET", "/api/v1/plate-ocr-samples/summary");
  }

  review(
    sampleId: string,
    data: PlateOcrReviewRequest,
  ): Promise<PlateOcrSample> {
    return request<PlateOcrSample>(
      "PUT",
      `/api/v1/plate-ocr-samples/${sampleId}/review`,
      data,
    );
  }

  requeue(sampleId: string): Promise<PlateOcrSample> {
    return request<PlateOcrSample>(
      "POST",
      `/api/v1/plate-ocr-samples/${sampleId}/requeue`,
    );
  }

  listTrainingRuns(page = 1, pageSize = 5): Promise<PlateOcrTrainingRunPage> {
    return request<PlateOcrTrainingRunPage>(
      "GET",
      "/api/v1/plate-ocr-training/runs",
      undefined,
      { params: { page, page_size: pageSize } },
    );
  }

  createTrainingRun(
    data: PlateOcrTrainingRunCreate = {},
  ): Promise<PlateOcrTrainingRun> {
    return request<PlateOcrTrainingRun>(
      "POST",
      "/api/v1/plate-ocr-training/runs",
      data,
    );
  }

  promoteTrainingRun(runId: string): Promise<PlateOcrTrainingRun> {
    return request<PlateOcrTrainingRun>(
      "POST",
      `/api/v1/plate-ocr-training/runs/${runId}/promote`,
    );
  }

  verificationSummary(): Promise<PlateOcrVerificationSummary> {
    return request<PlateOcrVerificationSummary>(
      "GET",
      "/api/v1/plate-ocr-verification/summary",
    );
  }

  listVerificationRuns(
    page = 1,
    pageSize = 5,
  ): Promise<PlateOcrVerificationRunPage> {
    return request<PlateOcrVerificationRunPage>(
      "GET",
      "/api/v1/plate-ocr-verification/runs",
      undefined,
      { params: { page, page_size: pageSize } },
    );
  }

  createVerificationRun(
    data: PlateOcrVerificationRunCreate,
  ): Promise<PlateOcrVerificationRun> {
    return request<PlateOcrVerificationRun>(
      "POST",
      "/api/v1/plate-ocr-verification/runs",
      data,
    );
  }

  cancelVerificationRun(runId: string): Promise<PlateOcrVerificationRun> {
    return request<PlateOcrVerificationRun>(
      "POST",
      `/api/v1/plate-ocr-verification/runs/${runId}/cancel`,
    );
  }
}

export const plateOcrApi = new PlateOcrApi();
