import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { ObservationStats } from "@/api/observations/types";
import { DEFAULT_RANGE_DAYS, formatWindowLabel } from "../lib/time-window";

function buildMiniChartFromDaily(
  dailyCounts: {
    date: string;
    total: number;
    open: number;
    critical: number;
  }[],
  field: "total" | "open" | "critical",
  buckets = 20,
  days = DEFAULT_RANGE_DAYS,
  // Window end. Defaults to now; pass the newest data point when the series is
  // a fixed archive, otherwise every bucket falls outside the window and the
  // chart reads as empty.
  endMs?: number,
): number[] {
  if (dailyCounts.length === 0) return Array<number>(buckets).fill(0);

  // Map date string → value
  const byDate: Record<string, number> = {};
  for (const d of dailyCounts) {
    byDate[d.date] = d[field];
  }

  // Build window bucketed into `buckets` slots
  const now = endMs ?? Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;
  const bucketMs = windowMs / buckets;
  const counts = Array<number>(buckets).fill(0);

  for (const [dateStr, value] of Object.entries(byDate)) {
    const age = now - new Date(dateStr).getTime();
    if (age < 0 || age > windowMs) continue;
    const idx = Math.floor((windowMs - age) / bucketMs);
    counts[Math.min(idx, buckets - 1)] += value;
  }
  return counts;
}

function MiniBarChart({
  data,
  color = "bg-foreground",
}: {
  data: number[];
  color?: string;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-10 items-end gap-[2px]">
      {data.map((v, i) => (
        <div
          key={i}
          className={`w-full rounded-sm ${color} opacity-80`}
          style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function trendPercent(data: number[]): number {
  const mid = Math.floor(data.length / 2);
  const first = data.slice(0, mid).reduce((a, b) => a + b, 0) || 0;
  const second = data.slice(mid).reduce((a, b) => a + b, 0) || 0;
  if (first === 0) return second > 0 ? 100 : 0;
  return Math.round(((second - first) / first) * 100);
}

interface StatBarCardProps {
  label: string;
  total: number;
  subtitle: string;
  data: number[];
  loading: boolean;
  barColor?: string;
}

function StatBarCard({
  label,
  total,
  subtitle,
  data,
  loading,
  barColor = "bg-foreground",
}: StatBarCardProps) {
  const trend = trendPercent(data);
  const isUp = trend >= 0;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 px-4 py-3">
        {loading ? (
          <>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="flex w-1/2 flex-col items-end gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
          </>
        ) : (
          <>
            <div className="flex-1">
              <p className="text-muted-foreground text-xs font-medium">
                {label}
              </p>
              <p className="text-3xl font-bold tabular-nums">{total}</p>
              <p className="text-muted-foreground text-[11px]">{subtitle}</p>
            </div>
            <div className="flex w-1/2 flex-col items-end gap-3">
              <span
                className={`flex items-center gap-0.5 text-xs font-semibold ${
                  isUp ? "text-red-500" : "text-green-600"
                }`}
              >
                {isUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend)}%
              </span>
              <div className="w-full">
                <MiniBarChart data={data} color={barColor} />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function StatBars({
  loading,
  stats,
  days = DEFAULT_RANGE_DAYS,
  windowLabel,
}: {
  loading: boolean;
  stats: ObservationStats | null;
  days?: number;
  windowLabel?: string;
}) {
  const daily = stats?.daily_counts ?? [];

  // Anchor the sparklines to the newest day present, so a fixed archive still
  // renders; a live feed's newest day is today, leaving behaviour unchanged.
  const endMs = daily.length
    ? new Date(`${daily[daily.length - 1].date}T23:59:59`).getTime()
    : undefined;

  const obsChart = buildMiniChartFromDaily(daily, "total", 20, days, endMs);
  const openChart = buildMiniChartFromDaily(daily, "open", 20, days, endMs);
  const criticalChart = buildMiniChartFromDaily(
    daily,
    "critical",
    20,
    days,
    endMs,
  );

  const label = windowLabel ?? formatWindowLabel(days);

  return (
    <div className="flex flex-col gap-4">
      <StatBarCard
        label="All Observations"
        total={stats?.total ?? 0}
        subtitle={`${stats?.open ?? 0} need review · ${label}`}
        data={obsChart}
        loading={loading}
        barColor="bg-blue-500"
      />
      <StatBarCard
        label="Needs Review"
        total={stats?.open ?? 0}
        subtitle={`${stats?.escalated ?? 0} escalated · ${label}`}
        data={openChart}
        loading={loading}
        barColor="bg-foreground"
      />
      <StatBarCard
        label="Critical"
        total={stats?.critical ?? 0}
        subtitle={`Critical observations · ${label}`}
        data={criticalChart}
        loading={loading}
        barColor="bg-red-500"
      />
    </div>
  );
}
