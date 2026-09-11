"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import NodeSelect from "./NodeSelect";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CameraStatus } from "@/api/cameras";
import { useMySites } from "@/api/sites";
import type { CameraForm } from "./cameraForm";

/**
 * Device-field form (core + collapsible advanced section incl. the
 * pipeline-node assignment). Shared between the add dialog and the camera
 * detail page — module configs (speed/ALPR) are separate components.
 */

const STATUS_OPTIONS: { label: string; value: CameraStatus }[] = [
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
  { label: "Maintenance", value: "Maintenance" },
  { label: "Faulty", value: "Faulty" },
  { label: "Offline", value: "Offline" },
];

const RESOLUTION_OPTIONS = [
  "3840*2160",
  "2560*1440",
  "1920*1080",
  "1280*720",
  "640*480",
];

const ENCODING_OPTIONS = ["H.265", "H.264", "H.265+", "H.264+"];

const FRAME_RATE_OPTIONS = [5, 10, 15, 20, 25, 30, 60];

interface DeviceFormProps {
  form: CameraForm;
  onChange: <K extends keyof CameraForm>(
    field: K,
    value: CameraForm[K],
  ) => void;
  disabled?: boolean;
  /** Open the advanced section initially (edit views with existing values). */
  defaultAdvancedOpen?: boolean;
}

export function DeviceForm({
  form,
  onChange,
  disabled = false,
  defaultAdvancedOpen = false,
}: DeviceFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(defaultAdvancedOpen);
  const { sites } = useMySites();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cam-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cam-name"
            placeholder="Front Gate Camera"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cam-site">Site</Label>
          <Select
            value={form.site_id ?? "none"}
            onValueChange={(v) => onChange("site_id", v === "none" ? null : v)}
            disabled={disabled}
          >
            <SelectTrigger id="cam-site" className="w-full">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cam-ip">IP Address</Label>
          <Input
            id="cam-ip"
            placeholder="192.168.1.100"
            value={form.ip_address}
            onChange={(e) => onChange("ip_address", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cam-status">Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => onChange("status", v as CameraStatus)}
            disabled={disabled}
          >
            <SelectTrigger id="cam-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cam-rtsp">RTSP URL</Label>
        <Input
          id="cam-rtsp"
          placeholder="rtsp://admin:pass@192.168.1.100/stream"
          value={form.rtsp_url}
          onChange={(e) => onChange("rtsp_url", e.target.value)}
          disabled={disabled}
        />
        <p className="text-muted-foreground text-xs">
          May include camera credentials — visible to anyone who can view
          cameras. Required if no IP address is given; snapshots and the edge
          pipeline need it.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cam-location">Location</Label>
        <Input
          id="cam-location"
          placeholder="Building A, Floor 2"
          value={form.location}
          onChange={(e) => onChange("location", e.target.value)}
          disabled={disabled}
        />
      </div>

      {/* ── Advanced details (collapsed by default) ── */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 text-xs font-medium tracking-wide uppercase transition-colors"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                advancedOpen ? "" : "-rotate-90"
              }`}
            />
            Advanced details
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cam-port">Port</Label>
              <Input
                id="cam-port"
                type="number"
                placeholder="554"
                min={1}
                max={65535}
                value={form.port ?? ""}
                onChange={(e) =>
                  onChange(
                    "port",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cam-encoding">Encoding</Label>
              <Select
                value={form.video_encoding ?? "none"}
                onValueChange={(v) =>
                  onChange("video_encoding", v === "none" ? null : v)
                }
                disabled={disabled}
              >
                <SelectTrigger id="cam-encoding" className="w-full">
                  <SelectValue placeholder="Codec" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {ENCODING_OPTIONS.map((enc) => (
                    <SelectItem key={enc} value={enc}>
                      {enc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cam-fps">Frame Rate</Label>
              <Select
                value={
                  form.frame_rate != null ? String(form.frame_rate) : "none"
                }
                onValueChange={(v) =>
                  onChange("frame_rate", v === "none" ? null : Number(v))
                }
                disabled={disabled}
              >
                <SelectTrigger id="cam-fps" className="w-full">
                  <SelectValue placeholder="fps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {FRAME_RATE_OPTIONS.map((fps) => (
                    <SelectItem key={fps} value={String(fps)}>
                      {fps} fps
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cam-manufacturer">Manufacturer</Label>
              <Input
                id="cam-manufacturer"
                placeholder="Hikvision"
                value={form.manufacturer}
                onChange={(e) => onChange("manufacturer", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cam-model">Model</Label>
              <Input
                id="cam-model"
                placeholder="DS-2CD2143G2"
                value={form.model}
                onChange={(e) => onChange("model", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cam-resolution">Resolution</Label>
              <Select
                value={form.resolution ?? "none"}
                onValueChange={(v) =>
                  onChange("resolution", v === "none" ? null : v)
                }
                disabled={disabled}
              >
                <SelectTrigger id="cam-resolution" className="w-full">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {RESOLUTION_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cam-firmware">Firmware Version</Label>
              <Input
                id="cam-firmware"
                placeholder="V5.8.10 build 241029"
                value={form.firmware_version}
                onChange={(e) => onChange("firmware_version", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cam-mac">MAC Address</Label>
              <Input
                id="cam-mac"
                placeholder="24:48:45:e0:1c:ec"
                value={form.mac_address}
                onChange={(e) => onChange("mac_address", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cam-serial">Serial Number</Label>
              <Input
                id="cam-serial"
                placeholder="DS-2CD3047G2E-LUF2024…"
                value={form.serial_number}
                onChange={(e) => onChange("serial_number", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cam-zone">Zone</Label>
              <Input
                id="cam-zone"
                placeholder="Zone A"
                value={form.zone}
                onChange={(e) => onChange("zone", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cam-floor">Floor Level</Label>
              <Input
                id="cam-floor"
                placeholder="G, 1, 2…"
                value={form.floor_level}
                onChange={(e) => onChange("floor_level", e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cam-node">Edge node</Label>
            <NodeSelect
              value={form.pipeline_node}
              onChange={(code) => onChange("pipeline_node", code)}
              disabled={disabled}
            />
            <p className="text-muted-foreground text-xs">
              Assigns this camera to one edge server (the box polls with
              <code> ?node=…</code>). Unassigned = any edge server for this
              organisation/site drives it.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
