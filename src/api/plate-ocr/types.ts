export type PlateOcrSource = "gate_alpr" | "speed_violation";

export type PlateOcrReviewAction =
  | "accept_edge"
  | "accept_gemini"
  | "correct"
  | "exclude";

export interface PlateOcrSample {
  id: string;
  source_type: PlateOcrSource;
  source_event_id: string;
  source_record_id: string;
  captured_at: string;
  direction: string | null;
  raw_text: string | null;
  normalized_text: string | null;
  ocr_confidence: number | null;
  detector_confidence: number | null;
  plate_image_url: string | null;
  context_image_url: string | null;
  plate_bbox: unknown;
  detector_model: string | null;
  ocr_model_version: string | null;
  ocr_model_sha256: string | null;
  ocr_config: string | null;
  verification_status: string;
  gemini_text: string | null;
  gemini_normalized_text: string | null;
  gemini_confidence: number | null;
  gemini_plate_visible: boolean | null;
  gemini_model: string | null;
  gemini_response: Record<string, unknown> | null;
  verification_is_match: boolean | null;
  verification_edit_distance: number | null;
  verification_attempts: number;
  verification_error: string | null;
  verification_started_at: string | null;
  verification_completed_at: string | null;
  review_status: string;
  reviewed_text: string | null;
  reviewed_normalized_text: string | null;
  review_notes: string | null;
  training_eligible: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  org_id: string;
  site_id: string | null;
  camera_id: string | null;
  camera_name: string | null;
  device_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PlateOcrSamplePage {
  data: PlateOcrSample[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PlateOcrSummary {
  total: number;
  verification_statuses: Record<string, number>;
  review_statuses: Record<string, number>;
  training_eligible: number;
}

export interface PlateOcrListParams {
  page?: number;
  page_size?: number;
  source_type?: PlateOcrSource;
  verification_status?: string;
  review_status?: string;
  training_eligible?: boolean;
  search?: string;
  has_plate_image?: boolean;
}

export interface PlateOcrReviewRequest {
  action: PlateOcrReviewAction;
  corrected_text?: string;
  notes?: string;
}

export interface PlateOcrTrainingRun {
  id: string;
  name: string;
  status: string;
  sample_count: number;
  train_count: number;
  validation_count: number;
  epochs: number;
  batch_size: number;
  seed: number;
  base_model_version: string | null;
  dataset_manifest_uri: string;
  output_uri: string;
  vertex_job_name: string | null;
  candidate_model_uri: string | null;
  candidate_model_sha256: string | null;
  plate_config_uri: string | null;
  metrics: Record<string, unknown> | null;
  evaluation_passed: boolean | null;
  error: string | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  promoted_by: string | null;
  promoted_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PlateOcrTrainingRunPage {
  data: PlateOcrTrainingRun[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PlateOcrTrainingRunCreate {
  name?: string;
  epochs?: number;
  batch_size?: number;
  seed?: number;
}

export interface PlateOcrVerificationMetrics {
  attempt_count: number;
  request_count: number;
  completed_count: number;
  success_count: number;
  failure_count: number;
  status_counts: Record<string, number>;
  prompt_token_count: number;
  candidate_token_count: number;
  thoughts_token_count: number;
  cached_content_token_count: number;
  total_token_count: number;
  estimated_cost_usd: number;
  average_latency_ms: number | null;
  max_latency_ms: number | null;
}

export interface PlateOcrVerificationSummary extends PlateOcrVerificationMetrics {
  pending_sample_count: number;
  enabled: boolean;
  model: string;
  input_price_per_million_usd: number;
  output_price_per_million_usd: number;
  thinking_price_per_million_usd: number;
  thinking_level: string;
  max_samples_per_run: number;
  billing_labels: Record<string, string>;
}

export interface PlateOcrVerificationRun {
  id: string;
  name: string;
  status: string;
  requested_count: number;
  selected_count: number;
  sort_order: string;
  model: string;
  input_price_per_million_usd: number;
  output_price_per_million_usd: number;
  thinking_price_per_million_usd: number;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  metrics: PlateOcrVerificationMetrics;
}

export interface PlateOcrVerificationRunPage {
  data: PlateOcrVerificationRun[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PlateOcrVerificationRunCreate {
  name?: string;
  sample_count: number;
}
