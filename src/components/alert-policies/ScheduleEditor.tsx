"use client";

import { Plus, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type {
  AlertSchedule,
  QuietHours,
  ScheduleWindow,
  Weekday,
} from "@/api/alert-policies";

export interface ScheduleEditorProps {
  value: AlertSchedule | null; // null => always active (disabled)
  onChange: (next: AlertSchedule | null) => void;
}

const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function timezoneOptions(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [browserTimezone()];
  }
}

export function ScheduleEditor({ value, onChange }: ScheduleEditorProps) {
  const enabled = value !== null;

  function handleToggle(next: boolean) {
    if (!next) {
      onChange(null);
      return;
    }
    onChange({ timezone: browserTimezone(), windows: [], quiet_hours: [] });
  }

  function updateSchedule(patch: Partial<AlertSchedule>) {
    if (!value) return;
    onChange({ ...value, ...patch });
  }

  function addWindow() {
    if (!value) return;
    const next: ScheduleWindow = { days: [], start: "09:00", end: "17:00" };
    updateSchedule({ windows: [...value.windows, next] });
  }

  function updateWindow(index: number, patch: Partial<ScheduleWindow>) {
    if (!value) return;
    const nextWindows = value.windows.map((w, i) =>
      i === index ? { ...w, ...patch } : w,
    );
    updateSchedule({ windows: nextWindows });
  }

  function removeWindow(index: number) {
    if (!value) return;
    updateSchedule({ windows: value.windows.filter((_, i) => i !== index) });
  }

  function toggleWindowDay(index: number, day: Weekday) {
    if (!value) return;
    const w = value.windows[index];
    const hasDay = w.days.includes(day);
    const nextDays = hasDay
      ? w.days.filter((d) => d !== day)
      : [...w.days, day];
    updateWindow(index, { days: nextDays });
  }

  function addQuietHours() {
    if (!value) return;
    const next: QuietHours = { start: "22:00", end: "06:00" };
    updateSchedule({ quiet_hours: [...value.quiet_hours, next] });
  }

  function updateQuietHours(index: number, patch: Partial<QuietHours>) {
    if (!value) return;
    const nextQuietHours = value.quiet_hours.map((q, i) =>
      i === index ? { ...q, ...patch } : q,
    );
    updateSchedule({ quiet_hours: nextQuietHours });
  }

  function removeQuietHours(index: number) {
    if (!value) return;
    updateSchedule({
      quiet_hours: value.quiet_hours.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="schedule-toggle" className="text-sm font-medium">
          Restrict to a schedule
        </Label>
        <Switch
          id="schedule-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </div>

      {enabled && value && (
        <div className="space-y-4 rounded-lg border p-3">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs tracking-wide uppercase">
              Timezone
            </Label>
            <Select
              value={value.timezone}
              onValueChange={(tz) => updateSchedule({ timezone: tz })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {timezoneOptions().map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs tracking-wide uppercase">
                Active windows
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addWindow}
              >
                <Plus className="h-3.5 w-3.5" />
                Add window
              </Button>
            </div>
            {value.windows.length === 0 && (
              <p className="text-muted-foreground text-xs">
                No windows set — active all days (subject to quiet hours).
              </p>
            )}
            <div className="space-y-2">
              {value.windows.map((w, i) => (
                <div key={i} className="space-y-2 rounded-md border p-2.5">
                  <div className="flex flex-wrap gap-1">
                    {WEEKDAYS.map((day) => {
                      const active = w.days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleWindowDay(i, day)}
                          className={cn(
                            "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {WEEKDAY_LABELS[day]}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={w.start}
                      onChange={(e) =>
                        updateWindow(i, { start: e.target.value })
                      }
                      className="w-32"
                    />
                    <span className="text-muted-foreground text-xs">to</span>
                    <Input
                      type="time"
                      value={w.end}
                      onChange={(e) => updateWindow(i, { end: e.target.value })}
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-auto"
                      onClick={() => removeWindow(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {w.days.length === 0 && (
                    <p className="text-destructive text-xs">
                      Select at least one day.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs tracking-wide uppercase">
                Quiet hours
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addQuietHours}
              >
                <Plus className="h-3.5 w-3.5" />
                Add quiet hours
              </Button>
            </div>
            {value.quiet_hours.length === 0 && (
              <p className="text-muted-foreground text-xs">
                No quiet hours set.
              </p>
            )}
            <div className="space-y-2">
              {value.quiet_hours.map((q, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md border p-2.5"
                >
                  <Input
                    type="time"
                    value={q.start}
                    onChange={(e) =>
                      updateQuietHours(i, { start: e.target.value })
                    }
                    className="w-32"
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input
                    type="time"
                    value={q.end}
                    onChange={(e) =>
                      updateQuietHours(i, { end: e.target.value })
                    }
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    onClick={() => removeQuietHours(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
