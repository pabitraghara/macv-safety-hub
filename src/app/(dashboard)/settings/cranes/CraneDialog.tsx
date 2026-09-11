"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  cranesApi,
  CRANE_ALARM_PINS,
  type Crane,
  type CraneAlarmPin,
  type CraneInput,
} from "@/api/cranes";
import type { Site } from "@/api/sites";
import { ApiError } from "@/api/base/errors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Radix Select cannot hold an empty value, so "no selection" needs a sentinel. */
const NONE = "__none__";

const DEFAULT_COLOUR = "#2563eb";

interface CraneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create. */
  crane: Crane | null;
  sites: Site[];
  onSuccess: () => void;
}

export default function CraneDialog({
  open,
  onOpenChange,
  crane,
  sites,
  onSuccess,
}: CraneDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [siteId, setSiteId] = useState<string>(NONE);
  const [colour, setColour] = useState(DEFAULT_COLOUR);
  const [radiusM, setRadiusM] = useState("0");
  const [routerUrl, setRouterUrl] = useState("");
  const [routerUsername, setRouterUsername] = useState("");
  const [routerPassword, setRouterPassword] = useState("");
  // Defaults to on, matching CraneBase.router_verify_tls in the backend
  // schema: a new crane must not silently start out skipping certificate
  // verification on the edge's router calls.
  const [routerVerifyTls, setRouterVerifyTls] = useState(true);
  const [alarmPin, setAlarmPin] = useState<string>(NONE);
  const [alarmActiveValue, setAlarmActiveValue] = useState<"0" | "1">("1");
  const [alarmPulseMs, setAlarmPulseMs] = useState("10000");
  const [alarmOnWarning, setAlarmOnWarning] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(crane?.code ?? "");
    setName(crane?.name ?? "");
    setSiteId(crane?.site_id ?? NONE);
    setColour(crane?.colour ?? DEFAULT_COLOUR);
    setRadiusM(String(crane?.radius_m ?? 0));
    setRouterUrl(crane?.router_url ?? "");
    setRouterUsername(crane?.router_username ?? "");
    // Always blank: the stored password is never returned, so pre-filling
    // anything would be a lie about what is about to be submitted.
    setRouterPassword("");
    setRouterVerifyTls(crane?.router_verify_tls ?? true);
    setAlarmPin(crane?.alarm_pin ?? NONE);
    setAlarmActiveValue(crane?.alarm_active_value ?? "1");
    setAlarmPulseMs(String(crane?.alarm_pulse_ms ?? 10000));
    setAlarmOnWarning(crane?.alarm_on_warning ?? false);
    setIsActive(crane?.is_active ?? true);
  }, [open, crane]);

  async function save(event: React.FormEvent) {
    event.preventDefault();

    const radius = Number(radiusM);
    if (!Number.isFinite(radius) || radius < 0) {
      toast.error("Radius must be zero or a positive number");
      return;
    }
    const pulse = Number(alarmPulseMs);
    if (!Number.isInteger(pulse) || pulse < 0) {
      toast.error("Pulse must be zero or a positive whole number of ms");
      return;
    }

    try {
      setSaving(true);
      const shared = {
        name: name.trim(),
        site_id: siteId === NONE ? null : siteId,
        colour: colour.trim() || null,
        radius_m: radius,
        router_url: routerUrl.trim() || null,
        router_username: routerUsername.trim() || null,
        router_verify_tls: routerVerifyTls,
        alarm_pin: alarmPin === NONE ? null : (alarmPin as CraneAlarmPin),
        alarm_active_value: alarmActiveValue,
        alarm_pulse_ms: pulse,
        alarm_on_warning: alarmOnWarning,
        is_active: isActive,
      } satisfies Omit<CraneInput, "code">;

      // The password field is write-only and left blank on edit, so an empty
      // box means "leave the stored password alone" — sending "" would clear
      // it and silently break the edge's router login.
      const password = routerPassword.trim();
      const withPassword = password
        ? { ...shared, router_password: password }
        : shared;

      if (crane) {
        await cranesApi.updateCrane(crane.id, withPassword);
        toast.success(`Crane '${crane.code}' updated`);
      } else {
        await cranesApi.createCrane({ code: code.trim(), ...withPassword });
        toast.success(`Crane '${code.trim()}' created`);
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to save crane");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {crane ? `Edit crane '${crane.code}'` : "Add Crane"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          {!crane && (
            <div className="space-y-1.5">
              <Label htmlFor="crane-code">Code</Label>
              <Input
                id="crane-code"
                placeholder="CR1"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={saving}
                required
              />
              <p className="text-muted-foreground text-xs">
                Unique per organisation. Used in edge logs and the local
                test-output endpoint.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="crane-name">Name</Label>
              <Input
                id="crane-name"
                placeholder="Tower crane 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Site</Label>
              <Select
                value={siteId}
                onValueChange={setSiteId}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Org-wide</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="crane-radius">Radius (m)</Label>
              <Input
                id="crane-radius"
                type="number"
                min="0"
                step="0.1"
                value={radiusM}
                onChange={(e) => setRadiusM(e.target.value)}
                disabled={saving}
              />
              <p className="text-muted-foreground text-xs">
                Slew radius, subtracted from pair distances when &quot;use crane
                radius&quot; is on. 0 treats the crane as a point.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crane-colour">Marker colour</Label>
              <Input
                id="crane-colour"
                type="color"
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                disabled={saving}
                className="h-9 p-1"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">Router</p>
            <div className="space-y-1.5">
              <Label htmlFor="crane-router-url">Router URL</Label>
              <Input
                id="crane-router-url"
                placeholder="http://10.75.11.75"
                value={routerUrl}
                onChange={(e) => setRouterUrl(e.target.value)}
                disabled={saving}
              />
              <p className="text-muted-foreground text-xs">
                The Teltonika router on the plant LAN. Only the edge box reaches
                it — the browser never does.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="crane-router-user">Username</Label>
                <Input
                  id="crane-router-user"
                  value={routerUsername}
                  onChange={(e) => setRouterUsername(e.target.value)}
                  disabled={saving}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="crane-router-pass">Password</Label>
                <Input
                  id="crane-router-pass"
                  type="password"
                  placeholder={
                    crane?.has_router_password ? "•••••• (unchanged)" : ""
                  }
                  value={routerPassword}
                  onChange={(e) => setRouterPassword(e.target.value)}
                  disabled={saving}
                  autoComplete="new-password"
                />
                <p className="text-muted-foreground text-xs">
                  {crane?.has_router_password
                    ? "Stored. Leave blank to keep it."
                    : "Write-only — never read back."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="crane-verify-tls"
                checked={routerVerifyTls}
                onCheckedChange={setRouterVerifyTls}
                disabled={saving}
              />
              <Label htmlFor="crane-verify-tls" className="text-sm">
                Verify TLS certificate
              </Label>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">Alarm output</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pin</Label>
                <Select
                  value={alarmPin}
                  onValueChange={setAlarmPin}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {CRANE_ALARM_PINS.map((pin) => (
                      <SelectItem key={pin} value={pin}>
                        {pin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Active value</Label>
                <Select
                  value={alarmActiveValue}
                  onValueChange={(v) => setAlarmActiveValue(v as "0" | "1")}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 (high)</SelectItem>
                    <SelectItem value="0">0 (low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crane-pulse">Pulse (ms)</Label>
              <Input
                id="crane-pulse"
                type="number"
                min="0"
                step="100"
                value={alarmPulseMs}
                onChange={(e) => setAlarmPulseMs(e.target.value)}
                disabled={saving}
              />
              <p className="text-muted-foreground text-xs">
                How long the output stays asserted. 0 latches it until it is
                cleared by hand.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="crane-alarm-warning"
                checked={alarmOnWarning}
                onCheckedChange={setAlarmOnWarning}
                disabled={saving}
              />
              <Label htmlFor="crane-alarm-warning" className="text-sm">
                Fire on warning as well as critical
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="crane-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={saving}
            />
            <Label htmlFor="crane-active" className="text-sm">
              Active — the edge polls this crane
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim() || (!crane && !code.trim())}
            >
              {saving ? "Saving…" : crane ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
