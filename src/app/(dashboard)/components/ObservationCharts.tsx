import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DailyViolationTypeEntry,
  ObservationStats,
} from "@/api/observations/types";
import { DEFAULT_RANGE_DAYS, formatWindowLabel } from "../lib/time-window";

const CHART_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-lime-500",
];

const DONUT_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
  "#d946ef",
  "#84cc16",
];

// ─── Violation Type Bar Chart ────────────────────────────────────────────────

export function ViolationTypeChart({
  loading,
  stats,
  days = DEFAULT_RANGE_DAYS,
}: {
  loading: boolean;
  stats: ObservationStats | null;
  days?: number;
}) {
  const rows = stats?.by_violation_type ?? [];
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Observations by Violation Type
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          {formatWindowLabel(days)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center gap-2 px-4 pb-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No violation data yet</p>
        ) : (
          <div className="space-y-2.5">
            {rows.map((row, i) => (
              <div key={row.code} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground/80 max-w-[70%] truncate font-medium">
                    {row.name}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {row.count}
                  </span>
                </div>
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full ${CHART_COLORS[i % CHART_COLORS.length]} transition-all`}
                    style={{ width: `${(row.count / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Camera / Site Donut Chart ───────────────────────────────────────────────

function DonutChart({
  data,
  size = 100,
}: {
  data: { label: string; count: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const slices = data.map((d, i) => {
    const pct = total > 0 ? d.count / total : 0;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const precedingCount = data
      .slice(0, i)
      .reduce((sum, p) => sum + p.count, 0);
    const offset = total > 0 ? (precedingCount / total) * circumference : 0;
    return { ...d, dash, gap, offset };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={14}
        className="text-muted/40"
      />
      {slices.map((s, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={14}
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset + circumference / 4}
          strokeLinecap="butt"
        />
      ))}
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-foreground text-lg font-bold"
        fontSize={16}
        fontWeight={700}
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-muted-foreground"
        fontSize={8}
      >
        total
      </text>
    </svg>
  );
}

export function CameraChart({
  loading,
  stats,
  days = DEFAULT_RANGE_DAYS,
}: {
  loading: boolean;
  stats: ObservationStats | null;
  days?: number;
}) {
  const rows = stats?.by_camera ?? [];
  const colored = rows.map((r, i) => ({
    ...r,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
    bgColor: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Observations by Camera</CardTitle>
        <p className="text-muted-foreground text-xs">
          {formatWindowLabel(days)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center px-4 pb-4">
        {loading ? (
          <div className="flex gap-4">
            <Skeleton className="h-[100px] w-[100px] rounded-full" />
            <div className="flex-1 space-y-2 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No camera data yet</p>
        ) : (
          <div className="flex items-center gap-5">
            <div className="shrink-0">
              <DonutChart data={colored} size={110} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
              {colored.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${row.bgColor}`}
                  />
                  <span className="text-foreground/80 min-w-0 flex-1 truncate">
                    {row.label}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Violation Trend Line Chart ─────────────────────────────────────────────

const LINE_COLORS = DONUT_COLORS;

interface Series {
  code: string;
  name: string;
  color: string;
  points: number[]; // count per date bucket
}

function buildSeries(data: DailyViolationTypeEntry[]): {
  series: Series[];
  dates: string[];
} {
  if (data.length === 0) return { series: [], dates: [] };

  // Collect all unique dates sorted ascending
  const dateSet = new Set<string>();
  for (const d of data) dateSet.add(d.date);
  const dates = [...dateSet].sort();

  // Build date→index map
  const dateIdx = new Map<string, number>();
  dates.forEach((d, i) => dateIdx.set(d, i));

  // Group by violation type
  const byType = new Map<string, { name: string; counts: number[] }>();
  for (const d of data) {
    let entry = byType.get(d.violation_type_code);
    if (!entry) {
      entry = {
        name: d.violation_type_name,
        counts: new Array(dates.length).fill(0),
      };
      byType.set(d.violation_type_code, entry);
    }
    const idx = dateIdx.get(d.date);
    if (idx !== undefined) entry.counts[idx] = d.count;
  }

  const series: Series[] = [];
  let i = 0;
  for (const [code, { name, counts }] of byType) {
    series.push({
      code,
      name,
      color: LINE_COLORS[i % LINE_COLORS.length],
      points: counts,
    });
    i++;
  }

  return { series, dates };
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Above this many daily points, per-point dot markers are dropped. */
const DENSE_SERIES_THRESHOLD = 45;

function LineChart({ series, dates }: { series: Series[]; dates: string[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxY = useMemo(
    () => Math.max(...series.flatMap((s) => s.points), 1),
    [series],
  );

  // Chart area dimensions inside the SVG viewBox
  const padLeft = 36;
  const padRight = 12;
  const padTop = 8;
  const padBottom = 24;
  const viewW = 600;
  const viewH = 200;
  const chartW = viewW - padLeft - padRight;
  const chartH = viewH - padTop - padBottom;

  const xStep = dates.length > 1 ? chartW / (dates.length - 1) : 0;

  function toX(i: number) {
    return padLeft + i * xStep;
  }
  function toY(v: number) {
    return padTop + chartH - (v / maxY) * chartH;
  }

  // Y-axis ticks (4 lines)
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let i = 0; i <= 4; i++) {
      ticks.push(Math.round((maxY * i) / 4));
    }
    return ticks;
  }, [maxY]);

  // X-axis labels — show ~5-6 evenly spaced dates
  const xLabelStep = Math.max(1, Math.floor(dates.length / 5));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y-axis grid lines + labels */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={padLeft}
              y1={toY(tick)}
              x2={viewW - padRight}
              y2={toY(tick)}
              className="stroke-border"
              strokeWidth={0.5}
            />
            <text
              x={padLeft - 4}
              y={toY(tick) + 1}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground"
              fontSize={8}
            >
              {tick}
            </text>
          </g>
        ))}

        {/* X-axis date labels */}
        {dates.map((date, i) =>
          i % xLabelStep === 0 || i === dates.length - 1 ? (
            <text
              key={date}
              x={toX(i)}
              y={viewH - 4}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={8}
            >
              {formatDateLabel(date)}
            </text>
          ) : null,
        )}

        {/* Lines */}
        {series.map((s) => {
          const points = s.points
            .map((v, i) => `${toX(i)},${toY(v)}`)
            .join(" ");
          return (
            <polyline
              key={s.code}
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {/* Dots at each data point. Suppressed on long windows (90d/1y), where
            one marker per day per series reads as noise and adds thousands of
            SVG nodes; the hovered point is still marked below. */}
        {dates.length <= DENSE_SERIES_THRESHOLD &&
          series.map((s) =>
            s.points.map((v, i) => (
              <circle
                key={`${s.code}-${i}`}
                cx={toX(i)}
                cy={toY(v)}
                r={hoveredIdx === i ? 3.5 : 2}
                fill={s.color}
                className="transition-[r] duration-100"
              />
            )),
          )}

        {/* Hovered-point markers — always shown, including on dense windows */}
        {hoveredIdx !== null &&
          dates.length > DENSE_SERIES_THRESHOLD &&
          series.map((s) => (
            <circle
              key={`${s.code}-hover`}
              cx={toX(hoveredIdx)}
              cy={toY(s.points[hoveredIdx])}
              r={3.5}
              fill={s.color}
            />
          ))}

        {/* Hover columns (invisible hit areas) */}
        {dates.map((_, i) => (
          <rect
            key={i}
            x={toX(i) - xStep / 2}
            y={padTop}
            width={xStep || chartW}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}

        {/* Hover vertical line */}
        {hoveredIdx !== null && (
          <line
            x1={toX(hoveredIdx)}
            y1={padTop}
            x2={toX(hoveredIdx)}
            y2={padTop + chartH}
            className="stroke-muted-foreground/40"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && (
        <div
          className="bg-popover text-popover-foreground border-border pointer-events-none absolute z-10 rounded-lg border px-3 py-2 shadow-md"
          style={{
            left: `${(toX(hoveredIdx) / viewW) * 100}%`,
            top: `${(padTop / viewH) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <p className="text-muted-foreground mb-1 text-[10px] font-medium">
            {formatDateLabel(dates[hoveredIdx])}
          </p>
          {series
            .filter((s) => s.points[hoveredIdx] > 0)
            .sort((a, b) => b.points[hoveredIdx] - a.points[hoveredIdx])
            .map((s) => (
              <div key={s.code} className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-foreground/80">{s.name}</span>
                <span className="text-muted-foreground ml-auto tabular-nums">
                  {s.points[hoveredIdx]}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export function ViolationTrendChart({
  loading,
  data,
  days = DEFAULT_RANGE_DAYS,
}: {
  loading: boolean;
  data: DailyViolationTypeEntry[];
  days?: number;
}) {
  const { series, dates } = useMemo(() => buildSeries(data), [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Violation Trends</CardTitle>
        <p className="text-muted-foreground text-xs">
          {formatWindowLabel(days)}
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <Skeleton className="h-[200px] w-full rounded" />
        ) : series.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No violation data yet
          </p>
        ) : (
          <>
            <LineChart series={series} dates={dates} />
            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {series.map((s) => (
                <div key={s.code} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-foreground/80">{s.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
