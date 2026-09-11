"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { alprApi, type AlprDetection } from "@/api/alpr";
import { useTimezone } from "@/contexts/TimezoneContext";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorAlert from "@/components/common/ErrorAlert";
import PageHeader from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileCardList, RecordCard } from "@/components/common/RecordCard";
import { DataTable } from "@/components/ui/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Datetime formatter returning a React element with separate date and time.
function FormatDateTime({
  timestamp,
  timezone,
}: {
  timestamp: string;
  timezone: string;
}) {
  const safeDate = new Date(timestamp);
  if (isNaN(safeDate.getTime())) return <span>Invalid Date</span>;

  const dateStr = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(safeDate);

  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(safeDate);

  return (
    <div className="flex flex-col">
      <span>{dateStr}</span>
      <span>{timeStr}</span>
    </div>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return `${days}d ${hours}h`;
}

function calculateDuration(entry: string, exit: string): number {
  const entryTime = new Date(entry).getTime();
  const exitTime = new Date(exit).getTime();
  return Math.round((exitTime - entryTime) / (1000 * 60));
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const { timezone } = useTimezone();
  const router = useRouter();
  const [detections, setDetections] = useState<AlprDetection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchVehicleHistory = async () => {
      try {
        setIsLoading(true);
        const response = await alprApi.getDetections({
          search: id,
          page_size: 100,
        });
        setDetections(response.data || []);
      } catch (err) {
        console.error("Error fetching vehicle history:", err);
        setError("Failed to load vehicle history");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVehicleHistory();
  }, [id]);

  const calculateStats = () => {
    if (!detections.length) return null;

    const completedDetections = detections.filter((d) => d.exit_time);
    const durations = completedDetections
      .filter((d) => d.entry_time)
      .map((d) =>
        Math.round(
          (new Date(d.exit_time!).getTime() -
            new Date(d.entry_time!).getTime()) /
            (1000 * 60),
        ),
      );

    const dayCount: Record<string, number> = {};
    detections.forEach((d) => {
      if (d.entry_time) {
        const day = d.entry_time.split("T")[0];
        dayCount[day] = (dayCount[day] || 0) + 1;
      }
    });

    return {
      total_entries: detections.length,
      total_exits: completedDetections.length,
      average_duration_minutes: durations.length
        ? Math.round(
            durations.reduce((acc, val) => acc + val, 0) / durations.length,
          )
        : 0,
      shortest_visit_minutes: durations.length ? Math.min(...durations) : 0,
      longest_visit_minutes: durations.length ? Math.max(...durations) : 0,
      entries_by_day: Object.entries(dayCount)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  };

  const stats = calculateStats();

  if (isLoading) {
    return <LoadingSpinner label="Loading vehicle history..." />;
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <ErrorAlert message={error} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
      <PageHeader title={`Vehicle Statistics: ${id}`} />

      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Visits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {stats.total_entries}
              </div>
            </CardContent>
          </Card>
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Average Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatDuration(stats.average_duration_minutes)}
              </div>
            </CardContent>
          </Card>
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Shortest Visit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatDuration(stats.shortest_visit_minutes)}
              </div>
            </CardContent>
          </Card>
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Longest Visit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatDuration(stats.longest_visit_minutes)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {stats && stats.entries_by_day.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Visits Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.entries_by_day}
                  margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    allowDecimals={false}
                    width={40}
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value) => [`${value} visits`, "Visits"]}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--brand, #2563eb)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Entry/Exit History</h2>

        <MobileCardList>
          {detections.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No history found for this vehicle
            </p>
          ) : (
            detections.map((detection) => (
              <RecordCard
                key={detection.id}
                title={
                  detection.entry_time ? (
                    <FormatDateTime
                      timestamp={detection.entry_time}
                      timezone={timezone}
                    />
                  ) : (
                    "—"
                  )
                }
                subtitle={
                  detection.exit_time && detection.entry_time
                    ? `Duration ${formatDuration(
                        calculateDuration(
                          detection.entry_time,
                          detection.exit_time,
                        ),
                      )}`
                    : undefined
                }
                trailing={
                  detection.exit_time ? (
                    <Badge
                      variant="outline"
                      className="border-green-200 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                    >
                      Completed
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300"
                    >
                      In Progress
                    </Badge>
                  )
                }
                fields={[
                  {
                    label: "Exit Time",
                    value: detection.exit_time ? (
                      <FormatDateTime
                        timestamp={detection.exit_time}
                        timezone={timezone}
                      />
                    ) : (
                      "—"
                    ),
                    full: true,
                  },
                  { label: "Site", value: detection.site_name || "N/A" },
                  { label: "Job", value: detection.job_name || "N/A" },
                ]}
              />
            ))
          )}
        </MobileCardList>

        <DataTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry Time</TableHead>
                <TableHead>Exit Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detections.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-4 text-center"
                  >
                    No history found for this vehicle
                  </TableCell>
                </TableRow>
              ) : (
                detections.map((detection) => (
                  <TableRow key={detection.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {detection.entry_time ? (
                        <FormatDateTime
                          timestamp={detection.entry_time}
                          timezone={timezone}
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {detection.exit_time ? (
                        <FormatDateTime
                          timestamp={detection.exit_time}
                          timezone={timezone}
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {detection.exit_time && detection.entry_time
                        ? formatDuration(
                            calculateDuration(
                              detection.entry_time,
                              detection.exit_time,
                            ),
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {detection.site_name || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {detection.job_name || "N/A"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {detection.exit_time ? (
                        <Badge
                          variant="outline"
                          className="border-green-200 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                        >
                          Completed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300"
                        >
                          In Progress
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DataTable>
      </div>
    </div>
  );
}
