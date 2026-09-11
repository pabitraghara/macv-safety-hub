// Pipeline nodes — one edge server; a deployment (org/site) runs N of them.
// Mirrors macv-safety-hub/app/schemas/pipeline_node.py (snake_case).

export type NodePlatform = "windows" | "jetson" | "linux";

export interface PipelineNode {
  id: string;
  code: string;
  name: string | null;
  site_id: string | null;
  platform: NodePlatform | null;
  stream_base_url: string | null;
  notes: string | null;
  // Read-only: filled by heartbeats now, the licensing check-in later.
  last_seen_at: string | null;
  running_version: string | null;
  license_id: string | null;
  // Host/capacity snapshot from the node check-in (latest value only). Every
  // field is optional — a host that cannot read a metric omits it rather than
  // reporting a misleading zero.
  checkin_at: string | null;
  uptime_seconds: number | null;
  shm_total_mb: number | null;
  shm_used_mb: number | null;
  cpu_percent: number | null;
  mem_percent: number | null;
  disk_free_mb: number | null;
  gpu_temp_c: number | null;
  // Headline health: cameras this node should run vs. cameras it is streaming.
  cameras_assigned: number;
  cameras_streaming: number;
  created_at: string;
  updated_at: string;
}

export interface CreateNodeRequest {
  code: string;
  name?: string | null;
  site_id?: string | null;
  platform?: NodePlatform | null;
  stream_base_url?: string | null;
  notes?: string | null;
}

export interface UpdateNodeRequest {
  name?: string | null;
  site_id?: string | null;
  platform?: NodePlatform | null;
  stream_base_url?: string | null;
  notes?: string | null;
}
