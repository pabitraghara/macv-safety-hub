import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Info,
  ShieldAlert,
} from "lucide-react";

import type { Severity } from "@/lib/safety-analysis";

/** Filled badge/tile treatment, used when a severity has at least one issue. */
export const SEVERITY_BADGE_CLASS: Record<Severity, string> = {
  Critical:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  High: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
  Medium:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
  Low: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  Unknown:
    "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

/** Foreground-only treatment, for icons and inline labels. */
export const SEVERITY_TEXT_CLASS: Record<Severity, string> = {
  Critical: "text-red-600 dark:text-red-400",
  High: "text-orange-600 dark:text-orange-400",
  Medium: "text-yellow-600 dark:text-yellow-400",
  Low: "text-blue-600 dark:text-blue-400",
  Unknown: "text-gray-600 dark:text-gray-400",
};

/** Solid background, for the small severity dots and rules. */
export const SEVERITY_DOT_CLASS: Record<Severity, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
  Low: "bg-blue-500",
  Unknown: "bg-gray-400",
};

const SEVERITY_ICONS: Record<Severity, typeof AlertCircle> = {
  Critical: AlertOctagon,
  High: AlertTriangle,
  Medium: AlertCircle,
  Low: Info,
  Unknown: ShieldAlert,
};

export function SeverityIcon({
  severity,
  className = "h-4 w-4",
}: {
  severity: Severity;
  className?: string;
}) {
  const Icon = SEVERITY_ICONS[severity];
  return <Icon className={className} />;
}
