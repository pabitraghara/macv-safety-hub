"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { alprApi, type AlprDetection } from "@/api/alpr";
import { useTimezone } from "@/contexts/TimezoneContext";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorAlert from "@/components/common/ErrorAlert";
import PageHeader from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page(props: { params: Promise<{ id: string }> }) {
  const { timezone } = useTimezone();
  const router = useRouter();
  const { id } = use(props.params);
  const [vehicle, setVehicle] = useState<AlprDetection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchVehicleDetail = async () => {
      try {
        const response = await alprApi.getDetection(id);
        setVehicle(response);
        setError(null);
      } catch (err) {
        console.error("Error fetching vehicle detail:", err);
        setError("Failed to load vehicle details.");
      }
    };

    fetchVehicleDetail();
  }, [id]);

  const formatTimestamp = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(new Date(value));

  if (error) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <ErrorAlert message={error} />
      </div>
    );
  }

  if (!vehicle) return <LoadingSpinner label="Loading vehicle details..." />;

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
      <PageHeader title="Vehicle Detection Details" />

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Left Column - Images */}
        <div className="space-y-6 md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Entry Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-lg border">
                <h3 className="bg-muted p-2 text-sm font-medium">
                  Vehicle Image
                </h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vehicle.entry_vehicle_image_url ?? undefined}
                  alt="Entry Vehicle"
                  className="h-48 w-full object-cover"
                />
              </div>
              <div className="overflow-hidden rounded-lg border">
                <h3 className="bg-muted p-2 text-sm font-medium">
                  License Plate Image
                </h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vehicle.entry_plate_image_url ?? undefined}
                  alt="Entry License Plate"
                  className="h-32 w-full object-cover"
                />
              </div>
            </CardContent>
          </Card>

          {vehicle.exit_time && (
            <Card>
              <CardHeader>
                <CardTitle>Exit Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-hidden rounded-lg border">
                  <h3 className="bg-muted p-2 text-sm font-medium">
                    Vehicle Image
                  </h3>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={vehicle.exit_vehicle_image_url ?? undefined}
                    alt="Exit Vehicle"
                    className="h-48 w-full object-cover"
                  />
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <h3 className="bg-muted p-2 text-sm font-medium">
                    License Plate Image
                  </h3>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={vehicle.exit_plate_image_url ?? undefined}
                    alt="Exit License Plate"
                    className="h-32 w-full object-cover"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6 md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Entry Details</CardTitle>
            </CardHeader>
            <CardContent>
              {vehicle.entry_time ? (
                <dl className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">
                      License Plate
                    </dt>
                    <dd className="col-span-2">
                      <Link
                        href={`/alpr/vehicles/${vehicle.entry_plate_number}`}
                        className="bg-muted hover:bg-accent inline-block rounded-md border px-2 py-1 font-mono text-xs font-medium transition-colors hover:underline"
                      >
                        {vehicle.entry_plate_number}
                      </Link>
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">
                      Vehicle Type
                    </dt>
                    <dd className="col-span-2">{vehicle.entry_vehicle_type}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">
                      Camera
                    </dt>
                    <dd className="col-span-2">{vehicle.entry_stream_name}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">
                      Confidence
                    </dt>
                    <dd className="col-span-2 tabular-nums">
                      {(Number(vehicle.entry_confidence) * 100).toFixed(1)}%
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">
                      Timestamp
                    </dt>
                    <dd className="col-span-2">
                      {formatTimestamp(vehicle.entry_time)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No entry detection recorded yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exit Details</CardTitle>
            </CardHeader>
            <CardContent>
              {vehicle.exit_time ? (
                <dl className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">
                      License Plate
                    </dt>
                    <dd className="col-span-2">
                      <Link
                        href={`/alpr/vehicles/${vehicle.exit_plate_number}`}
                        className="bg-muted hover:bg-accent inline-block rounded-md border px-2 py-1 font-mono text-xs font-medium transition-colors hover:underline"
                      >
                        {vehicle.exit_plate_number}
                      </Link>
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">
                      Vehicle Type
                    </dt>
                    <dd className="col-span-2">{vehicle.exit_vehicle_type}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">
                      Camera
                    </dt>
                    <dd className="col-span-2">{vehicle.exit_stream_name}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">
                      Confidence
                    </dt>
                    <dd className="col-span-2 tabular-nums">
                      {vehicle.exit_confidence
                        ? `${(Number(vehicle.exit_confidence) * 100).toFixed(1)}%`
                        : "N/A"}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">
                      Timestamp
                    </dt>
                    <dd className="col-span-2">
                      {formatTimestamp(vehicle.exit_time)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No exit detection recorded yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-muted-foreground font-medium">Site</dt>
                  <dd className="col-span-2">{vehicle.site_name || "N/A"}</dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-muted-foreground font-medium">Job</dt>
                  <dd className="col-span-2">{vehicle.job_name || "N/A"}</dd>
                </div>
                {vehicle.exit_time && vehicle.entry_time && (
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">
                      Duration
                    </dt>
                    <dd className="col-span-2">
                      {(() => {
                        const duration =
                          new Date(vehicle.exit_time ?? 0).getTime() -
                          new Date(vehicle.entry_time ?? 0).getTime();
                        const minutes = Math.floor(duration / (1000 * 60));
                        const hours = Math.floor(minutes / 60);
                        const days = Math.floor(hours / 24);
                        if (days > 0)
                          return `${days}d ${hours % 24}h ${minutes % 60}m`;
                        if (hours > 0) return `${hours}h ${minutes % 60}m`;
                        return `${minutes}m`;
                      })()}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {vehicle.vehicle_info && (
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">Type</dt>
                    <dd className="col-span-2">
                      {vehicle.vehicle_info.type || "N/A"}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">Make</dt>
                    <dd className="col-span-2">
                      {vehicle.vehicle_info.make || "N/A"}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">Model</dt>
                    <dd className="col-span-2">
                      {vehicle.vehicle_info.model || "N/A"}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">Color</dt>
                    <dd className="col-span-2">
                      {vehicle.vehicle_info.color || "N/A"}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">Year</dt>
                    <dd className="col-span-2">
                      {vehicle.vehicle_info.year || "N/A"}
                    </dd>
                  </div>
                  {vehicle.registration_status && (
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-muted-foreground font-medium">
                        Registration Status
                      </dt>
                      <dd className="col-span-2">
                        <Badge
                          variant="outline"
                          className={
                            vehicle.registration_status === "active"
                              ? "border-green-200 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                              : "text-muted-foreground"
                          }
                        >
                          {vehicle.registration_status}
                        </Badge>
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {vehicle.owner && (
            <Card>
              <CardHeader>
                <CardTitle>Owner Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">Name</dt>
                    <dd className="col-span-2">{vehicle.owner.name}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">Type</dt>
                    <dd className="col-span-2">
                      <Badge
                        variant="outline"
                        className={
                          vehicle.owner.type === "Employee"
                            ? "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                            : "border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-300"
                        }
                      >
                        {vehicle.owner.type}
                      </Badge>
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">
                      Employee ID
                    </dt>
                    <dd className="col-span-2">
                      {vehicle.owner.employee_id || "N/A"}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">
                      Department
                    </dt>
                    <dd className="col-span-2">{vehicle.owner.department}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">Phone</dt>
                    <dd className="col-span-2">
                      {vehicle.owner.phone || "N/A"}
                    </dd>
                  </div>
                  {vehicle.owner.email && (
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-muted-foreground font-medium">
                        Email
                      </dt>
                      <dd className="text-primary col-span-2 hover:underline">
                        <a href={`mailto:${vehicle.owner.email}`}>
                          {vehicle.owner.email}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
