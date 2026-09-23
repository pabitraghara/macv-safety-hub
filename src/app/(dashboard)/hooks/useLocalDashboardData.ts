"use client";

import { useEffect, useMemo, useState } from "react";

import { loadViolations, type Violation } from "@/lib/violations";
import {
  categorizeViolation,
  CATEGORY_LABELS,
} from "@/lib/violation-categories";
import { SEVERITY_ORDER, type Severity } from "@/lib/safety-analysis";
import type {
  DailyViolationTypeEntry,
  ObservationStats,
} from "@/api/observations/types";

/**
 * Dashboard aggregates derived from the local clip index.
 *
 * The chart components were written against the backend's pre-aggregated
 * `/observations/stats` response. There is no backend on this deployment, so
 * that same `ObservationStats` shape is computed in the browser instead and
 * every chart component is reused unchanged.
 *
 * Two deliberate differences from the server-backed version:
 *
 * - A "observation" is one clip. Severity counts use the clip's most severe
 *   issue, matching the badge shown in the violations list. `by_violation_type`
 *   counts individual issues, since that is what a violation type is.
 * - The time window is anchored to the newest footage rather than to today.
 *   The clips are a fixed archive, so anchoring to `now` empties every chart
 *   the moment the footage ages past the selected range.
 */

/** Recordings charted individually before the rest are grouped. */
const SESSION_SLICES = 7;

export interface LocalDashboardData {
  loading: boolean;
  error: string | null;
  stats: ObservationStats | null;
  dailyByViolationType: DailyViolationTypeEntry[];
  obsSeverities: Record<string, number>;
  /** Total issues across the window — clips can report several each. */
  totalIssues: number;
  /** The date span actually charted, e.g. "Jul 2 – Jul 16, 2026". */
  windowLabel: string;
  violations: Violation[];
}

function toDateKey(date: Date): string {
  // Local-time YYYY-MM-DD; the charts label these back with the same offset.
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatRange(from: Date, to: Date): string {
  const sameYear = from.getFullYear() === to.getFullYear();
  const start = from.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const end = to.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return start === end ? end : `${start} – ${end}`;
}

/**
 * Top `limit` entries, descending. Anything past the cut is summed into a
 * single trailing bucket so the chart still totals the full population —
 * a donut whose centre disagrees with the headline count reads as a bug.
 */
function topCounts(
  counts: Map<string, number>,
  limit: number,
  restLabel = "Other",
): { label: string; count: number }[] {
  const sorted = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  if (sorted.length <= limit) return sorted;

  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  const restCount = rest.reduce((sum, entry) => sum + entry.count, 0);
  return [...top, { label: `${restLabel} (${rest.length})`, count: restCount }];
}

function aggregate(
  violations: Violation[],
  days: number,
): Omit<LocalDashboardData, "loading" | "error" | "violations"> {
  const dated = violations.filter((v) => v.capturedAt !== null);
  if (dated.length === 0) {
    return {
      stats: null,
      dailyByViolationType: [],
      obsSeverities: {},
      totalIssues: 0,
      windowLabel: "No dated footage",
    };
  }

  // Anchor the window to the newest clip, not to today — see the note above.
  const latest = Math.max(...dated.map((v) => v.capturedAt!.getTime()));
  const earliestAllowed = latest - days * 24 * 60 * 60 * 1000;
  const inWindow = dated.filter(
    (v) => v.capturedAt!.getTime() >= earliestAllowed,
  );

  const severityCounts = new Map<Severity, number>();
  const categoryCounts = new Map<string, number>();
  const sessionCounts = new Map<string, number>();
  const dailyTotals = new Map<string, { total: number; critical: number }>();
  const dailyTypeCounts = new Map<string, Map<string, number>>();
  let totalIssues = 0;
  let needsReview = 0;

  for (const violation of inWindow) {
    const severity = violation.analysis.maxSeverity;
    severityCounts.set(severity, (severityCounts.get(severity) ?? 0) + 1);
    if (severity === "Critical" || severity === "High") needsReview += 1;

    sessionCounts.set(
      violation.sessionLabel,
      (sessionCounts.get(violation.sessionLabel) ?? 0) + 1,
    );

    const dateKey = toDateKey(violation.capturedAt!);
    const day = dailyTotals.get(dateKey) ?? { total: 0, critical: 0 };
    dailyTotals.set(dateKey, {
      total: day.total + 1,
      critical: day.critical + (severity === "Critical" ? 1 : 0),
    });

    const perDay = dailyTypeCounts.get(dateKey) ?? new Map<string, number>();
    for (const issue of violation.analysis.issues) {
      totalIssues += 1;
      const category = categorizeViolation(issue.name);
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      perDay.set(category, (perDay.get(category) ?? 0) + 1);
    }
    dailyTypeCounts.set(dateKey, perDay);
  }

  // Categories are a bounded list, so every one of them is charted. Rolling
  // any up would produce a second "Other" bar beside the uncategorised one.
  const topTypes = topCounts(categoryCounts, CATEGORY_LABELS.length);
  const topTypeNames = new Set(topTypes.map((t) => t.label));

  const stats: ObservationStats = {
    total: inWindow.length,
    open: needsReview,
    escalated: 0,
    critical: severityCounts.get("Critical") ?? 0,
    by_violation_type: topTypes.map((t) => ({
      name: t.label,
      code: t.label,
      count: t.count,
    })),
    by_camera: topCounts(sessionCounts, SESSION_SLICES, "Other recordings"),
    by_severity: SEVERITY_ORDER.map((severity) => ({
      severity,
      count: severityCounts.get(severity) ?? 0,
    })),
    daily_counts: [...dailyTotals.entries()]
      .map(([date, { total, critical }]) => ({
        date,
        total,
        // Every clip is awaiting review; there is no triage backend here.
        open: total,
        critical,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };

  // The trend chart draws one line per violation type; limiting it to the top
  // types keeps it readable and matches the bar chart beside it.
  const dailyByViolationType: DailyViolationTypeEntry[] = [];
  for (const [date, perDay] of dailyTypeCounts) {
    for (const [name, count] of perDay) {
      if (!topTypeNames.has(name)) continue;
      dailyByViolationType.push({
        date,
        violation_type_code: name,
        violation_type_name: name,
        count,
      });
    }
  }
  dailyByViolationType.sort((a, b) => a.date.localeCompare(b.date));

  const obsSeverities = [...severityCounts.entries()].reduce<
    Record<string, number>
  >(
    (acc, [severity, count]) => ({
      ...acc,
      [severity.toLowerCase()]: count,
    }),
    {},
  );

  const windowStart = inWindow.reduce(
    (min, v) => Math.min(min, v.capturedAt!.getTime()),
    latest,
  );

  return {
    stats,
    dailyByViolationType,
    obsSeverities,
    totalIssues,
    windowLabel: formatRange(new Date(windowStart), new Date(latest)),
  };
}

export function useLocalDashboardData(days: number): LocalDashboardData {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    loadViolations(controller.signal)
      .then(setViolations)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load observations.json", err);
        setError("Could not load violation data.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const aggregates = useMemo(
    () => aggregate(violations, days),
    [violations, days],
  );

  return { loading, error, violations, ...aggregates };
}
