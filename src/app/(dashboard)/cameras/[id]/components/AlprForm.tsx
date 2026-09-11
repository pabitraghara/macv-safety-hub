"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AlprDirection } from "@/api/cameras";
import type { AlprConfigForm } from "../../components/alprConfig";

/**
 * Numeric side of the ALPR config: ROI/crossing-line point lists (two-way
 * synced with the visual editor), direction, detection knobs, and the gate
 * relay section (host/port/index required when enabled).
 */

interface AlprFormProps {
  form: AlprConfigForm;
  onFieldChange: (
    field: Exclude<keyof AlprConfigForm, "roi_points" | "crossing_points">,
    value: string | boolean,
  ) => void;
  onRoiPointChange: (index: number, axis: "x" | "y", value: string) => void;
  onRoiPointRemove: (index: number) => void;
  onRoiReset: () => void;
  onCrossingPointChange: (
    index: number,
    axis: "x" | "y",
    value: string,
  ) => void;
  onCrossingReset: () => void;
  disabled?: boolean;
}

export function AlprForm({
  form,
  onFieldChange,
  onRoiPointChange,
  onRoiPointRemove,
  onRoiReset,
  onCrossingPointChange,
  onCrossingReset,
  disabled = false,
}: AlprFormProps) {
  return (
    <div className="space-y-5">
      {/* ── ROI polygon points ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>
            ROI polygon (px) <span className="text-destructive">*</span>
          </Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onRoiReset}
            disabled={disabled || form.roi_points.length === 0}
          >
            Clear
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          At least 3 points outlining where plates are detected. Click the
          snapshot (ROI mode) to add points.
        </p>
        <div className="space-y-2">
          {form.roi_points.length === 0 && (
            <p className="text-muted-foreground text-xs italic">
              No points yet.
            </p>
          )}
          {form.roi_points.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-muted-foreground w-6 shrink-0 text-xs">
                {i + 1}
              </span>
              <Input
                type="number"
                min={0}
                step="any"
                placeholder="x"
                aria-label={`ROI point ${i + 1} x`}
                value={p.x}
                onChange={(e) => onRoiPointChange(i, "x", e.target.value)}
                disabled={disabled}
                className="h-8"
              />
              <Input
                type="number"
                min={0}
                step="any"
                placeholder="y"
                aria-label={`ROI point ${i + 1} y`}
                value={p.y}
                onChange={(e) => onRoiPointChange(i, "y", e.target.value)}
                disabled={disabled}
                className="h-8"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive h-8 w-8 shrink-0"
                aria-label={`Remove ROI point ${i + 1}`}
                onClick={() => onRoiPointRemove(i)}
                disabled={disabled}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Crossing line ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Crossing line (px)</Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onCrossingReset}
            disabled={disabled || form.crossing_points.length === 0}
          >
            Clear
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Optional 2-point entry/exit line. Click the snapshot (crossing-line
          mode) to place it.
        </p>
        <div className="space-y-2">
          {form.crossing_points.length === 0 && (
            <p className="text-muted-foreground text-xs italic">Not set.</p>
          )}
          {form.crossing_points.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-muted-foreground w-6 shrink-0 text-xs">
                L{i + 1}
              </span>
              <Input
                type="number"
                min={0}
                step="any"
                placeholder="x"
                aria-label={`Crossing point ${i + 1} x`}
                value={p.x}
                onChange={(e) => onCrossingPointChange(i, "x", e.target.value)}
                disabled={disabled}
                className="h-8"
              />
              <Input
                type="number"
                min={0}
                step="any"
                placeholder="y"
                aria-label={`Crossing point ${i + 1} y`}
                value={p.y}
                onChange={(e) => onCrossingPointChange(i, "y", e.target.value)}
                disabled={disabled}
                className="h-8"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Detection knobs ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="alpr-direction">
            Direction <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.direction}
            onValueChange={(v) =>
              onFieldChange("direction", v as AlprDirection)
            }
            disabled={disabled}
          >
            <SelectTrigger id="alpr-direction" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entry">Entry</SelectItem>
              <SelectItem value="exit">Exit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="alpr-conf">Min OCR confidence</Label>
          <Input
            id="alpr-conf"
            type="number"
            min={0}
            max={1}
            step="any"
            value={form.min_ocr_confidence}
            onChange={(e) =>
              onFieldChange("min_ocr_confidence", e.target.value)
            }
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="alpr-dedup">Dedup TTL (s)</Label>
          <Input
            id="alpr-dedup"
            type="number"
            min={1}
            value={form.dedup_ttl_seconds}
            onChange={(e) => onFieldChange("dedup_ttl_seconds", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* ── Gate relay ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Gate relay
          </p>
          <Switch
            checked={form.relay_enabled}
            onCheckedChange={(v) => onFieldChange("relay_enabled", v)}
            disabled={disabled}
            aria-label="Toggle gate relay"
          />
        </div>
        {form.relay_enabled ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="relay-host">
                Relay host <span className="text-destructive">*</span>
              </Label>
              <Input
                id="relay-host"
                placeholder="192.168.1.50"
                value={form.relay_host}
                onChange={(e) => onFieldChange("relay_host", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="relay-port">
                Relay port <span className="text-destructive">*</span>
              </Label>
              <Input
                id="relay-port"
                type="number"
                min={1}
                max={65535}
                placeholder="80"
                value={form.relay_port}
                onChange={(e) => onFieldChange("relay_port", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="relay-index">
                Relay index <span className="text-destructive">*</span>
              </Label>
              <Input
                id="relay-index"
                type="number"
                min={0}
                placeholder="0"
                value={form.relay_index}
                onChange={(e) => onFieldChange("relay_index", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="relay-delay">Pulse delay (ms)</Label>
              <Input
                id="relay-delay"
                type="number"
                min={0}
                value={form.relay_delay_ms}
                onChange={(e) =>
                  onFieldChange("relay_delay_ms", e.target.value)
                }
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="relay-user">Relay username</Label>
              <Input
                id="relay-user"
                autoComplete="off"
                value={form.relay_username}
                onChange={(e) =>
                  onFieldChange("relay_username", e.target.value)
                }
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="relay-pass">Relay password</Label>
              <Input
                id="relay-pass"
                type="password"
                autoComplete="new-password"
                value={form.relay_password}
                onChange={(e) =>
                  onFieldChange("relay_password", e.target.value)
                }
                disabled={disabled}
              />
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No gate control — detections are recorded without opening a barrier.
          </p>
        )}
      </div>
    </div>
  );
}
