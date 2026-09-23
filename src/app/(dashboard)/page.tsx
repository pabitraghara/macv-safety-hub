"use client";

import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Film, ShieldAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalDashboardData } from "./hooks/useLocalDashboardData";
import { HighlightedIncidents } from "./components/HighlightedIncidents";
import {
  ViolationTypeChart,
  CameraChart,
  ViolationTrendChart,
} from "./components/ObservationCharts";
import { StatBars } from "./components/StatBars";
import { SeverityBar } from "./components/SeverityBar";
import { severityBarColors, severityOrder } from "./components/helpers";
import { DEFAULT_RANGE_DAYS, TIME_RANGES } from "./lib/time-window";

/**
 * Safety overview for the uploaded clip archive.
 *
 * Every figure is derived in the browser from public/observations.json — see
 * useLocalDashboardData for how the aggregates are built and why the time
 * window is anchored to the newest footage rather than to today.
 */
export default function HomePage() {
  const [days, setDays] = useState<number>(DEFAULT_RANGE_DAYS);
  const {
    loading,
    error,
    stats,
    dailyByViolationType,
    obsSeverities,
    totalIssues,
    windowLabel,
    violations,
  } = useLocalDashboardData(days);

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-1 flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">Safety Overview</h1>
            <p className="text-muted-foreground text-sm">
              {format(new Date(), "EEEE, MMM d, yyyy")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Time range toggle, measured back from the newest clip */}
            <div className="bg-muted flex rounded-lg p-1">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.days}
                  onClick={() => setDays(range.days)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    days === range.days
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? (
          <Card className="border-destructive/50">
            <CardContent className="text-destructive text-center text-sm">
              {error}
            </CardContent>
          </Card>
        ) : (
          <>
            <SummaryCards
              loading={loading}
              clips={stats?.total ?? 0}
              issues={totalIssues}
              critical={stats?.critical ?? 0}
              windowLabel={windowLabel}
            />

            <HighlightedIncidents loading={loading} violations={violations} />

            {/* Charts + Stat Bars */}
            <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
              <div className="flex flex-col gap-4">
                <ViolationTypeChart
                  loading={loading}
                  stats={stats}
                  days={days}
                  title="Issues by Category"
                  windowLabel={windowLabel}
                />
                <CameraChart
                  loading={loading}
                  stats={stats}
                  days={days}
                  title="Clips by Recording"
                  emptyMessage="No recordings yet"
                  windowLabel={windowLabel}
                />
              </div>

              <StatBars
                loading={loading}
                stats={stats}
                days={days}
                windowLabel={windowLabel}
              />
            </div>

            {/* Violation Trends Line Chart */}
            <ViolationTrendChart
              loading={loading}
              data={dailyByViolationType}
              days={days}
              windowLabel={windowLabel}
            />

            {/* Severity Breakdown */}
            <SeverityBreakdown
              loading={loading}
              total={stats?.total ?? 0}
              obsSeverities={obsSeverities}
            />
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sublabel,
  icon,
  loading,
}: {
  label: string;
  value: number;
  sublabel: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 px-4 py-3">
        <div className="bg-muted text-muted-foreground rounded-lg p-2">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium">{label}</p>
          {loading ? (
            <Skeleton className="my-1 h-7 w-14" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">{value}</p>
          )}
          <p className="text-muted-foreground truncate text-[11px]">
            {sublabel}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCards({
  loading,
  clips,
  issues,
  critical,
  windowLabel,
}: {
  loading: boolean;
  clips: number;
  issues: number;
  critical: number;
  windowLabel: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SummaryCard
        loading={loading}
        label="Clips Reviewed"
        value={clips}
        sublabel={windowLabel}
        icon={<Film className="h-4 w-4" />}
      />
      <SummaryCard
        loading={loading}
        label="Issues Detected"
        value={issues}
        sublabel={
          clips > 0
            ? `${(issues / clips).toFixed(1)} per clip on average`
            : "No clips in range"
        }
        icon={<AlertTriangle className="h-4 w-4" />}
      />
      <SummaryCard
        loading={loading}
        label="Critical Clips"
        value={critical}
        sublabel={
          clips > 0
            ? `${Math.round((critical / clips) * 100)}% of clips in range`
            : "No clips in range"
        }
        icon={<ShieldAlert className="h-4 w-4" />}
      />
    </div>
  );
}

function SeverityBreakdown({
  loading,
  total,
  obsSeverities,
}: {
  loading: boolean;
  total: number;
  obsSeverities: Record<string, number>;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 px-4 py-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Clips by Severity</h2>
          <span className="text-muted-foreground text-xs">
            Highest severity issue in each clip
          </span>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : total === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No clips in this range
          </p>
        ) : (
          <div className="space-y-3">
            {severityOrder.map((severity) => (
              <SeverityBar
                key={severity}
                label={severity}
                count={obsSeverities[severity] ?? 0}
                total={total}
                color={severityBarColors[severity] ?? "bg-gray-500"}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
