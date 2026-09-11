"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { camerasApi, useCameraSnapshot } from "@/api/cameras";
import type {
  CalibrationPoint,
  CameraWithRelations,
  UpdateCameraRequest,
} from "@/api/cameras";
import { ApiError } from "@/api/base/errors";
import { useAuth } from "@/lib/auth-context";
import { Permission } from "@/lib/permissions";
import {
  PipelineHealthBadge,
  RelayHealthBadge,
} from "../components/PipelineHealthBadge";
import {
  cameraFormFromCamera,
  buildCameraPayload,
  hasAdvancedValues,
  validateCameraDetails,
  type CameraForm,
} from "../components/cameraForm";
import {
  buildSpeedConfig,
  speedConfigFormFromCamera,
  type SpeedConfigForm,
} from "../components/speedConfig";
import {
  alprConfigFormFromCamera,
  buildAlprConfig,
  type AlprConfigForm,
} from "../components/alprConfig";
import { DeviceForm } from "../components/DeviceForm";
import { AlprForm } from "./components/AlprForm";
import { CalibrationForm } from "./components/CalibrationForm";
import { PointsEditor } from "./components/PointsEditor";
import { SnapshotPanel } from "./components/SnapshotPanel";

/**
 * Camera detail page — THE edit surface for a camera: device fields (incl.
 * pipeline-node assignment), detection modules, and the visual speed/ALPR
 * mapping over an edge-captured snapshot. The add dialog only creates the
 * camera and lands here.
 *
 * Speed and ALPR are mutually exclusive per camera (backend rule). Save
 * always sends both config keys — the active module's object (or null when
 * its form is untouched) and an explicit null for the inactive one — which
 * makes a module swap a single legal request (tri-state semantics).
 */

/** Parse string form points into fixed-slot editor points (null = unplaced). */
function toSlotPoints(
  points: { x: string; y: string }[],
  slots: number,
): (CalibrationPoint | null)[] {
  return Array.from({ length: slots }, (_, i) => {
    const p = points[i];
    if (!p || p.x.trim() === "" || p.y.trim() === "") return null;
    const x = Number(p.x);
    const y = Number(p.y);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  });
}

/** Parse variable-length polygon points (skip unparseable rows). */
function toPolygonPoints(
  points: { x: string; y: string }[],
): (CalibrationPoint | null)[] {
  return points.map((p) => {
    const x = Number(p.x);
    const y = Number(p.y);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  });
}

function speedFormIsEmpty(form: SpeedConfigForm): boolean {
  return (
    form.points.every((p) => p.x.trim() === "" && p.y.trim() === "") &&
    form.distance_m.trim() === "" &&
    form.speed_limit.trim() === ""
  );
}

function alprFormIsEmpty(form: AlprConfigForm): boolean {
  return form.roi_points.length === 0 && form.crossing_points.length === 0;
}

type AlprShape = "roi" | "line";

