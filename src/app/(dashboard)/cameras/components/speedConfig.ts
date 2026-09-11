import { toast } from "sonner";
import type { Camera, CameraSpeedConfig } from "@/api/cameras";

/** One calibration point held as strings for friendlier editing. */
export interface PointForm {
  x: string;
  y: string;
}

/**
 * The speed-calibration slice of a camera form (numbers held as strings).
 * Shared between the CameraDialog wizard and the camera detail page's
 * calibration editor so validation stays in one place.
 */
export interface SpeedConfigForm {
  distance_m: string;
  speed_limit: string;
  speed_leniency: string;
  calibration_factor: string;
  min_transit_frames: string;
  max_unrealistic_speed: string;
  points: PointForm[];
}

/** Tuning-knob defaults match the backend/pipeline defaults. */
export const SPEED_CONFIG_FORM_DEFAULTS: SpeedConfigForm = {
  distance_m: "",
  speed_limit: "",
  speed_leniency: "5",
  calibration_factor: "1",
  min_transit_frames: "15",
  max_unrealistic_speed: "165",
  points: Array.from({ length: 4 }, () => ({ x: "", y: "" })),
};

export function speedConfigFormFromCamera(
  camera: Pick<Camera, "speed_config">,
): SpeedConfigForm {
  const cfg = camera.speed_config;
  if (!cfg) {
    return {
      ...SPEED_CONFIG_FORM_DEFAULTS,
      points: SPEED_CONFIG_FORM_DEFAULTS.points.map((p) => ({ ...p })),
    };
  }
  return {
    distance_m: String(cfg.distance_m),
    speed_limit: String(cfg.speed_limit),
    speed_leniency: String(cfg.speed_leniency),
    calibration_factor: String(cfg.calibration_factor),
    min_transit_frames: String(cfg.min_transit_frames),
    max_unrealistic_speed: String(cfg.max_unrealistic_speed),
    points: cfg.calibration_points.map((p) => ({
      x: String(p.x),
      y: String(p.y),
    })),
  };
}

/** Parse + validate the calibration section; returns null with a toast on error. */
export function buildSpeedConfig(
  form: SpeedConfigForm,
): CameraSpeedConfig | null {
  if (form.points.some((p) => p.x.trim() === "" || p.y.trim() === "")) {
    toast.error("All 4 calibration points are required");
    return null;
  }
  const points = form.points.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
  if (
    points.some(
      (p) =>
        !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.y < 0,
    )
  ) {
    toast.error("Calibration points must be non-negative numbers");
    return null;
  }
  const distance_m = Number(form.distance_m);
  const speed_limit = Number(form.speed_limit);
  const speed_leniency = Number(form.speed_leniency);
  const calibration_factor = Number(form.calibration_factor);
  const min_transit_frames = Number(form.min_transit_frames);
  const max_unrealistic_speed = Number(form.max_unrealistic_speed);

  if (!Number.isFinite(distance_m) || distance_m <= 0) {
    toast.error("Distance must be a positive number");
    return null;
  }
  if (!Number.isFinite(speed_limit) || speed_limit <= 0) {
    toast.error("Speed limit must be a positive number");
    return null;
  }
  if (!Number.isFinite(speed_leniency) || speed_leniency < 0) {
    toast.error("Leniency must be zero or a positive number");
    return null;
  }
  if (!Number.isFinite(calibration_factor) || calibration_factor <= 0) {
    toast.error("Calibration factor must be a positive number");
    return null;
  }
  if (!Number.isInteger(min_transit_frames) || min_transit_frames <= 0) {
    toast.error("Min transit frames must be a positive whole number");
    return null;
  }
  if (!Number.isFinite(max_unrealistic_speed) || max_unrealistic_speed <= 0) {
    toast.error("Max unrealistic speed must be a positive number");
    return null;
  }
  return {
    calibration_points: points,
    distance_m,
    speed_limit,
    speed_leniency,
    calibration_factor,
    min_transit_frames,
    max_unrealistic_speed,
  };
}
