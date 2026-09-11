import { toast } from "sonner";
import type { Camera, CameraStatus } from "@/api/cameras";

/**
 * Device-field slice of the camera form (module configs live in
 * ./speedConfig and ./alprConfig). Shared by the add dialog and the camera
 * detail page so field handling, validation and payload assembly stay in
 * one place.
 */
export interface CameraForm {
  name: string;
  ip_address: string;
  status: CameraStatus;
  location: string;
  manufacturer: string;
  model: string;
  resolution: string | null;
  firmware_version: string;
  mac_address: string;
  serial_number: string;
  frame_rate: number | null;
  video_encoding: string | null;
  rtsp_url: string;
  port: number | null;
  site_id: string | null;
  zone: string;
  floor_level: string;
  pipeline_node: string;
  detection_types: string[];
}

export const INITIAL_CAMERA_FORM: CameraForm = {
  name: "",
  ip_address: "",
  status: "Inactive",
  location: "",
  manufacturer: "",
  model: "",
  resolution: null,
  firmware_version: "",
  mac_address: "",
  serial_number: "",
  frame_rate: null,
  video_encoding: null,
  rtsp_url: "",
  port: null,
  site_id: null,
  zone: "",
  floor_level: "",
  pipeline_node: "",
  detection_types: [],
};

export function cameraFormFromCamera(camera: Camera): CameraForm {
  return {
    name: camera.name,
    ip_address: camera.ip_address ?? "",
    status: camera.status,
    location: camera.location ?? "",
    manufacturer: camera.manufacturer ?? "",
    model: camera.model ?? "",
    resolution: camera.resolution,
    firmware_version: camera.firmware_version ?? "",
    mac_address: camera.mac_address ?? "",
    serial_number: camera.serial_number ?? "",
    frame_rate: camera.frame_rate,
    video_encoding: camera.video_encoding,
    rtsp_url: camera.rtsp_url ?? "",
    port: camera.port,
    site_id: camera.site_id,
    zone: camera.zone ?? "",
    floor_level: camera.floor_level ?? "",
    pipeline_node: camera.pipeline_node ?? "",
    detection_types: camera.detection_types ?? [],
  };
}

/** True when any collapsed "advanced" field carries a value (edit views open
 * the section so existing data is never hidden). */
export function hasAdvancedValues(form: CameraForm): boolean {
  return Boolean(
    form.manufacturer ||
    form.model ||
    form.resolution ||
    form.firmware_version ||
    form.mac_address ||
    form.serial_number ||
    form.frame_rate != null ||
    form.video_encoding ||
    form.port != null ||
    form.zone ||
    form.floor_level ||
    form.pipeline_node,
  );
}

/** Validate the core device fields; toasts + returns false on error. */
export function validateCameraDetails(form: CameraForm): boolean {
  const ip = form.ip_address.trim();
  const rtsp = form.rtsp_url.trim();
  if (!form.name.trim()) {
    toast.error("Name is required");
    return false;
  }
  if (!ip && !rtsp) {
    toast.error("At least one of IP address or RTSP URL is required");
    return false;
  }
  if (rtsp && !rtsp.startsWith("rtsp://")) {
    toast.error("RTSP URL must start with rtsp://");
    return false;
  }
  return true;
}

/**
 * Device-field payload for create/update — module configs
 * (speed_config/alpr_config) are appended by the caller, which owns the
 * tri-state semantics.
 */
export function buildCameraPayload(form: CameraForm) {
  return {
    name: form.name.trim(),
    ip_address: form.ip_address.trim() || null,
    status: form.status,
    location: form.location.trim() || null,
    manufacturer: form.manufacturer.trim() || null,
    model: form.model.trim() || null,
    resolution: form.resolution,
    firmware_version: form.firmware_version.trim() || null,
    mac_address: form.mac_address.trim() || null,
    serial_number: form.serial_number.trim() || null,
    frame_rate: form.frame_rate,
    video_encoding: form.video_encoding,
    rtsp_url: form.rtsp_url.trim() || null,
    port: form.port,
    site_id: form.site_id,
    zone: form.zone.trim() || null,
    floor_level: form.floor_level.trim() || null,
    pipeline_node: form.pipeline_node.trim() || null,
    detection_types: form.detection_types,
  };
}
