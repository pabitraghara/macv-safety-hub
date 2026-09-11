import { toast } from "sonner";
import type { AlprDirection, Camera, CameraAlprConfig } from "@/api/cameras";
import type { PointForm } from "./speedConfig";

/**
 * ALPR-config slice of the camera form (numbers held as strings), sibling of
 * ./speedConfig. Validation mirrors the backend's CameraAlprConfigIn:
 * ROI polygon >= 3 points, crossing line exactly 2 points or empty, and
 * relay host/port/index required when the relay is enabled.
 */
export interface AlprConfigForm {
  roi_points: PointForm[];
  crossing_points: PointForm[];
  direction: AlprDirection;
  min_ocr_confidence: string;
  dedup_ttl_seconds: string;
  relay_enabled: boolean;
  relay_host: string;
  relay_port: string;
  relay_index: string;
  relay_delay_ms: string;
  relay_username: string;
  relay_password: string;
}

/** Tuning-knob defaults match the backend defaults. */
export const ALPR_CONFIG_FORM_DEFAULTS: AlprConfigForm = {
  roi_points: [],
  crossing_points: [],
  direction: "entry",
  min_ocr_confidence: "0.7",
  dedup_ttl_seconds: "60",
  relay_enabled: false,
  relay_host: "",
  relay_port: "",
  relay_index: "",
  relay_delay_ms: "",
  relay_username: "",
  relay_password: "",
};

function pointsToForm(points: { x: number; y: number }[] | null): PointForm[] {
  return (points ?? []).map((p) => ({ x: String(p.x), y: String(p.y) }));
}

export function alprConfigFormFromCamera(
  camera: Pick<Camera, "alpr_config">,
): AlprConfigForm {
  const cfg = camera.alpr_config;
  if (!cfg) return { ...ALPR_CONFIG_FORM_DEFAULTS };
  return {
    roi_points: pointsToForm(cfg.roi_polygon),
    crossing_points: pointsToForm(cfg.crossing_line),
    direction: cfg.direction,
    min_ocr_confidence: String(cfg.min_ocr_confidence),
    dedup_ttl_seconds: String(cfg.dedup_ttl_seconds),
    relay_enabled: cfg.relay_enabled,
    relay_host: cfg.relay_host ?? "",
    relay_port: cfg.relay_port != null ? String(cfg.relay_port) : "",
    relay_index: cfg.relay_index != null ? String(cfg.relay_index) : "",
    relay_delay_ms:
      cfg.relay_delay_ms != null ? String(cfg.relay_delay_ms) : "",
    relay_username: cfg.relay_username ?? "",
    relay_password: cfg.relay_password ?? "",
  };
}

function parsePoints(
  points: PointForm[],
  label: string,
): { x: number; y: number }[] | null {
  const parsed = points.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
  if (
    points.some((p) => p.x.trim() === "" || p.y.trim() === "") ||
    parsed.some(
      (p) =>
        !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.y < 0,
    )
  ) {
    toast.error(`${label} points must be non-negative numbers`);
    return null;
  }
  return parsed;
}

/** Parse + validate the ALPR section; returns null with a toast on error. */
export function buildAlprConfig(form: AlprConfigForm): CameraAlprConfig | null {
  if (form.roi_points.length < 3) {
    toast.error("The ROI polygon needs at least 3 points");
    return null;
  }
  const roi_polygon = parsePoints(form.roi_points, "ROI polygon");
  if (!roi_polygon) return null;

  if (form.crossing_points.length !== 0 && form.crossing_points.length !== 2) {
    toast.error("The crossing line needs exactly 2 points (or none)");
    return null;
  }
  let crossing_line: { x: number; y: number }[] | null = null;
  if (form.crossing_points.length === 2) {
    crossing_line = parsePoints(form.crossing_points, "Crossing line");
    if (!crossing_line) return null;
  }

  const min_ocr_confidence = Number(form.min_ocr_confidence);
  if (
    !Number.isFinite(min_ocr_confidence) ||
    min_ocr_confidence < 0 ||
    min_ocr_confidence > 1
  ) {
    toast.error("Min OCR confidence must be between 0 and 1");
    return null;
  }
  const dedup_ttl_seconds = Number(form.dedup_ttl_seconds);
  if (!Number.isInteger(dedup_ttl_seconds) || dedup_ttl_seconds <= 0) {
    toast.error("Dedup TTL must be a positive whole number of seconds");
    return null;
  }

  let relay_port: number | null = null;
  let relay_index: number | null = null;
  let relay_delay_ms: number | null = null;
  if (form.relay_enabled) {
    // Backend rule: host/port/index required when the relay is enabled.
    if (!form.relay_host.trim()) {
      toast.error("Relay host is required when the relay is enabled");
      return null;
    }
    relay_port = Number(form.relay_port);
    if (!Number.isInteger(relay_port) || relay_port < 1 || relay_port > 65535) {
      toast.error("Relay port must be between 1 and 65535");
      return null;
    }
    relay_index = Number(form.relay_index);
    if (!Number.isInteger(relay_index) || relay_index < 0) {
      toast.error("Relay index must be zero or a positive whole number");
      return null;
    }
  }
  if (form.relay_delay_ms.trim() !== "") {
    relay_delay_ms = Number(form.relay_delay_ms);
    if (!Number.isInteger(relay_delay_ms) || relay_delay_ms < 0) {
      toast.error("Relay delay must be zero or a positive whole number (ms)");
      return null;
    }
  }

  return {
    roi_polygon,
    crossing_line,
    direction: form.direction,
    min_ocr_confidence,
    dedup_ttl_seconds,
    relay_enabled: form.relay_enabled,
    relay_host: form.relay_host.trim() || null,
    relay_port,
    relay_index,
    relay_delay_ms,
    relay_username: form.relay_username.trim() || null,
    relay_password: form.relay_password.trim() || null,
  };
}
