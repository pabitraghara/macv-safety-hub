import { request } from "../base/http";
import type {
  Camera,
  CameraWithRelations,
  CameraSnapshotRequest,
  CameraStatistics,
  CameraListParams,
  CreateCameraRequest,
  UpdateCameraRequest,
} from "./types";

export class CamerasApi {
  async getCameras(params: CameraListParams = {}): Promise<Camera[]> {
    return request<Camera[]>("GET", "/api/v1/cameras", undefined, {
      params: params as Record<string, unknown>,
    });
  }

  async getCamera(cameraId: string): Promise<CameraWithRelations> {
    return request<CameraWithRelations>("GET", `/api/v1/cameras/${cameraId}`);
  }

  async getStatistics(): Promise<CameraStatistics> {
    return request<CameraStatistics>("GET", "/api/v1/cameras/statistics");
  }

  async createCamera(data: CreateCameraRequest): Promise<Camera> {
    return request<Camera>("POST", "/api/v1/cameras", data);
  }

  async updateCamera(
    cameraId: string,
    data: UpdateCameraRequest,
  ): Promise<Camera> {
    return request<Camera>("PUT", `/api/v1/cameras/${cameraId}`, data);
  }

  async deleteCamera(cameraId: string): Promise<{ message: string }> {
    return request<{ message: string }>(
      "DELETE",
      `/api/v1/cameras/${cameraId}`,
    );
  }

  /**
   * Ask the edge pipeline for a fresh frame (calibration editor). Returns
   * the pending request; the edge picks it up on its ~15s poll. Poll
   * getSnapshot() for the result.
   */
  async requestSnapshot(cameraId: string): Promise<CameraSnapshotRequest> {
    return request<CameraSnapshotRequest>(
      "POST",
      `/api/v1/cameras/${cameraId}/snapshot-request`,
    );
  }

  /**
   * Latest snapshot request for the camera (any status). 404s when no
   * snapshot has ever been requested.
   */
  async getSnapshot(cameraId: string): Promise<CameraSnapshotRequest> {
    return request<CameraSnapshotRequest>(
      "GET",
      `/api/v1/cameras/${cameraId}/snapshot`,
    );
  }
}

export const camerasApi = new CamerasApi();
