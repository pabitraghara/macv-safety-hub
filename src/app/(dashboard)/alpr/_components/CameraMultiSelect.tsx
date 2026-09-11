"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CameraFilterOption } from "../_hooks/alprFilters";

interface CameraMultiSelectProps {
  options: CameraFilterOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function CameraMultiSelect({
  options,
  selectedIds,
  onChange,
}: CameraMultiSelectProps) {
  const label =
    selectedIds.length === 0
      ? "All cameras"
      : selectedIds.length === 1
        ? (options.find((o) => o.id === selectedIds[0])?.name ?? "1 camera")
        : `${selectedIds.length} cameras`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          {label}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {selectedIds.length > 0 && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground mb-1 block text-xs underline"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        )}
        <div className="max-h-64 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option.id}
              className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
            >
              <Checkbox
                checked={selectedIds.includes(option.id)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? [...selectedIds, option.id]
                      : selectedIds.filter((id) => id !== option.id),
                  )
                }
              />
              {option.name}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
