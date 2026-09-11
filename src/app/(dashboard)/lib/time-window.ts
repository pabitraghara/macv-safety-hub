/**
 * Dashboard time-window options and labels.
 *
 * The window is applied server-side: `days` is forwarded to the observation
 * stats endpoints, which cap it at 366 days. There is deliberately no
 * "all time" option — an unbounded aggregate scan must not be reachable from
 * the homepage.
 */

export interface TimeRange {
  days: number;
  label: string;
}

export const TIME_RANGES: readonly TimeRange[] = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 365, label: "1y" },
];

export const DEFAULT_RANGE_DAYS = 30;

/** Human-readable window label — "Last 365 days" reads worse than "Last year". */
export function formatWindowLabel(days: number): string {
  if (days >= 365) return "Last year";
  if (days % 30 === 0) {
    const months = days / 30;
    return months === 1 ? "Last month" : `Last ${months} months`;
  }
  return `Last ${days} days`;
}
