"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import ErrorAlert from "@/components/common/ErrorAlert";
import PageHeader from "@/components/common/PageHeader";
import { TablePagination } from "@/components/common/TablePagination";
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  Camera,
  MapPin,
  Truck,
} from "lucide-react";
import { useTimezone } from "@/contexts/TimezoneContext";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { vehiclesApi } from "@/api/vehicles";
import type {
  VehicleAnprRow,
  VehicleHistoryResponse,
  VehicleViolationRow,
} from "@/api/vehicles";
import { ApiError } from "@/api/base/errors";

interface VehicleViolationsPageProps {
  plateNumber: string;
}

const GREEN_BADGE =
  "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900";
const RED_BADGE =
  "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900";
const GRAY_BADGE = "bg-muted text-muted-foreground border-border";
const PURPLE_BADGE =
  "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900";

const VIOLATIONS_PAGE_SIZE = 10;

export default function VehicleViolationsPage({
  plateNumber,
}: VehicleViolationsPageProps) {
  const { timezone } = useTimezone();
  const router = useRouter();

  const [history, setHistory] = useState<VehicleHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [anprPage, setAnprPage] = useState(1);
  const [anprPageSize, setAnprPageSize] = useState(5);

  const fetchVehicleHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await vehiclesApi.getVehicleHistory(plateNumber, {
        violations_page: page,
        violations_page_size: VIOLATIONS_PAGE_SIZE,
        anpr_page: anprPage,
        anpr_page_size: anprPageSize,
        include_anpr: true,
      });
      setHistory(response);
      setError(null);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to fetch vehicle history. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [plateNumber, page, anprPage, anprPageSize]);

  useEffect(() => {
    fetchVehicleHistory();
  }, [fetchVehicleHistory]);

  const formatDateTime = (timestamp: string | null) =>
    timestamp
      ? new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date(timestamp))
      : "N/A";

  if (isLoading && !history) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <LoadingSpinner label="Loading vehicle history..." />
      </div>
    );
  }

  const vehicle = history?.vehicle ?? null;
  const owner = history?.owner ?? null;
  const summary = history?.summary ?? null;
  const violations: VehicleViolationRow[] = history?.violations.data ?? [];
  const violationsMeta = history?.violations.metadata ?? null;
  const anprDetections: VehicleAnprRow[] = history?.anpr_detections?.data ?? [];
  const anprMeta = history?.anpr_detections?.metadata ?? null;

  const isRegistered = vehicle != null && "id" in vehicle;
  const registrationStatus = vehicle?.registration_status ?? "Unknown";

  // Average speed across the currently-loaded violations page.
  const speeds = violations.map((v) => v.avg_speed ?? 0);
  const averageSpeed =
    speeds.length > 0
      ? parseFloat(
          (speeds.reduce((s, v) => s + v, 0) / speeds.length).toFixed(2),
        )
      : null;

  // Top camera by violation count on the loaded page.
  const cameraCount = violations.reduce<Record<string, number>>((acc, item) => {
    const name = item.camera_name || "Unknown";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const topSite = Object.entries(cameraCount).reduce(
    (max, [name, count]) => (count > max.count ? { name, count } : max),
    { name: "", count: 0 },
  );

  const totalViolations =
    summary?.total_violations ?? violationsMeta?.total_count ?? 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        title={`Vehicle: ${plateNumber}`}
        description={`${totalViolations} speed violation${
          totalViolations !== 1 ? "s" : ""
        } found`}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      {(isRegistered || owner) && (
        <Card className="mb-6">
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-4 text-lg font-semibold">
                Vehicle Information
              </h3>
              <dl className="space-y-2">
                {isRegistered && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground text-sm font-medium">
                      Type:
                    </dt>
                    <dd className="text-sm">{vehicle.vehicle_type ?? "N/A"}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground text-sm font-medium">
                    Status:
                  </dt>
                  <dd className="text-sm">
                    <Badge
                      variant="outline"
                      className={
                        summary?.vehicle_status === "Active"
                          ? GREEN_BADGE
                          : GRAY_BADGE
                      }
                    >
                      {summary?.vehicle_status ?? registrationStatus}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground text-sm font-medium">
                    Registration:
                  </dt>
                  <dd className="text-sm">
                    {registrationStatus === "Registered" ? (
                      <Badge variant="outline" className={GREEN_BADGE}>
                        Registered
                      </Badge>
                    ) : (
                      <Badge variant="outline" className={RED_BADGE}>
                        {registrationStatus}
                      </Badge>
                    )}
                  </dd>
                </div>

                {isRegistered && vehicle.expiry_date && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground text-sm font-medium">
                      Expiry Date:
                    </dt>
                    <dd className="text-sm">
                      {new Date(vehicle.expiry_date).toLocaleDateString()}
                      {vehicle.is_expired && (
                        <span className="text-destructive ml-2 font-medium">
                          (Expired)
                        </span>
                      )}
                    </dd>
                  </div>
                )}

                {summary?.last_seen && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground text-sm font-medium">
                      Last Seen:
                    </dt>
                    <dd className="text-sm">
                      {new Date(summary.last_seen).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            <div>
              <h3 className="mb-4 text-lg font-semibold">Owner Information</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground text-sm font-medium">
                    Name:
                  </dt>
                  <dd className="text-sm">
                    {summary?.owner_name ?? owner?.name ?? "N/A"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground text-sm font-medium">
                    Type:
                  </dt>
                  <dd className="text-sm">{owner?.type ?? "N/A"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground text-sm font-medium">
                    Employee Number:
                  </dt>
                  <dd className="text-sm">{owner?.employee_id || "N/A"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground text-sm font-medium">
                    Department:
                  </dt>
                  <dd className="text-sm">
                    {summary?.owner_company ?? owner?.department ?? "N/A"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground text-sm font-medium">
                    Contact:
                  </dt>
                  <dd className="text-sm">{owner?.phone ?? "N/A"}</dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1 text-sm">
                Total Violations
              </p>
              <p className="text-destructive text-2xl font-semibold tabular-nums">
                {totalViolations}
              </p>
            </div>
            <BarChart3 className="text-destructive h-8 w-8" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1 text-sm">
                Average Speed
              </p>
              <p className="text-2xl font-semibold text-orange-600 tabular-nums dark:text-orange-400">
                {averageSpeed ?? "N/A"}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1 text-sm">Max Speed</p>
              <p className="text-2xl font-semibold text-blue-600 tabular-nums dark:text-blue-400">
                {summary?.max_speed != null
                  ? Number(summary.max_speed).toFixed(1)
                  : "N/A"}
              </p>
              <p className="text-muted-foreground text-sm">km/h</p>
            </div>
            <Truck className="h-8 w-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1 text-sm">Top Location</p>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                {topSite.name || "N/A"}
              </p>
              <p className="text-muted-foreground text-sm">
                {topSite.count} violations
              </p>
            </div>
            <MapPin className="h-8 w-8 text-green-500" />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        <div>
          {error && (
            <div className="mb-4">
              <ErrorAlert message={error} onRetry={fetchVehicleHistory} />
            </div>
          )}
          {!error && violations.length === 0 && (
            <EmptyState
              title="No violations found"
              message="No violations found for this vehicle."
            />
          )}
          {!error && violations.length > 0 && (
            <>
              <MobileCardList>
                {violations.map((violation) => (
                  <RecordCard
                    key={violation.id}
                    title={formatDateTime(violation.timestamp)}
                    subtitle={violation.camera_name || "N/A"}
                    fields={[
                      {
                        label: "Avg Speed",
                        value:
                          violation.avg_speed != null
                            ? `${Number(violation.avg_speed).toFixed(1)} km/h`
                            : "N/A",
                      },
                      {
                        label: "Max Speed",
                        value:
                          violation.max_speed != null
                            ? `${Number(violation.max_speed).toFixed(1)} km/h`
                            : "N/A",
                      },
                      {
                        label: "Speed Limit",
                        value:
                          violation.speed_limit != null
                            ? `${Number(violation.speed_limit).toFixed(0)} km/h`
                            : "N/A",
                      },
                    ]}
                  />
                ))}
              </MobileCardList>

              <DataTable>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Avg Speed</TableHead>
                      <TableHead>Max Speed</TableHead>
                      <TableHead>Speed Limit</TableHead>
                      <TableHead>Camera</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violations.map((violation) => (
                      <TableRow key={violation.id}>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDateTime(violation.timestamp)}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {violation.avg_speed != null
                            ? `${Number(violation.avg_speed).toFixed(1)} km/h`
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {violation.max_speed != null
                            ? `${Number(violation.max_speed).toFixed(1)} km/h`
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {violation.speed_limit != null
                            ? `${Number(violation.speed_limit).toFixed(0)} km/h`
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {violation.camera_name || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTable>

              {violationsMeta && (
                <TablePagination
                  page={violationsMeta.page}
                  pageSize={violationsMeta.page_size}
                  totalCount={violationsMeta.total_count}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>

        {anprDetections.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Camera className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-xl">ANPR Detections</CardTitle>
              <Badge variant="outline" className={`ml-auto ${PURPLE_BADGE}`}>
                {anprMeta?.total_count ?? anprDetections.length} Detection
                {(anprMeta?.total_count ?? anprDetections.length) !== 1
                  ? "s"
                  : ""}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {anprDetections.map((detection) => (
                  <div
                    key={detection.id}
                    className="rounded-lg border p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-muted rounded-md border px-2 py-1 font-mono text-xs font-bold">
                            {detection.license_plate}
                          </span>
                          {detection.direction && (
                            <Badge variant="outline">
                              {detection.direction}
                            </Badge>
                          )}
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Confidence:
                          </span>
                          <span className="tabular-nums">
                            {detection.confidence != null
                              ? `${(Number(detection.confidence) * 100).toFixed(1)}%`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Vehicle Type:
                          </span>
                          <span>{detection.vehicle_type ?? "N/A"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Camera:</span>
                          <span>{detection.camera_name ?? "N/A"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Entry Time:
                          </span>
                          <span>
                            {formatDateTime(
                              detection.entry_time ?? detection.timestamp,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Exit Time:
                          </span>
                          <span>
                            {detection.exit_time
                              ? formatDateTime(detection.exit_time)
                              : "-"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {detection.plate_image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={detection.plate_image_url}
                            alt="License plate"
                            className="h-12 w-48 max-w-full rounded border object-contain"
                          />
                        )}
                        {detection.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={detection.image_url}
                            alt="Vehicle"
                            className="h-24 w-48 max-w-full rounded border object-cover"
                          />
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t pt-3">
                      <Briefcase className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground text-xs">
                        Job: {detection.job_name ?? "N/A"}
                      </span>
                      <MapPin className="text-muted-foreground ml-auto h-4 w-4" />
                      <span className="text-muted-foreground text-xs">
                        {detection.site_name ?? "N/A"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {anprMeta && anprMeta.total_pages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t pt-6">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="anpr-page-size"
                      className="text-muted-foreground text-sm font-normal"
                    >
                      Items per page:
                    </Label>
                    <Select
                      value={String(anprPageSize)}
                      onValueChange={(value) => {
                        setAnprPageSize(Number(value));
                        setAnprPage(1);
                      }}
                    >
                      <SelectTrigger
                        id="anpr-page-size"
                        className="h-8 w-[80px]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() =>
                        setAnprPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={anprPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-muted-foreground text-sm">
                      Page {anprPage} of {anprMeta.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() =>
                        setAnprPage((prev) =>
                          Math.min(prev + 1, anprMeta.total_pages),
                        )
                      }
                      disabled={anprPage === anprMeta.total_pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
