"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { resolveHomeTarget } from "@/lib/modules";
import { useCurrentUser } from "@/contexts/UserContext";
import { useDashboardData } from "./hooks/useDashboardData";
import { HighlightedIncidents } from "./components/HighlightedIncidents";
import {
  ViolationTypeChart,
  CameraChart,
  ViolationTrendChart,
} from "./components/ObservationCharts";
import { StatBars } from "./components/StatBars";
import { SeverityStatusBreakdown } from "./components/SeverityStatusBreakdown";

import { DEFAULT_RANGE_DAYS, TIME_RANGES } from "./lib/time-window";

/**
 * Homepage router: applies the module homepage rule before rendering.
 *
 * - Vehicles-only orgs are redirected to /vehicles/overview.
 * - Dual-module orgs redirect to the last-visited module (vehicles) or stay
 *   on the safety dashboard (default).
 * - Safety-only and no-module orgs render the safety dashboard unchanged.
 *
 * The decision waits for scopes to resolve (permissions non-empty) so a
 * vehicles-only org never flashes the safety dashboard before redirecting.
 * Every usable account carries at least core scopes, so a non-empty set is
 * the reliable "scopes loaded" signal.
 */
export default function HomePage() {
  const { permissions, enabledModules, isLoading } = useAuth();
  const router = useRouter();

  // Entitlement (GATE 1) has resolved once enabledModules is non-empty (every
  // org defaults to at least ["safety"]); permissions (GATE 2) drive the
  // vehicles landing route. An empty set is treated as "still loading".
  const modulesResolved =
    !isLoading && enabledModules.size > 0 && permissions.size > 0;
  const redirectTarget = modulesResolved
    ? resolveHomeTarget(enabledModules, permissions)
    : null;

  useEffect(() => {
    if (redirectTarget) router.replace(redirectTarget);
  }, [redirectTarget, router]);

  // Hold the dashboard until entitlement resolves, and while a redirect is
  // pending, so a vehicles-only org never flashes the safety dashboard.
  if (!modulesResolved || redirectTarget) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <SafetyDashboard />;
}

function SafetyDashboard() {
  const { profile } = useCurrentUser();
  const [days, setDays] = useState<number>(DEFAULT_RANGE_DAYS);

  const {
    loading,
    stats,
    incidents,
    dailyByViolationType,
    obsSeverities,
    incStatuses,
  } = useDashboardData(days);

  const firstName = profile?.first_name || "there";

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-1 flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">
              Welcome back, {firstName}
            </h1>
            <p className="text-muted-foreground text-sm">
              {format(new Date(), "EEEE, MMM d, yyyy")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Time range toggle */}
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

        {/* KPI Cards */}
        {/* <KpiCards
          stats={stats}
          loading={loading}
          openObservations={openObservations}
          escalatedObservations={escalatedObservations}
          openIncidents={openIncidents}
          criticalIncidents={criticalIncidents}
        /> */}

        {/* Recent Observations Carousel */}
        <HighlightedIncidents />

        {/* Charts + Stat Bars */}
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-4">
            <ViolationTypeChart loading={loading} stats={stats} days={days} />
            <CameraChart loading={loading} stats={stats} days={days} />
          </div>

          <StatBars loading={loading} stats={stats} days={days} />
        </div>

        {/* Recent Items */}
        {/* <RecentItems
          loading={loading}
          recentObservations={recentObservations}
          recentIncidents={recentIncidents}
        /> */}

        {/* Violation Trends Line Chart */}
        <ViolationTrendChart
          loading={loading}
          data={dailyByViolationType}
          days={days}
        />

        {/* Severity & Status Breakdown */}
        <SeverityStatusBreakdown
          loading={loading}
          stats={stats}
          incidents={incidents}
          obsSeverities={obsSeverities}
          incStatuses={incStatuses}
        />
      </div>
    </div>
  );
}
