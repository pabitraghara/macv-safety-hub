"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  AlertMatch,
  AlertTriggerType,
  AlprListStatus,
  SeverityValue,
} from "@/api/alert-policies";

export interface ConditionFieldsProps {
  triggerType: AlertTriggerType;
  value: AlertMatch;
  onChange: (next: AlertMatch) => void;
  error?: string | null;
}

const SEVERITIES: SeverityValue[] = ["Low", "Medium", "High", "Critical"];
const ALL_SEVERITIES = "__all__";

export function ConditionFields({
  triggerType,
  value,
  onChange,
  error,
}: ConditionFieldsProps) {
  if (triggerType === "safety") {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Condition</Label>
        <Select
          value={value.min_severity ?? ALL_SEVERITIES}
          onValueChange={(next) => {
            if (next === ALL_SEVERITIES) {
              onChange({});
            } else {
              onChange({ min_severity: next as SeverityValue });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SEVERITIES}>All severities</SelectItem>
            {SEVERITIES.map((sev) => (
              <SelectItem key={sev} value={sev}>
                {sev} and above
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
    );
  }

  if (triggerType === "alpr") {
    return <AlprCondition value={value} onChange={onChange} error={error} />;
  }

  return <SpeedCondition value={value} onChange={onChange} error={error} />;
}

const ALL_DETECTIONS = "__all__";

const ALPR_STATUS_LABELS: Record<AlprListStatus, string> = {
  blacklist: "Blacklisted vehicles",
  whitelist: "Whitelisted vehicles",
  none: "Registered, not listed",
};

function AlprCondition({
  value,
  onChange,
  error,
}: {
  value: AlertMatch;
  onChange: (next: AlertMatch) => void;
  error?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Condition</Label>
      <Select
        value={value.list_status ?? ALL_DETECTIONS}
        onValueChange={(next) => {
          if (next === ALL_DETECTIONS) {
            onChange({});
          } else {
            onChange({ list_status: next as AlprListStatus });
          }
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_DETECTIONS}>
            All detections (incl. unregistered)
          </SelectItem>
          {(Object.keys(ALPR_STATUS_LABELS) as AlprListStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {ALPR_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-xs">
        List-status conditions only match plates with a live registration — use
        “All detections” to also alert on unregistered plates.
      </p>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

function SpeedCondition({
  value,
  onChange,
  error,
}: {
  value: AlertMatch;
  onChange: (next: AlertMatch) => void;
  error?: string | null;
}) {
  const mode: "all" | "threshold" =
    value.min_overspeed == null ? "all" : "threshold";
  const [thresholdInput, setThresholdInput] = useState(
    value.min_overspeed != null ? String(value.min_overspeed) : "",
  );

  // Sync the local input when the controlled `value` changes externally
  // (e.g. dialog re-initializing from an existing policy). Adjusting state
  // during render — React's endorsed alternative to an effect. `Object.is`
  // matches the previous effect-dependency semantics so the NaN sentinel
  // emitted on mode switch does not cause a render loop.
  const [prevOverspeed, setPrevOverspeed] = useState(value.min_overspeed);
  if (!Object.is(value.min_overspeed, prevOverspeed)) {
    setPrevOverspeed(value.min_overspeed);
    if (value.min_overspeed != null) {
      setThresholdInput(String(value.min_overspeed));
    }
  }

  function handleModeChange(next: "all" | "threshold") {
    if (next === "all") {
      onChange({});
    } else {
      const parsed = Number(thresholdInput);
      // NaN is used as a sentinel for "threshold mode selected, but no valid
      // number entered yet" so the parent's validation can tell this apart
      // from "all violations" (min_overspeed === undefined). `mode` above is
      // still derived correctly since NaN !== null.
      onChange({
        min_overspeed:
          thresholdInput !== "" && !Number.isNaN(parsed) ? parsed : NaN,
      });
    }
  }

  function handleThresholdChange(raw: string) {
    setThresholdInput(raw);
    const parsed = Number(raw);
    if (raw.trim() === "" || Number.isNaN(parsed)) {
      onChange({ min_overspeed: NaN });
      return;
    }
    onChange({ min_overspeed: parsed });
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Condition</Label>
      <div className="bg-muted flex rounded-lg p-1">
        {(["all", "threshold"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              mode === m
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "all" ? "All violations" : "Overspeed threshold"}
          </button>
        ))}
      </div>
      {mode === "threshold" && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step="1"
            className="w-32"
            value={thresholdInput}
            onChange={(e) => handleThresholdChange(e.target.value)}
          />
          <span className="text-muted-foreground text-sm">km/h and above</span>
        </div>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
