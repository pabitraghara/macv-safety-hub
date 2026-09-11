"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getTimezoneOptions } from "@/lib/timezones";
import { cn } from "@/lib/utils";

/** Searchable command list over the runtime's full IANA timezone database. */
export function TimezoneCommandList({
  value,
  onSelect,
  deviceTimezone,
}: {
  value: string;
  onSelect: (timezone: string) => void;
  /** When set and different from value, offers a "use device timezone" shortcut. */
  deviceTimezone?: string;
}) {
  // DST-aware offsets, computed once per mount.
  const options = useMemo(() => getTimezoneOptions(), []);

  return (
    <Command>
      <CommandInput placeholder="Search timezone..." />
      {/* Cap to the popover's available viewport space so the list never
          gets clipped on short windows (3rem ≈ the search input row). */}
      <CommandList className="max-h-[min(320px,calc(var(--radix-popover-content-available-height,320px)-3rem))]">
        <CommandEmpty>No timezone found.</CommandEmpty>
        {deviceTimezone && deviceTimezone !== value && (
          <CommandGroup heading="Device">
            <CommandItem
              value={`device ${deviceTimezone}`}
              onSelect={() => onSelect(deviceTimezone)}
            >
              <Globe className="text-muted-foreground mr-2 h-4 w-4" />
              <span className="flex-1 truncate">
                Use device timezone
                <span className="text-muted-foreground ml-1.5 text-xs">
                  {deviceTimezone}
                </span>
              </span>
            </CommandItem>
          </CommandGroup>
        )}
        <CommandGroup>
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={`${option.value} ${option.city} ${option.offsetLabel}`}
              onSelect={() => onSelect(option.value)}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4 shrink-0",
                  option.value === value ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="flex-1 truncate">{option.value}</span>
              <span className="text-muted-foreground ml-2 shrink-0 text-xs tabular-nums">
                {option.offsetLabel}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

interface TimezoneComboboxProps {
  value: string;
  onValueChange: (timezone: string) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

/**
 * Form-field timezone picker (e.g. a site's timezone). For the global
 * display-timezone control in the header, see TimezoneSelector.
 */
export function TimezoneCombobox({
  value,
  onValueChange,
  disabled,
  id,
  placeholder = "Select a timezone",
}: TimezoneComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[280px] p-0"
        align="start"
      >
        <TimezoneCommandList
          value={value}
          onSelect={(tz) => {
            onValueChange(tz);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
