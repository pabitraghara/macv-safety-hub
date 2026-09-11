"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { AlprDetection, AlprDirectionStats } from "@/api/alpr";
import type { DirectionFilter } from "../_hooks/alprFilters";
import { useTimezone } from "@/contexts/TimezoneContext";
import {
  MobileCardList,
  RecordCard,
  type RecordCardField,
} from "@/components/common/RecordCard";
import { DataTable } from "@/components/ui/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/common/TablePagination";

interface AlprDetectionsTableSummary {
  entry: AlprDirectionStats;
  exit: AlprDirectionStats;
}

interface AlprDetectionsTableProps {
  vehicles: AlprDetection[];
  metadata: {
    total_count: number;
    page: number;
    page_size: number;
  };
  onPageChange: (page: number) => void;
  summary?: AlprDetectionsTableSummary;
  direction: DirectionFilter;
}

function formatDateTimeDisplay(timestamp: string, timezone: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "Invalid Date";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(date);
}

interface DirectionBreakdownCardProps {
  title: string;
  gradient: string;
  totalLabel: string;
  stats?: AlprDirectionStats;
}

function DirectionBreakdownCard({
  title,
  gradient,
  totalLabel,
  stats,
}: DirectionBreakdownCardProps) {
  const total = stats?.total || 0;
  const rows: { label: string; value: number }[] = [
    { label: "Employees", value: stats?.employees || 0 },
    { label: "Contractors", value: stats?.contractors || 0 },
    { label: "Others", value: stats?.others || 0 },
  ];

  return (
    <div className={`rounded-xl p-6 text-white ${gradient}`}>
      <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
        <span className="h-3 w-3 rounded-full bg-white"></span>
        {title}
      </h2>
      <div className="space-y-6">
        <div className="border-b border-white/20 pb-2">
          <div className="flex justify-between text-base font-semibold">
            <span className="text-3xl">{totalLabel}</span>
            <span className="text-3xl tabular-nums">{total}</span>
          </div>
        </div>
        {rows.map((row) => {
          const pct = ((row.value / (total || 1)) * 100).toFixed(1);
          return (
            <div key={row.label}>
              <div className="flex justify-between text-sm font-medium">
                <span>{row.label}</span>
                <div className="text-right">
                  <div className="tabular-nums">{row.value}</div>
                  <div className="text-xs text-white/80">({pct}%)</div>
                </div>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-white/20">
                <div
                  className="h-2 rounded-full bg-white"
                  style={{ width: `${pct}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface DetectionLeg {
  plateImage: string | null;
  vehicleImage: string | null;
  plateNumber: string | null;
  streamName: string | null;
}

/**
 * Pick the entry/exit leg of a detection to display.
 *
 * Rows are paired vehicle records carrying BOTH legs, so the leg must be
 * chosen from the row's own `direction` — not from the page-level filter.
 * On /alpr/overview the filter is "all", which previously fell through to
 * the entry branch and rendered entry media for exit events.
 *
 * `fallbackIsExit` covers rows with a null direction, where the route's
 * filter is the best available signal. Each field falls back to the
 * opposite leg because a row may only have one side populated.
 */
export function selectLeg(
  item: AlprDetection,
  fallbackIsExit: boolean,
): DetectionLeg {
  const isExitRow = item.direction
    ? item.direction.toLowerCase() === "exit"
    : fallbackIsExit;

  return isExitRow
    ? {
        plateImage: item.exit_plate_image_url ?? item.entry_plate_image_url,
        vehicleImage:
          item.exit_vehicle_image_url ?? item.entry_vehicle_image_url,
        plateNumber: item.exit_plate_number ?? item.entry_plate_number,
        streamName: item.exit_stream_name ?? item.entry_stream_name,
      }
    : {
        plateImage: item.entry_plate_image_url ?? item.exit_plate_image_url,
        vehicleImage:
          item.entry_vehicle_image_url ?? item.exit_vehicle_image_url,
        plateNumber: item.entry_plate_number ?? item.exit_plate_number,
        streamName: item.entry_stream_name ?? item.exit_stream_name,
      };
}

interface DetectionCardProps {
  item: AlprDetection;
  leg: DetectionLeg;
  isOverview: boolean;
  isExit: boolean;
  timezone: string;
  onOpen: () => void;
}

/**
 * Mobile rendering of one detection row. The plate image alone identifies the
 * detection, so the overview's wider vehicle image stays desktop-only rather
 * than costing a screenful of height per row.
 */
function DetectionCard({
  item,
  leg,
  isOverview,
  isExit,
  timezone,
  onOpen,
}: DetectionCardProps) {
  const plate = isOverview
    ? item.license_plate
    : leg.plateNumber || item.license_plate;

  const fields: RecordCardField[] = [];
  if (!isOverview) {
    fields.push({
      label: "Stream",
      value: leg.streamName || "N/A",
      full: true,
    });
  }
  if (!isExit) {
    fields.push({
      label: "Entry Time",
      value: item.entry_time
        ? formatDateTimeDisplay(item.entry_time, timezone)
        : "-",
    });
  }
  fields.push({
    label: "Exit Time",
    value: item.exit_time
      ? formatDateTimeDisplay(item.exit_time, timezone)
      : "-",
  });
  fields.push({ label: "Employee Type", value: item.owner?.type || "N/A" });

  return (
    <RecordCard
      onClick={onOpen}
      media={
        leg.plateImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={leg.plateImage}
            alt="License plate"
            className="h-[60px] w-[110px] rounded border object-contain"
          />
        ) : undefined
      }
      title={
        <span className="bg-muted inline-block rounded-md border px-2 py-1 font-mono text-xs font-medium">
          {plate || "N/A"}
        </span>
      }
      subtitle={item.owner?.name || "N/A"}
      fields={fields}
    />
  );
}

/**
 * ALPR detections table. Ported from the old
 * `@/components/domain/vehicles/VehiclesTable`, retyped onto the canonical
 * `AlprDetection` row. Column layout adapts to the current route
 * (overview / entry_vehicles / exit_vehicles).
 */
export default function AlprDetectionsTable({
  vehicles,
  metadata,
  onPageChange,
  summary,
  direction,
}: AlprDetectionsTableProps) {
  const router = useRouter();
  const { timezone } = useTimezone();
  const latestVehicle: AlprDetection | null =
    vehicles.length > 0 ? vehicles[0] : null;

  const isOverview = direction === "all";
  const isExit = direction === "exit";

  if (!latestVehicle) return null;

  const latestLeg = selectLeg(latestVehicle, isExit);

  return (
    <>
      <div className="flex flex-col pt-4">
        {isOverview ? (
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <DirectionBreakdownCard
              title="Entry Vehicles"
              gradient="bg-gradient-to-r from-green-600 to-green-700"
              totalLabel="Total Entry"
              stats={summary?.entry}
            />
            <DirectionBreakdownCard
              title="Exit Vehicles"
              gradient="bg-gradient-to-r from-red-600 to-red-700"
              totalLabel="Total Exit"
              stats={summary?.exit}
            />
          </div>
        ) : (
          <div className="mb-6 flex p-4 lg:justify-start">
            <div className="bg-muted mb-6 flex flex-col gap-6 rounded-md border p-3 lg:flex-row">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={latestLeg.vehicleImage ?? undefined}
                  alt="Vehicle"
                  className="h-[160px] w-[300px] rounded border object-contain sm:h-[360px] sm:w-[500px]"
                />
              </div>
              <div className="flex flex-col text-sm">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={latestLeg.plateImage ?? undefined}
                    alt="License Plate"
                    className="h-[120px] w-[200px] rounded border object-contain"
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <p className="text-xs font-semibold uppercase">
                    License Plate
                  </p>
                  <p className="text-muted-foreground">
                    {latestLeg.plateNumber ||
                      latestVehicle.license_plate ||
                      "N/A"}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <p className="text-xs font-semibold uppercase">Car Details</p>
                  <p className="text-muted-foreground">
                    {latestVehicle.vehicle_info?.make ||
                      latestVehicle.vehicle_info?.model ||
                      "N/A"}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <p className="text-xs font-semibold uppercase">Camera Name</p>
                  <p className="text-muted-foreground">
                    {latestLeg.streamName || "N/A"}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <p className="text-xs font-semibold uppercase">Hotlist</p>
                  <p className="text-muted-foreground">
                    {latestVehicle.owner?.type || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <MobileCardList>
          {vehicles.map((item) => (
            <DetectionCard
              key={item.id}
              item={item}
              leg={selectLeg(item, isExit)}
              isOverview={isOverview}
              isExit={isExit}
              timezone={timezone}
              onOpen={() => router.push(`/alpr/${item.id}`)}
            />
          ))}
        </MobileCardList>

        <DataTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Plate Image</TableHead>
                <TableHead>Plate</TableHead>
                {isOverview && <TableHead>Vehicle Image</TableHead>}
                <TableHead>Owner Name</TableHead>
                {!isOverview && <TableHead>Stream</TableHead>}
                {!isExit && <TableHead>Entry Time</TableHead>}
                <TableHead>Exit Time</TableHead>
                <TableHead>Employee Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((item) => {
                const leg = selectLeg(item, isExit);

                return (
                  <TableRow
                    key={item.id}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/alpr/${item.id}`)}
                  >
                    <TableCell className="py-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={leg.plateImage ?? undefined}
                        alt="License plate"
                        width={160}
                        height={90}
                        className="h-[90px] w-[160px] rounded border object-contain"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="bg-muted inline-block rounded-md border px-2 py-1 font-mono text-xs font-medium">
                        {isOverview
                          ? item.license_plate
                          : leg.plateNumber || item.license_plate}
                      </span>
                    </TableCell>
                    {isOverview && (
                      <TableCell className="py-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={leg.vehicleImage ?? undefined}
                          alt="Vehicle"
                          width={160}
                          height={90}
                          className="h-[90px] w-[160px] rounded border object-contain"
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-sm">
                      {item.owner?.name || "N/A"}
                    </TableCell>
                    {!isOverview && (
                      <TableCell className="text-sm">
                        {leg.streamName || "N/A"}
                      </TableCell>
                    )}
                    {!isExit && (
                      <TableCell className="text-muted-foreground text-sm">
                        {item.entry_time
                          ? formatDateTimeDisplay(item.entry_time, timezone)
                          : "-"}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground text-sm">
                      {item.exit_time
                        ? formatDateTimeDisplay(item.exit_time, timezone)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.owner?.type || "N/A"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTable>
      </div>

      <TablePagination
        page={metadata.page}
        pageSize={metadata.page_size}
        totalCount={metadata.total_count}
        onPageChange={onPageChange}
      />
    </>
  );
}
