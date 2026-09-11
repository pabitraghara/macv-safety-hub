import { request } from "../base/http";
import type {
  BulkImportVehiclesResponse,
  CreateVehicleRegistrationResponse,
  CreateVehicleRegistrationRequest,
  UpdateVehicleRegistrationRequest,
  Vehicle,
  VehicleHistoryParams,
  VehicleHistoryResponse,
  VehicleListParams,
  VehicleListStatusResponse,
  VehiclePaginatedResponse,
  VehicleListItem,
  VehicleSearchParams,
  VehicleSearchResponse,
} from "./types";

export class VehiclesApi {
  async getVehicles(
    params: VehicleListParams = {},
  ): Promise<VehiclePaginatedResponse<VehicleListItem>> {
    return request<VehiclePaginatedResponse<VehicleListItem>>(
      "GET",
      "/api/v1/vehicle-registrations/",
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  async searchVehicles(
    params: VehicleSearchParams,
  ): Promise<VehicleSearchResponse> {
    return request<VehicleSearchResponse>(
      "GET",
      "/api/v1/vehicle-registrations/search",
      undefined,
      { params: { ...params } },
    );
  }

  async getVehicleHistory(
    licensePlate: string,
    params: VehicleHistoryParams = {},
  ): Promise<VehicleHistoryResponse> {
    return request<VehicleHistoryResponse>(
      "GET",
      `/api/v1/vehicle-registrations/${licensePlate}/history`,
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  async getVehicleByPlate(licensePlate: string): Promise<Vehicle> {
    return request<Vehicle>(
      "GET",
      `/api/v1/vehicle-registrations/${licensePlate}`,
    );
  }

  async createVehicleRegistration(
    data: CreateVehicleRegistrationRequest,
  ): Promise<CreateVehicleRegistrationResponse> {
    return request<CreateVehicleRegistrationResponse>(
      "POST",
      "/api/v1/vehicle-registrations/",
      data,
    );
  }

  async updateVehicleRegistration(
    licensePlate: string,
    data: UpdateVehicleRegistrationRequest,
  ): Promise<Vehicle> {
    return request<Vehicle>(
      "PUT",
      `/api/v1/vehicle-registrations/${licensePlate}`,
      data,
    );
  }

  async deleteVehicleRegistration(licensePlate: string): Promise<void> {
    return request<void>(
      "DELETE",
      `/api/v1/vehicle-registrations/${licensePlate}`,
    );
  }

  async addToWhitelist(
    licensePlate: string,
    updatedBy: string,
    reason?: string,
  ): Promise<VehicleListStatusResponse> {
    return request<VehicleListStatusResponse>(
      "PUT",
      `/api/v1/vehicle-registrations/${licensePlate}/whitelist`,
      undefined,
      { params: { updated_by: updatedBy, reason } },
    );
  }

  async addToBlacklist(
    licensePlate: string,
    updatedBy: string,
    reason?: string,
  ): Promise<VehicleListStatusResponse> {
    return request<VehicleListStatusResponse>(
      "PUT",
      `/api/v1/vehicle-registrations/${licensePlate}/blacklist`,
      undefined,
      { params: { updated_by: updatedBy, reason } },
    );
  }

  async removeFromList(
    licensePlate: string,
    updatedBy: string,
  ): Promise<VehicleListStatusResponse> {
    return request<VehicleListStatusResponse>(
      "PUT",
      `/api/v1/vehicle-registrations/${licensePlate}/remove-from-list`,
      undefined,
      { params: { updated_by: updatedBy } },
    );
  }

  async getWhitelistedVehicles(
    page = 1,
    pageSize = 50,
  ): Promise<VehiclePaginatedResponse<Vehicle>> {
    return request<VehiclePaginatedResponse<Vehicle>>(
      "GET",
      "/api/v1/vehicle-registrations/lists/whitelisted/",
      undefined,
      { params: { page, page_size: pageSize } },
    );
  }

  async getBlacklistedVehicles(
    page = 1,
    pageSize = 50,
  ): Promise<VehiclePaginatedResponse<Vehicle>> {
    return request<VehiclePaginatedResponse<Vehicle>>(
      "GET",
      "/api/v1/vehicle-registrations/lists/blacklisted/",
      undefined,
      { params: { page, page_size: pageSize } },
    );
  }

  async bulkImportVehicles(file: File): Promise<BulkImportVehiclesResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return request<BulkImportVehiclesResponse>(
      "POST",
      "/api/v1/vehicle-registrations/bulk/import",
      formData,
    );
  }

  async downloadBulkImportTemplate(): Promise<Blob> {
    return request<Blob>(
      "GET",
      "/api/v1/vehicle-registrations/bulk/template",
      undefined,
      { responseType: "blob" },
    );
  }
}

export const vehiclesApi = new VehiclesApi();