export default function CameraDetailPage() {
  const params = useParams<{ id: string }>();
  const cameraId = params.id;
  const router = useRouter();

  const { permissions } = useAuth();
  const canUpdate = permissions.has(Permission.cameraUpdate);

  const [camera, setCamera] = useState<CameraWithRelations | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<CameraForm | null>(null);
  const [speedForm, setSpeedForm] = useState<SpeedConfigForm | null>(null);
  const [alprForm, setAlprForm] = useState<AlprConfigForm | null>(null);
  const [alprShape, setAlprShape] = useState<AlprShape>("roi");
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const snapshot = useCameraSnapshot(cameraId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await camerasApi.getCamera(cameraId);
        if (cancelled) return;
        setCamera(data);
        setForm(cameraFormFromCamera(data));
        setSpeedForm(speedConfigFormFromCamera(data));
        setAlprForm(alprConfigFormFromCamera(data));
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError ? err.message : "Failed to load camera",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cameraId]);

  // ── Device form ────────────────────────────────────────────────────────

  const setField = useCallback(
    <K extends keyof CameraForm>(field: K, value: CameraForm[K]) => {
      setForm((f) => (f ? { ...f, [field]: value } : f));
    },
    [],
  );

  const speedEnabled = form?.detection_types.includes("speed") ?? false;
  const alprEnabled = form?.detection_types.includes("alpr") ?? false;

  const toggleModule = useCallback((type: string, checked: boolean) => {
    setForm((f) => {
      if (!f) return f;
      let next = checked
        ? [...f.detection_types, type]
        : f.detection_types.filter((t) => t !== type);
      // Speed and ALPR are mutually exclusive per camera — enabling one
      // disables the other (its stored config is deleted on save).
      if (checked && type === "speed" && next.includes("alpr")) {
        next = next.filter((t) => t !== "alpr");
        toast.info("ALPR disabled — a camera runs one of the two modules");
      }
      if (checked && type === "alpr" && next.includes("speed")) {
        next = next.filter((t) => t !== "speed");
        toast.info("Speed disabled — a camera runs one of the two modules");
      }
      return { ...f, detection_types: next };
    });
  }, []);

  // ── Speed calibration form ─────────────────────────────────────────────

  const setSpeedField = useCallback(
    (field: Exclude<keyof SpeedConfigForm, "points">, value: string) => {
      setSpeedForm((f) => (f ? { ...f, [field]: value } : f));
    },
    [],
  );

  const setSpeedPointAxis = useCallback(
    (index: number, axis: "x" | "y", value: string) => {
      setSpeedForm((f) =>
        f
          ? {
              ...f,
              points: f.points.map((p, i) =>
                i === index ? { ...p, [axis]: value } : p,
              ),
            }
          : f,
      );
    },
    [],
  );

  const setSpeedPointFromEditor = useCallback(
    (index: number, point: CalibrationPoint) => {
      setSpeedForm((f) =>
        f
          ? {
              ...f,
              points: f.points.map((p, i) =>
                i === index ? { x: String(point.x), y: String(point.y) } : p,
              ),
            }
          : f,
      );
    },
    [],
  );

  const resetSpeedPoints = useCallback(() => {
    setSpeedForm((f) =>
      f
        ? { ...f, points: Array.from({ length: 4 }, () => ({ x: "", y: "" })) }
        : f,
    );
  }, []);

  // ── ALPR form ──────────────────────────────────────────────────────────

  const setAlprField = useCallback(
    (
      field: Exclude<keyof AlprConfigForm, "roi_points" | "crossing_points">,
      value: string | boolean,
    ) => {
      setAlprForm((f) => (f ? { ...f, [field]: value } : f));
    },
    [],
  );

  const alprPointHandlers = {
    appendRoi: (point: CalibrationPoint) =>
      setAlprForm((f) =>
        f
          ? {
              ...f,
              roi_points: [
                ...f.roi_points,
                { x: String(point.x), y: String(point.y) },
              ],
            }
          : f,
      ),
    changeRoiFromEditor: (index: number, point: CalibrationPoint) =>
      setAlprForm((f) =>
        f
          ? {
              ...f,
              roi_points: f.roi_points.map((p, i) =>
                i === index ? { x: String(point.x), y: String(point.y) } : p,
              ),
            }
          : f,
      ),
    changeRoiAxis: (index: number, axis: "x" | "y", value: string) =>
      setAlprForm((f) =>
        f
          ? {
              ...f,
              roi_points: f.roi_points.map((p, i) =>
                i === index ? { ...p, [axis]: value } : p,
              ),
            }
          : f,
      ),
    removeRoi: (index: number) =>
      setAlprForm((f) =>
        f
          ? { ...f, roi_points: f.roi_points.filter((_, i) => i !== index) }
          : f,
      ),
    resetRoi: () => setAlprForm((f) => (f ? { ...f, roi_points: [] } : f)),
    changeCrossingFromEditor: (index: number, point: CalibrationPoint) =>
      setAlprForm((f) => {
        if (!f) return f;
        const next = [...f.crossing_points];
        while (next.length <= index) next.push({ x: "", y: "" });
        next[index] = { x: String(point.x), y: String(point.y) };
        return { ...f, crossing_points: next };
      }),
    changeCrossingAxis: (index: number, axis: "x" | "y", value: string) =>
      setAlprForm((f) =>
        f
          ? {
              ...f,
              crossing_points: f.crossing_points.map((p, i) =>
                i === index ? { ...p, [axis]: value } : p,
              ),
            }
          : f,
      ),
    resetCrossing: () =>
      setAlprForm((f) => (f ? { ...f, crossing_points: [] } : f)),
  };

  // ── Save ───────────────────────────────────────────────────────────────

  async function save() {
    if (!camera || !form || !speedForm || !alprForm) return;
    if (!validateCameraDetails(form)) return;

    // Active module's config: object when configured, null when its form is
    // untouched (module enabled but not yet mapped — legal, just not
    // pipeline-eligible). Inactive module: explicit null (tri-state delete).
    let speedConfig = null;
    if (speedEnabled && !speedFormIsEmpty(speedForm)) {
      speedConfig = buildSpeedConfig(speedForm);
      if (!speedConfig) return;
    }
    let alprConfig = null;
    if (alprEnabled && !alprFormIsEmpty(alprForm)) {
      alprConfig = buildAlprConfig(alprForm);
      if (!alprConfig) return;
    }

    const payload: UpdateCameraRequest = {
      ...buildCameraPayload(form),
      speed_config: speedConfig,
      alpr_config: alprConfig,
    };

    try {
      setSaving(true);
      await camerasApi.updateCamera(camera.id, payload);
      toast.success(
        "Camera saved — the edge pipeline applies changes within ~60 seconds",
      );
      setCamera((c) =>
        c
          ? {
              ...c,
              ...payload,
              speed_config: speedConfig,
              alpr_config: alprConfig,
            }
          : c,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save camera");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(next: string) {
    if (!camera) return;
    try {
      setStatusSaving(true);
      await camerasApi.updateCamera(camera.id, {
        status: next as CameraWithRelations["status"],
      });
      setCamera((c) =>
        c ? { ...c, status: next as CameraWithRelations["status"] } : c,
      );
      toast.success(
        next === "Active"
          ? "Resuming — the edge picks the camera up within ~60 seconds"
          : `Paused — the edge stops processing within ~60 seconds (status: ${next})`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to change status",
      );
    } finally {
      setStatusSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="space-y-4 p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/cameras")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Cameras
        </Button>
        <p className="text-destructive text-sm">{loadError}</p>
      </div>
    );
  }

  if (!camera || !form || !speedForm || !alprForm) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const imageUrl =
    snapshot.status === "completed" ? snapshot.snapshot?.image_url : null;
  const mappingModuleOn = speedEnabled || alprEnabled;
  const disabled = !canUpdate || saving;

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/cameras")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Cameras
        </Button>
        <h1 className="text-lg font-semibold">{camera.name}</h1>
        <PipelineHealthBadge camera={camera} />
        <RelayHealthBadge camera={camera} />
        {camera.site_name && (
          <span className="text-muted-foreground text-sm">
            {camera.site_name}
          </span>
        )}
        <div className="ml-auto">
          {canUpdate && (
            <Button onClick={save} disabled={saving}>
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
          )}
        </div>
      </div>

      <Tabs
        defaultValue={
          camera.speed_config || camera.alpr_config ? "detection" : "device"
        }
      >
        <TabsList>
          <TabsTrigger value="device">Device</TabsTrigger>
          <TabsTrigger value="detection">Detection &amp; mapping</TabsTrigger>
        </TabsList>

        {canUpdate && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Status</span>
            <Select
              value={camera.status}
              onValueChange={changeStatus}
              disabled={statusSaving}
            >
              <SelectTrigger className="h-8 w-28 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Active", "Inactive", "Maintenance", "Faulty", "Offline"].map(
                  (statusOption) => (
                    <SelectItem key={statusOption} value={statusOption}>
                      {statusOption}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">
              {camera.status === "Active"
                ? "Processing — set any other status to pause this camera."
                : "Paused — set Active to resume processing."}
            </span>
          </div>
        )}

        {/* ── Device tab ── */}
        <TabsContent value="device" className="pt-4">
          <div className="max-w-2xl">
            <DeviceForm
              form={form}
              onChange={setField}
              disabled={disabled}
              defaultAdvancedOpen={hasAdvancedValues(form)}
            />
          </div>
        </TabsContent>

        {/* ── Detection tab ── */}
        <TabsContent value="detection" className="space-y-5 pt-4">
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Detection modules
            </p>
            <div className="flex flex-wrap gap-4 pt-1">
              {[
                { type: "speed", label: "Speed" },
                { type: "alpr", label: "ALPR" },
                { type: "face_recognition", label: "Face Recognition" },
              ].map(({ type, label }) => (
                <label key={type} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.detection_types.includes(type)}
                    onCheckedChange={(checked) =>
                      toggleModule(type, checked === true)
                    }
                    disabled={disabled}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-muted-foreground mt-1.5 text-xs">
              Speed and ALPR are mutually exclusive — a camera runs one of the
              two modules.
            </p>
          </div>

          {!mappingModuleOn ? (
            <p className="text-muted-foreground text-sm">
              Enable Speed or ALPR to configure its mapping on a camera
              snapshot.
            </p>
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
              {/* Snapshot + visual mapping */}
              <div className="space-y-3">
                {alprEnabled && (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground mr-1 text-xs font-medium tracking-wide uppercase">
                      Draw
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={alprShape === "roi" ? "default" : "outline"}
                      className="h-7"
                      onClick={() => setAlprShape("roi")}
                    >
                      ROI polygon
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={alprShape === "line" ? "default" : "outline"}
                      className="h-7"
                      onClick={() => setAlprShape("line")}
                    >
                      Crossing line
                    </Button>
                  </div>
                )}
                <SnapshotPanel
                  status={snapshot.status}
                  errorMessage={snapshot.snapshot?.error_message ?? null}
                  fetchError={snapshot.error}
                  hasImage={Boolean(imageUrl)}
                  canRequest={canUpdate && Boolean(form.rtsp_url.trim())}
                  onRequest={() => void snapshot.requestNew()}
                >
                  {imageUrl && speedEnabled && (
                    <PointsEditor
                      imageUrl={imageUrl}
                      shape="speed-quad"
                      points={toSlotPoints(speedForm.points, 4)}
                      onChange={setSpeedPointFromEditor}
                      disabled={disabled}
                    />
                  )}
                  {imageUrl && alprEnabled && alprShape === "roi" && (
                    <PointsEditor
                      imageUrl={imageUrl}
                      shape="polygon"
                      points={toPolygonPoints(alprForm.roi_points)}
                      onChange={alprPointHandlers.changeRoiFromEditor}
                      onAppend={alprPointHandlers.appendRoi}
                      disabled={disabled}
                    />
                  )}
                  {imageUrl && alprEnabled && alprShape === "line" && (
                    <PointsEditor
                      imageUrl={imageUrl}
                      shape="line"
                      points={toSlotPoints(alprForm.crossing_points, 2)}
                      onChange={alprPointHandlers.changeCrossingFromEditor}
                      disabled={disabled}
                    />
                  )}
                </SnapshotPanel>
              </div>

              {/* Numeric form */}
              {speedEnabled ? (
                <CalibrationForm
                  form={speedForm}
                  onFieldChange={setSpeedField}
                  onPointChange={setSpeedPointAxis}
                  onResetPoints={resetSpeedPoints}
                  disabled={disabled}
                />
              ) : (
                <AlprForm
                  form={alprForm}
                  onFieldChange={setAlprField}
                  onRoiPointChange={alprPointHandlers.changeRoiAxis}
                  onRoiPointRemove={alprPointHandlers.removeRoi}
                  onRoiReset={alprPointHandlers.resetRoi}
                  onCrossingPointChange={alprPointHandlers.changeCrossingAxis}
                  onCrossingReset={alprPointHandlers.resetCrossing}
                  disabled={disabled}
                />
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {!form.rtsp_url.trim() && (
        <p className="text-muted-foreground text-sm">
          This camera has no RTSP URL, so snapshots are unavailable — add one
          under Device to use the visual editor.
        </p>
      )}
    </div>
  );
}
