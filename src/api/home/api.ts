import { request, type PaginatedResponse } from "../base/http";
import {
  Observation,
  CreateObservationRequest,
  TriageObservationRequest,
  ObservationListParams,
  ViolationType,
  Violation,
  AddViolationRequest,
  UpdateObservationRequest,
  ObservationValidation,
  CreateValidationRequest,
  ValidationQueueNextResponse,
  ExportValidationsParams,
} from "../observations/types";
import type { ObservationsHomePageResponse } from "./types";

export class ObservationsApiHomePage {
  async getObservationsHomePage(
    params: ObservationListParams = {},
  ): Promise<Observation[] | ObservationsHomePageResponse> {
    return request<Observation[] | ObservationsHomePageResponse>(
      "GET",
      "/api/v1/observations/",
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  async getObservationByCode(code: string): Promise<Observation> {
    return request<Observation>(
      "GET",
      `/api/v1/observations/${code}`,
      undefined,
      {
        params: { expand: "true" },
      },
    );
  }

  async createObservation(
    data: CreateObservationRequest,
  ): Promise<Observation> {
    return request<Observation>("POST", "/api/v1/observations/", data);
  }

  async deleteObservation(code: string): Promise<void> {
    return request<void>("DELETE", `/api/v1/observations/${code}`);
  }

  async updateObservation(
    code: string,
    data: UpdateObservationRequest,
  ): Promise<Observation> {
    return request<Observation>("PATCH", `/api/v1/observations/${code}`, data);
  }

  async triageObservation(
    code: string,
    data: TriageObservationRequest,
  ): Promise<Observation> {
    return request<Observation>(
      "PUT",
      `/api/v1/observations/${code}/triage`,
      data,
    );
  }

  async getViolationTypes(): Promise<ViolationType[]> {
    return request<ViolationType[]>(
      "GET",
      "/api/v1/observations/violation-types",
    );
  }

  async addViolation(
    code: string,
    data: AddViolationRequest,
  ): Promise<Violation> {
    return request<Violation>(
      "POST",
      `/api/v1/observations/${code}/violations`,
      data,
    );
  }

  async removeViolation(code: string, violationId: string): Promise<void> {
    return request<void>(
      "DELETE",
      `/api/v1/observations/${code}/violations/${violationId}`,
    );
  }

  async getValidationQueue(params?: {
    site_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Observation>> {
    return request<PaginatedResponse<Observation>>(
      "GET",
      "/api/v1/observations/validate/queue",
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  async getValidationQueueNext(params?: {
    site_id?: string;
    skip?: number;
  }): Promise<ValidationQueueNextResponse | null> {
    return request<ValidationQueueNextResponse | null>(
      "GET",
      "/api/v1/observations/validate/queue/next",
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  async submitValidation(
    code: string,
    data: CreateValidationRequest,
  ): Promise<ObservationValidation> {
    return request<ObservationValidation>(
      "POST",
      `/api/v1/observations/${code}/validations`,
      data,
    );
  }

  async exportValidations(params?: ExportValidationsParams): Promise<Blob> {
    return request<Blob>(
      "GET",
      "/api/v1/observations/validate/export",
      undefined,
      { params: params as Record<string, unknown>, responseType: "blob" },
    );
  }
}

export const observationsApiHomePage = new ObservationsApiHomePage();
