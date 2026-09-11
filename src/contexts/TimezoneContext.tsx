"use client";

import {
  getDeviceTimezone,
  isValidTimezone,
  normalizeTimezone,
} from "@/lib/timezones";
import { createContext, useContext, ReactNode, useState } from "react";

interface TimezoneContextProps {
  /** The active IANA timezone used for all API params and date display. */
  timezone: string;
  setTimezone: (timezone: string) => void;
  /** The browser/device timezone, for the "use device timezone" affordance. */
  deviceTimezone: string;
}

const TimezoneContext = createContext<TimezoneContextProps | undefined>(
  undefined,
);

const TIMEZONE_STORAGE_KEY = "user_timezone";
const SSR_FALLBACK_TIMEZONE = "UTC";

function readInitialTimezone(): string {
  if (typeof window === "undefined") return SSR_FALLBACK_TIMEZONE;
  try {
    const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    if (stored) {
      const normalized = normalizeTimezone(stored);
      if (isValidTimezone(normalized)) return normalized;
    }
  } catch {
    // localStorage unavailable (private browsing, quota exceeded, etc.)
  }
  return getDeviceTimezone();
}

export const TimezoneProvider = ({ children }: { children: ReactNode }) => {
  const [timezone, setTimezoneState] = useState<string>(readInitialTimezone);

  const handleSetTimezone = (newTimezone: string) => {
    const normalized = normalizeTimezone(newTimezone);
    if (!isValidTimezone(normalized)) return;
    setTimezoneState(normalized);
    try {
      localStorage.setItem(TIMEZONE_STORAGE_KEY, normalized);
    } catch {
      // localStorage unavailable
    }
  };

  return (
    <TimezoneContext.Provider
      value={{
        timezone,
        setTimezone: handleSetTimezone,
        deviceTimezone:
          typeof window === "undefined"
            ? SSR_FALLBACK_TIMEZONE
            : getDeviceTimezone(),
      }}
    >
      {children}
    </TimezoneContext.Provider>
  );
};

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error("useTimezone must be used within a TimezoneProvider");
  }
  return context;
}
