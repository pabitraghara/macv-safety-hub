"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface CooldownFieldProps {
  value: number | null; // seconds; null => off
  onChange: (next: number | null) => void;
  error?: string | null;
}

const DEFAULT_MINUTES = 5;

export function CooldownField({ value, onChange, error }: CooldownFieldProps) {
  const enabled = value != null;
  // Minutes shown in the input; initialized from `value` and otherwise kept
  // as local UI state so partial typing doesn't get clobbered by rounding.
  const [minutes, setMinutes] = useState<string>(
    value != null ? String(value / 60) : String(DEFAULT_MINUTES),
  );

  // Sync the local input when the controlled `value` changes externally
  // (e.g. dialog re-initializing from an existing policy). Adjusting state
  // during render — React's endorsed alternative to an effect.
  const [prevValue, setPrevValue] = useState<number | null>(value);
  if (!Object.is(value, prevValue)) {
    setPrevValue(value);
    if (value != null) {
      setMinutes(String(value / 60));
    }
  }

  function handleToggle(next: boolean) {
    if (!next) {
      onChange(null);
      return;
    }
    const startMinutes =
      Number(minutes) > 0 ? Number(minutes) : DEFAULT_MINUTES;
    setMinutes(String(startMinutes));
    onChange(Math.round(startMinutes * 60));
  }

  function handleMinutesChange(raw: string) {
    setMinutes(raw);
    const parsed = Number(raw);
    if (raw.trim() === "" || Number.isNaN(parsed) || parsed < 0) {
      return;
    }
    onChange(Math.round(parsed * 60));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="cooldown-toggle" className="text-sm font-medium">
          Cooldown between repeat alerts
        </Label>
        <Switch
          id="cooldown-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Suppress repeat alerts for the same entity within this window.
      </p>
      {enabled && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step="1"
            className="w-28"
            value={minutes}
            onChange={(e) => handleMinutesChange(e.target.value)}
          />
          <span className="text-muted-foreground text-sm">minutes</span>
        </div>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
