export type CameraStatus =
  | "Active"
  | "Inactive"
  | "Maintenance"
  | "Faulty"
  | "Offline";

/**
 * Edge-pipeline liveness as last reported by the on-prem speed pipeline via
 * POST /cameras/{id}/heartbeat. Deliberately separate from the
 * device-lifecycle `status`: it describes the ingest process on the edge
 * server, not the camera hardware.
 */
export type PipelineStatus = "running" | "reconnecting" | "down";

// ── Detection config (streams were consolidated into cameras, 2026-07-10) ──

export type DetectionType = "speed" | "alpr" | "face_recognition";

export const DETECTION_TYPES: DetectionType[] = [
  "speed",
  "alpr",
  "face_recognition",
];

export interface CalibrationPoint {
  x: number;
  y: number;
}

/** Speed-detection calibration (1:1 child of a camera). */
export interface CameraSpeedConfig {
  /** Exactly 4 image-plane points. */
  calibration_points: CalibrationPoint[];
  distance_m: number;
  speed_limit: number;
  speed_leniency: number;
  calibration_factor: number;
  min_transit_frames: number;
  max_unrealistic_speed: number;
}

export type AlprDirection = "entry" | "exit";

/**
 * ALPR detection + gate-relay config (1:1 child of a camera). Mirrors the
 * backend's CameraAlprConfigIn. Mutually exclusive with speed_config — a
 * camera runs one of the two modules.
 */
export interface CameraAlprConfig {
  /** Detection ROI: at least 3 image-plane points. */
  roi_polygon: CalibrationPoint[];
  /** Optional entry/exit crossing line: exactly 2 points, or null. */
  crossing_line: CalibrationPoint[] | null;
  direction: AlprDirection;
  min_ocr_confidence: number;
  dedup_ttl_seconds: number;
  relay_enabled: boolean;
  /** host/port/index are required by the backend when relay_enabled. */
  relay_host: string | null;
  relay_port: number | null;
  relay_index: number | null;
  relay_delay_ms: number | null;
  relay_username: string | null;
  relay_password: string | null;
}

export interface Camera {
  id: string;
  name: string;
  org_id: string | null;
  /** Optional — speed cameras register by RTSP URL alone. */
  ip_address: string | null;
  location: string | null;
  status: CameraStatus;
  model: string | null;
  manufacturer: string | null;
  resolution: string | null;
  firmware_version: string | null;
  mac_address: string | null;
  frame_rate: number | null;
  video_encoding: string | null;
  serial_number: string | null;
  /** Full connection URL — may embed camera credentials. */
  rtsp_url: string | null;
  http_url: string | null;
  port: number | null;
  site_id: string | null;
  zone: string | null;
  floor_level: string | null;
  installation_date: string | null;
  detection_types: string[] | null;
  thumbnail_url: string | null;
  speed_config: CameraSpeedConfig | null;
  alpr_config: CameraAlprConfig | null;
  /**
   * Per-edge-box assignment label: a box polling with ?node=<label> only
   * drives cameras whose pipeline_node matches. Blank = any box.
   */
  pipeline_node: string | null;
  /** Read-only — written only by the edge pipeline's heartbeat. */
  pipeline_status: PipelineStatus | null;
  /** Read-only — server (DB) clock timestamp of the last heartbeat. */
  pipeline_heartbeat_at: string | null;
  // Gate-relay health from the edge heartbeat (alpr cameras): true = last
  // fire/connect OK, false = failing, null = unknown / no relay.
  pipeline_relay_ok: boolean | null;
  /**
   * Read-only — signed GET URL of the newest completed calibration snapshot
   * (list thumbnail). Short-lived; use directly as <img> src, never append
   * query params.
   */
  snapshot_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CameraWithRelations extends Camera {
  site_name: string | null;
  use_cases: UseCase[];
  maintenance_count: number;
  last_execution: string | null;
}

export interface UseCase {
  id: string;
  name: string;
  description: string | null;
  category: "Safety" | "Security" | "Monitoring" | "Analytics" | "Compliance";
  priority: number;
  is_active: boolean;
}

// ── Calibration snapshots (dashboard-requested single frames) ──

/**
 * Lifecycle of a snapshot request. "expired" is computed by the backend for
 * a pending request the edge did not pick up within its TTL (10 minutes).
 */
export type SnapshotRequestStatus =
  | "pending"
  | "completed"
  | "failed"
  | "expired";

export interface CameraSnapshotRequest {
  id: string;
  camera_id: string;
  status: SnapshotRequestStatus;
  /**
   * Short-lived signed GCS URL (only when completed) — usable directly as an
   * <img> src. Do NOT append query params (that invalidates the signature).
   */
  image_url: string | null;
  captured_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface CameraStatistics {
  total_cameras: number;
  active_cameras: number;
  inactive_cameras: number;
  total_use_cases: number;
  active_use_cases: number;
  total_models: number;
  deployed_models: number;
}

export interface CameraListParams {
  skip?: number;
  limit?: number;
  status?: string;
  site_id?: string;
  manufacturer?: string;
  model?: string;
  zone?: string;
}

export interface CreateCameraRequest {
  name: string;
  /** At least one of ip_address / rtsp_url is required by the backend. */
  ip_address?: string | null;
  status?: CameraStatus;
  location?: string | null;
  // Hardware
  model?: string | null;
  manufacturer?: string | null;
  resolution?: string | null;
  firmware_version?: string | null;
  mac_address?: string | null;
  frame_rate?: number | null;
  video_encoding?: string | null;
  serial_number?: string | null;
  // Network
  rtsp_url?: string | null;
  http_url?: string | null;
  port?: number | null;
  username?: string | null;
  password?: string | null;
  // Physical location
  site_id?: string | null;
  zone?: string | null;
  floor_level?: string | null;
  // Installation
  installation_date?: string | null;
  // Detection config
  detection_types?: string[];
  speed_config?: CameraSpeedConfig | null;
  /** Mutually exclusive with speed_config. */
  alpr_config?: CameraAlprConfig | null;
  pipeline_node?: string | null;
}

/**
 * Partial update. `speed_config` is tri-state on the backend: key absent →
 * untouched; explicit null → calibration deleted; object → replaced.
 */
export interface UpdateCameraRequest {
  name?: string;
  ip_address?: string | null;
  status?: CameraStatus;
  location?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  resolution?: string | null;
  firmware_version?: string | null;
  mac_address?: string | null;
  frame_rate?: number | null;
  video_encoding?: string | null;
  serial_number?: string | null;
  rtsp_url?: string | null;
  http_url?: string | null;
  port?: number | null;
  username?: string | null;
  password?: string | null;
  site_id?: string | null;
  zone?: string | null;
  floor_level?: string | null;
  installation_date?: string | null;
  detection_types?: string[];
  speed_config?: CameraSpeedConfig | null;
  /**
   * Tri-state like speed_config: key absent → untouched; explicit null →
   * ALPR config deleted; object → replaced. A one-request module swap is
   * legal: new module's config object + explicit null for the other.
   */
  alpr_config?: CameraAlprConfig | null;
  pipeline_node?: string | null;
}
