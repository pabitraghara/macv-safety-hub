import { request, type PaginatedResponse } from "../base/http";
import type {
  PresignRequest,
  PresignResponse,
  VideoUploadCreateRequest,
  VideoUploadDetailResponse,
  VideoUploadListParams,
  VideoUploadResponse,
} from "./types";

export class VideoUploadsApi {
  async presign(data: PresignRequest): Promise<PresignResponse> {
    return request<PresignResponse>(
      "POST",
      "/api/v1/video-uploads/presign",
      data,
    );
  }

  async create(data: VideoUploadCreateRequest): Promise<VideoUploadResponse> {
    return request<VideoUploadResponse>("POST", "/api/v1/video-uploads", data);
  }

  async list(
    params: VideoUploadListParams = {},
  ): Promise<PaginatedResponse<VideoUploadResponse>> {
    return request<PaginatedResponse<VideoUploadResponse>>(
      "GET",
      "/api/v1/video-uploads",
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  async get(code: string): Promise<VideoUploadDetailResponse> {
    return request<VideoUploadDetailResponse>(
      "GET",
      `/api/v1/video-uploads/${code}`,
    );
  }

  async start(code: string): Promise<VideoUploadResponse> {
    return request<VideoUploadResponse>(
      "POST",
      `/api/v1/video-uploads/${code}/start`,
    );
  }

  async retry(code: string): Promise<VideoUploadResponse> {
    return request<VideoUploadResponse>(
      "POST",
      `/api/v1/video-uploads/${code}/retry`,
    );
  }

  async delete(code: string): Promise<void> {
    await request<void>("DELETE", `/api/v1/video-uploads/${code}`);
  }
}

export const videoUploadsApi = new VideoUploadsApi();

/**
 * Direct PUT to Google Cloud Storage using the signed URL from presign().
 * Bypasses the platform API client — this hits GCS directly, not our backend.
 *
 * The Content-Type header MUST match what presign() was called with — it is
 * bound into the URL signature and GCS rejects a mismatch.
 */
export async function uploadToStorage(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  if (onProgress && typeof XMLHttpRequest !== "undefined") {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded, e.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else
          reject(
            new Error(
              `Storage upload failed: HTTP ${xhr.status} ${xhr.statusText}`,
            ),
          );
      };
      xhr.onerror = () =>
        reject(new Error("Network error during storage upload"));
      xhr.onabort = () => reject(new Error("Storage upload aborted"));
      xhr.send(file);
    });
    return;
  }

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: file,
  });

  if (!res.ok) {
    throw new Error(
      `Storage upload failed: HTTP ${res.status} ${res.statusText}`,
    );
  }
}
