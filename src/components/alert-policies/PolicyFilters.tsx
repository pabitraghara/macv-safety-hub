"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AlertTriggerType } from "@/api/alert-policies";
import type { Site } from "@/api/sites/types";

export interface PolicyFilterState {
  site: string; // "all" | "org" | <siteId>
  trigger: string; // "all" | AlertTriggerType
  active: string; // "all" | "active" | "inactive"
}

export interface PolicyFiltersProps {
  sites: Site[];
  availableTriggers: AlertTriggerType[];
  value: PolicyFilterState;
  onChange: (next: PolicyFilterState) => void;
}

const TRIGGER_LABELS: Record<AlertTriggerType, string> = {
  safety: "Safety observation",
  speed_violation: "Speed violation",
  alpr: "ALPR",
};

export function PolicyFilters({
  sites,
  availableTriggers,
  value,
  onChange,
}: PolicyFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={value.site}
        onValueChange={(site) => onChange({ ...value, site })}
      >
        <SelectTrigger className="h-8 w-36 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sites</SelectItem>
          <SelectItem value="org">Org-wide</SelectItem>
          {sites.map((site) => (
            <SelectItem key={site.id} value={site.id}>
              {site.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.trigger}
        onValueChange={(trigger) => onChange({ ...value, trigger })}
      >
        <SelectTrigger className="h-8 w-40 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All triggers</SelectItem>
          {availableTriggers.map((trigger) => (
            <SelectItem key={trigger} value={trigger}>
              {TRIGGER_LABELS[trigger]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.active}
        onValueChange={(active) => onChange({ ...value, active })}
      >
        <SelectTrigger className="h-8 w-28 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
