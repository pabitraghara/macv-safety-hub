/**
 * Timezone utilities — single source of truth for timezone handling.
 *
 * Uses the runtime's full IANA database (Intl.supportedValuesOf) rather than
 * a hand-maintained city list, and Intl APIs for validation and offsets so
 * DST is always respected.
 */

/** Legacy/alias IANA names mapped to their canonical form. */
export const TIMEZONE_ALIASES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Rangoon": "Asia/Yangon",
  "Europe/Kiev": "Europe/Kyiv",
};

export const normalizeTimezone = (tz: string): string => {
  return TIMEZONE_ALIASES[tz] ?? tz;
};

/** True if the runtime's Intl implementation accepts the zone. */
export function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The browser/device timezone. */
export function getDeviceTimezone(): string {
  return normalizeTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/** Full IANA zone list from the runtime, with a safe fallback. */
export function getSupportedTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone").map(normalizeTimezone);
  }
  return [getDeviceTimezone(), "UTC"];
}

/** Current UTC offset of a zone in minutes (DST-aware for the given date). */
export function getTimezoneOffsetMinutes(
  tz: string,
  date: Date = new Date(),
): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  // "GMT+05:30", "GMT-7", or "GMT" for UTC
  const match = formatted?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

/** "GMT+05:30" style label for an offset in minutes. */
export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const minutes = String(abs % 60).padStart(2, "0");
  return `GMT${sign}${hours}:${minutes}`;
}

/** "Asia/Kolkata" → "Kolkata"; "America/Argentina/Buenos_Aires" → "Buenos Aires". */
export function timezoneCityLabel(tz: string): string {
  const segments = tz.split("/");
  return (segments[segments.length - 1] ?? tz).replace(/_/g, " ");
}

export interface TimezoneOption {
  value: string;
  city: string;
  offsetMinutes: number;
  offsetLabel: string;
}

/**
 * All supported zones as display options, sorted by offset then name.
 * Offsets are computed for the given date so DST is reflected.
 */
export function getTimezoneOptions(date: Date = new Date()): TimezoneOption[] {
  return getSupportedTimezones()
    .map((tz) => {
      const offsetMinutes = getTimezoneOffsetMinutes(tz, date);
      return {
        value: tz,
        city: timezoneCityLabel(tz),
        offsetMinutes,
        offsetLabel: formatOffset(offsetMinutes),
      };
    })
    .sort(
      (a, b) =>
        a.offsetMinutes - b.offsetMinutes || a.value.localeCompare(b.value),
    );
}
