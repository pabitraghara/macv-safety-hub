"use client";

import { Briefcase, Camera, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePagination } from "@/components/common/TablePagination";
import type {
  AnprHistoryDetection,
  AnprHistoryResponse,
} from "@/api/speed-violations";

/**
 * ANPR gate-detection history for the violation's plate: entry/exit pairs
 * with plate/vehicle captures, paginated via the shared TablePagination.
 */

interface AnprHistoryProps {
  detections: AnprHistoryDetection[];
  metadata: AnprHistoryResponse["metadata"] | null;
  page: number;
  pageSize: number;
  timezone: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function formatTime(value: string | null, timezone: string): string {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

/** One side (entry or exit) of a detection pair — identical field layout. */
function DetectionSide({
  kind,
  detection,
  time,
  timezone,
}: {
  kind: "entry" | "exit";
  detection: AnprHistoryDetection;
  time: string | null;
  timezone: string;
}) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            kind === "entry" ? "bg-green-500" : "bg-red-500"
          }`}
        />
        {kind === "entry" ? "Entry Detection" : "Exit Detection"}
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Plate Number:</span>
          <span className="font-mono font-bold">{detection.license_plate}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Confidence:</span>
          <span className="tabular-nums">
            {detection.confidence != null
              ? (Number(detection.confidence) * 100).toFixed(1)
              : "N/A"}
            %
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Vehicle Type:</span>
          <span>{detection.vehicle_type || "—"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Camera:</span>
          <span>{detection.camera_name || "—"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Time:</span>
          <span>{formatTime(time, timezone)}</span>
        </div>
      </div>
      {(detection.plate_image_url || detection.vehicle_image_url) && (
        // Both captures side by side, each letterboxed with object-contain so
        // the wide plate crop and the vehicle frame keep their own aspect
        // ratio instead of being cropped to a strip.
        <div className="mt-3 grid grid-cols-2 gap-2">
          {detection.vehicle_image_url && (
            <figure className="bg-muted flex flex-col rounded border p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={detection.vehicle_image_url}
                alt={`${kind} vehicle`}
                className="h-24 w-full rounded object-contain"
              />
              <figcaption className="text-muted-foreground mt-1 text-center text-[10px] tracking-wide uppercase">
                Vehicle
              </figcaption>
            </figure>
          )}
          {detection.plate_image_url && (
            <figure className="bg-muted flex flex-col rounded border p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={detection.plate_image_url}
                alt={`${kind} license plate`}
                className="h-24 w-full rounded object-contain"
              />
              <figcaption className="text-muted-foreground mt-1 text-center text-[10px] tracking-wide uppercase">
                Plate
              </figcaption>
            </figure>
          )}
        </div>
      )}
    </div>
  );
}

export function AnprHistory({
  detections,
  metadata,
  page,
  pageSize,
  timezone,
  onPageChange,
  onPageSizeChange,
}: AnprHistoryProps) {
  if (detections.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Camera className="text-muted-foreground h-5 w-5" />
        <h2 className="text-xl font-semibold">ANPR Detections</h2>
        <Badge
          variant="outline"
          className="ml-auto border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-300"
        >
          {metadata?.total_count ?? detections.length} Detection
          {(metadata?.total_count ?? detections.length) !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="space-y-4">
        {detections.map((detection) => (
          <div
            key={detection.id}
            className="rounded-lg border p-4 transition-shadow hover:shadow-md"
          >
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetectionSide
                kind="entry"
                detection={detection}
                time={detection.entry_time || detection.timestamp}
                timezone={timezone}
              />
              {detection.exit_time ? (
                <DetectionSide
                  kind="exit"
                  detection={detection}
                  time={detection.exit_time}
                  timezone={timezone}
                />
              ) : (
                <div className="bg-muted flex items-center justify-center rounded-lg border">
                  <p className="text-muted-foreground text-sm">
                    No exit detection recorded
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 border-t pt-3">
              <Briefcase className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-xs">
                Job: {detection.job_name || "—"}
              </span>
              <MapPin className="text-muted-foreground ml-auto h-4 w-4" />
              <span className="text-muted-foreground text-xs">
                {detection.site_name || "—"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Items per page:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {metadata && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalCount={metadata.total_count}
          onPageChange={onPageChange}
        />
      )}
    </Card>
  );
}
