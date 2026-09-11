"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import type { SpeedConfigForm } from "../../components/speedConfig";

/**
 * Numeric side of the calibration editor: the 4 points (two-way synced with
 * the visual editor — typing updates the markers, dragging updates these
 * fields) plus distance/limit/tuning knobs.
 */

interface CalibrationFormProps {
  form: SpeedConfigForm;
  onFieldChange: (
    field: Exclude<keyof SpeedConfigForm, "points">,
    value: string,
  ) => void;
  onPointChange: (index: number, axis: "x" | "y", value: string) => void;
  onResetPoints: () => void;
  disabled?: boolean;
}

const POINT_HINTS = ["entry line", "entry line", "exit line", "exit line"];

export function CalibrationForm({
  form,
  onFieldChange,
  onPointChange,
  onResetPoints,
  disabled = false,
}: CalibrationFormProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>
            Calibration points (px) <span className="text-destructive">*</span>
          </Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onResetPoints}
            disabled={disabled}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          P1→P2 marks the entry line, P3→P4 the exit line; distance is the
          real-world gap between the two lines.
        </p>
        <div className="space-y-2">
          {form.points.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-muted-foreground w-14 shrink-0 text-xs">
                P{i + 1}
                <span className="block text-[10px]">{POINT_HINTS[i]}</span>
              </span>
              <Input
                type="number"
                min={0}
                step="any"
                placeholder="x"
                aria-label={`Point ${i + 1} x`}
                value={p.x}
                onChange={(e) => onPointChange(i, "x", e.target.value)}
                disabled={disabled}
                className="h-8"
              />
              <Input
                type="number"
                min={0}
                step="any"
                placeholder="y"
                aria-label={`Point ${i + 1} y`}
                value={p.y}
                onChange={(e) => onPointChange(i, "y", e.target.value)}
                disabled={disabled}
                className="h-8"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cal-distance">
            Distance (m) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cal-distance"
            type="number"
            min={0}
            step="any"
            placeholder="17"
            value={form.distance_m}
            onChange={(e) => onFieldChange("distance_m", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cal-limit">
            Speed limit (km/h) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cal-limit"
            type="number"
            min={0}
            step="any"
            placeholder="32"
            value={form.speed_limit}
            onChange={(e) => onFieldChange("speed_limit", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cal-leniency">Leniency (km/h)</Label>
          <Input
            id="cal-leniency"
            type="number"
            min={0}
            step="any"
            value={form.speed_leniency}
            onChange={(e) => onFieldChange("speed_leniency", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cal-factor">Calibration factor</Label>
          <Input
            id="cal-factor"
            type="number"
            min={0}
            step="any"
            value={form.calibration_factor}
            onChange={(e) =>
              onFieldChange("calibration_factor", e.target.value)
            }
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cal-frames">Min transit frames</Label>
          <Input
            id="cal-frames"
            type="number"
            min={1}
            value={form.min_transit_frames}
            onChange={(e) =>
              onFieldChange("min_transit_frames", e.target.value)
            }
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cal-max">Max speed cutoff (km/h)</Label>
          <Input
            id="cal-max"
            type="number"
            min={0}
            step="any"
            value={form.max_unrealistic_speed}
            onChange={(e) =>
              onFieldChange("max_unrealistic_speed", e.target.value)
            }
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
