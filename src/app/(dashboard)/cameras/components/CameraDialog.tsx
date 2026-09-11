"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera as CameraIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { camerasApi, DETECTION_TYPES } from "@/api/cameras";
import type { CreateCameraRequest } from "@/api/cameras";
import {
  INITIAL_CAMERA_FORM,
  buildCameraPayload,
  validateCameraDetails,
  type CameraForm,
} from "./cameraForm";
import { DeviceForm } from "./DeviceForm";

/**
 * ADD-only dialog (editing happens on the camera detail page — the single
 * edit surface). Two steps: device details, then detection modules. On
 * success it navigates to /cameras/{id}, where calibration/ALPR mapping is
 * done visually over a snapshot — mapping needs the camera to exist first
 * (the edge can only snapshot a registered camera), so it can't live here.
 */

const DETECTION_TYPE_LABELS: Record<string, string> = {
  speed: "Speed",
  alpr: "ALPR",
  face_recognition: "Face Recognition",
};

type Step = 1 | 2;

interface CameraDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

export function CameraDialog({
  open,
  onOpenChange,
  onSuccess,
}: CameraDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState<CameraForm>(INITIAL_CAMERA_FORM);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(INITIAL_CAMERA_FORM);
      setStep(1);
    }
  }, [open]);

  function set<K extends keyof CameraForm>(field: K, value: CameraForm[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleDetectionType(type: string, checked: boolean) {
    setForm((f) => {
      let next = checked
        ? [...f.detection_types, type]
        : f.detection_types.filter((t) => t !== type);
      // Speed and ALPR are mutually exclusive per camera.
      if (checked && type === "speed") next = next.filter((t) => t !== "alpr");
      if (checked && type === "alpr") next = next.filter((t) => t !== "speed");
      return { ...f, detection_types: next };
    });
  }

  function goToStep(next: Step) {
    if (next === 2 && !validateCameraDetails(form)) return;
    setStep(next);
  }

  async function save() {
    if (!validateCameraDetails(form)) {
      setStep(1);
      return;
    }
    try {
      setLoading(true);
      const camera = await camerasApi.createCamera(
        buildCameraPayload(form) as CreateCameraRequest,
      );
      toast.success(
        `Camera '${camera.name}' added — configure its detection mapping here`,
      );
      onOpenChange(false);
      onSuccess();
      // Land on the detail page: snapshot + visual mapping happen there.
      router.push(`/cameras/${camera.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add camera");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Enter on page 1 advances instead of submitting a half-reviewed form.
    if (step === 1) {
      goToStep(2);
      return;
    }
    void save();
  }

  const stepButton = (target: Step, label: string) => (
    <button
      type="button"
      onClick={() => goToStep(target)}
      disabled={loading}
      className={`flex items-center gap-2 border-b-2 pb-1.5 text-sm transition-colors ${
        step === target
          ? "border-primary font-medium"
          : "text-muted-foreground hover:text-foreground border-transparent"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
          step === target
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {target}
      </span>
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Camera</DialogTitle>
          <DialogDescription>
            Register a new camera, then map its detection module on the camera
            page.
          </DialogDescription>
        </DialogHeader>

        {/* Step navigation */}
        <div className="flex items-center gap-5 border-b">
          {stepButton(1, "Camera details")}
          {stepButton(2, "Detection")}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {step === 1 ? (
            <DeviceForm form={form} onChange={set} disabled={loading} />
          ) : (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Detection module
              </p>
              <div className="flex flex-wrap gap-4 pt-1">
                {DETECTION_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.detection_types.includes(type)}
                      onCheckedChange={(checked) =>
                        toggleDetectionType(type, checked === true)
                      }
                      disabled={loading}
                    />
                    {DETECTION_TYPE_LABELS[type]}
                  </label>
                ))}
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                Speed calibration and ALPR mapping are drawn on a live camera
                snapshot — you&apos;ll be taken to the camera page after adding
                to set them up.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-2">
            {step === 2 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => goToStep(1)}
                disabled={loading}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            )}

            <div className="flex items-center gap-2">
              {step === 1 && (
                <Button
                  type="button"
                  onClick={() => goToStep(2)}
                  disabled={loading}
                >
                  Next
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}
              {step === 2 && (
                <Button type="submit" disabled={loading}>
                  <CameraIcon className="mr-1.5 h-4 w-4" />
                  {loading ? "Adding…" : "Add Camera"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
