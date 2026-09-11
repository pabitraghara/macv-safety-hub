export type VideoUploadStatus =
  | "pending"
  | "uploaded"
  | "processing"
  | "completed"
  | "failed";

export const ALLOWED_VIDEO_CONTENT_TYPES = [
  "video/mp4",
  "video/avi",
  "video/x-msvideo",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
] as const;

export type AllowedVideoContentType =
  (typeof ALLOWED_VIDEO_CONTENT_TYPES)[number];

export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

export interface PresignRequest {
  filename: string;
  content_type: AllowedVideoContentType | string;
  file_size_bytes: number;
  site_id: string;
}

export interface PresignResponse {
  upload_url: string;
  blob_path: string;
  upload_id: string;
  expires_at: string;
}

export interface VideoUploadCreateRequest {
  name?: string | null;
  site_id: string;
  blob_path?: string;
  source_url?: string;
  footage_timestamp?: string | null;
  use_case_ids?: string[];
  regulatory_standards?: string[];
  user_prompt?: string | null;
  model_name?: string;
}

export interface VideoUploadResponse {
  id: string;
  code: string;
  name: string | null;
  site_id: string;
  uploaded_by: string;
  video_url: string | null;
  blob_path: string | null;
  source_url: string | null;
  footage_timestamp: string | null;
  status: VideoUploadStatus;
  use_case_ids: string[];
  regulatory_standards: string[];
  user_prompt: string | null;
  model_name: string | null;
  vlm_job_id: string | null;
  error_message: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface VideoUploadObservation {
  id: string;
  code: string;
  site_id: string;
  timestamp: string | null;
  severity: string;
  review_status: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  source_video_upload_id: string | null;
}

export interface VideoUploadDetailResponse extends VideoUploadResponse {
  observation_count: number;
  observations: VideoUploadObservation[];
}

export interface VideoUploadListParams {
  site_id?: string;
  status?: VideoUploadStatus;
  page?: number;
  page_size?: number;
}
