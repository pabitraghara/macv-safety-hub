"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimezoneCommandList } from "@/components/common/TimezoneCombobox";
import { useTimezone } from "@/contexts/TimezoneContext";
import {
  formatOffset,
  getTimezoneOffsetMinutes,
  timezoneCityLabel,
} from "@/lib/timezones";

/**
 * Global timezone picker (lives in the dashboard header). All pages read the
 * selected zone via useTimezone() — there are no per-page timezone selects.
 */
export function TimezoneSelector() {
  const { timezone, setTimezone, deviceTimezone } = useTimezone();
  const [open, setOpen] = useState(false);

  // The timezone comes from localStorage/device detection, which the server
  // can't know — render a neutral label until mounted to avoid a hydration
  // mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const triggerLabel = mounted
    ? `${timezoneCityLabel(timezone)} · ${formatOffset(
        getTimezoneOffsetMinutes(timezone),
      )}`
    : "Timezone";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-8 gap-1.5 font-normal"
          title={mounted ? `Times shown in ${timezone}` : undefined}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      {/* sideOffset clears the h-16 header so the panel opens below the
          navbar instead of overlapping its bottom edge (which blends into
          the header in dark mode and reads as "covered"). */}
      <PopoverContent className="w-[320px] p-0" align="end" sideOffset={18}>
        <TimezoneCommandList
          value={timezone}
          deviceTimezone={deviceTimezone}
          onSelect={(tz) => {
            setTimezone(tz);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
