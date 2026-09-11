"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useTimezone } from "@/contexts/TimezoneContext";
import { ImageOff } from "lucide-react";

// Canonical flat violation row. Everything the table renders is optional so
// callers that only have a subset (e.g. vehicle history rows) still fit.
interface SpeedViolationRow {
  id: string;
  timestamp?: string | null;
  camera_name?: string | null;
  license_plate?: string | null;
  avg_speed?: number | null;
  max_speed?: number | null;
  speed_limit?: number | null;
  thumbnail_url?: string | null;
  monthly_violation_count?: number;
  warning_level?: string | null;
  owner?: {
    name?: string | null;
    department?: string | null;
  } | null;
}

interface SpeedViolationsTableProps {
  speedViolations: SpeedViolationRow[];
  metadata: {
    total_count: number;
    page: number;
    page_size: number;
  };
  onPageChange: (page: number) => void;
  onSearch?: (searchTerm: string) => void;
  searchTerm?: string;
  mode?: "violations" | "search_results";
  hideOwnerColumns?: boolean; // Hide owner name and company columns
}

/**
 * Timezone-aware timestamp rendering. The platform has no shared
 * `formatDateTimeDisplay` helper, so we format inline with Intl in the
 * user's active timezone (from TimezoneContext).
 */
function formatTimestamp(timestamp: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return timestamp;
  }
}

const SpeedViolationsTable = ({
  speedViolations,
  metadata,
  onPageChange,
  hideOwnerColumns = false,
}: SpeedViolationsTableProps) => {
  const router = useRouter();
  const { timezone } = useTimezone();

  const detailUrl = (id: string) => `/vehicles/overview/${id}`;

  return (
    <>
      <MobileCardList>
        {speedViolations.map((item) => {
          const fields: RecordCardField[] = [
            { label: "Camera", value: item.camera_name || "—", full: true },
          ];
          if (!hideOwnerColumns) {
            fields.push(
              { label: "Owner Name", value: item.owner?.name || "—" },
              { label: "Company", value: item.owner?.department || "—" },
            );
          }
          fields.push(
            {
              label: "Limit (km/h)",
              value:
                item.speed_limit != null
                  ? Number(item.speed_limit).toFixed(1)
                  : "—",
            },
            {
              label: "Speed (km/h)",
              value: (
                <span className="text-destructive font-semibold tabular-nums">
                  {item.avg_speed != null
                    ? Number(item.avg_speed).toFixed(1)
                    : "—"}
                </span>
              ),
            },
          );

          return (
            <RecordCard
              key={item.id}
              onClick={() => router.push(detailUrl(item.id))}
              media={
                item.thumbnail_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.thumbnail_url}
                    alt="Violation thumbnail"
                    className="h-16 w-28 rounded-lg border object-cover"
                  />
                ) : (
                  <div className="bg-muted flex h-16 w-28 items-center justify-center rounded-lg border">
                    <ImageOff className="text-muted-foreground h-4 w-4" />
                  </div>
                )
              }
              title={
                item.license_plate ? (
                  <Link
                    href={`/vehicles/${encodeURIComponent(item.license_plate)}`}
                    className="bg-muted hover:bg-accent inline-block rounded-md border px-2 py-1 font-mono text-xs font-medium transition-colors hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.license_plate}
                  </Link>
                ) : (
                  <span className="text-muted-foreground font-mono text-xs">
                    N/A
                  </span>
                )
              }
              subtitle={
                item.timestamp
                  ? formatTimestamp(item.timestamp, timezone)
                  : undefined
              }
              fields={fields}
            />
          );
        })}
      </MobileCardList>

      <DataTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[130px]">Thumbnail</TableHead>
              <TableHead>Camera</TableHead>
              <TableHead>License Plate</TableHead>
              {!hideOwnerColumns && (
                <>
                  <TableHead>Owner Name</TableHead>
                  <TableHead>Company</TableHead>
                </>
              )}
              <TableHead>Date &amp; Time</TableHead>
              <TableHead className="text-right">Limit (km/h)</TableHead>
              <TableHead className="text-right">Speed (km/h)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {speedViolations.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={() => router.push(detailUrl(item.id))}
              >
                <TableCell className="py-2">
                  {item.thumbnail_url ? (
                    <div className="relative h-16 w-28 overflow-hidden rounded-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnail_url}
                        alt="Violation thumbnail"
                        className="h-16 w-28 object-cover transition-transform duration-200 hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="bg-muted flex h-16 w-28 items-center justify-center rounded-lg border">
                      <ImageOff className="text-muted-foreground h-4 w-4" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {item.camera_name || "—"}
                </TableCell>
                <TableCell>
                  {item.license_plate ? (
                    <Link
                      href={`/vehicles/${encodeURIComponent(item.license_plate)}`}
                      className="bg-muted hover:bg-accent inline-block rounded-md border px-2 py-1 font-mono text-xs font-medium transition-colors hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.license_plate}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground font-mono text-xs">
                      N/A
                    </span>
                  )}
                </TableCell>
                {!hideOwnerColumns && (
                  <>
                    <TableCell className="text-sm">
                      <div
                        className="max-w-32 truncate"
                        title={item.owner?.name || undefined}
                      >
                        {item.owner?.name || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div
                        className="max-w-32 truncate"
                        title={item.owner?.department || undefined}
                      >
                        {item.owner?.department || "—"}
                      </div>
                    </TableCell>
                  </>
                )}
                <TableCell className="text-muted-foreground text-sm">
                  {item.timestamp
                    ? formatTimestamp(item.timestamp, timezone)
                    : "—"}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {item.speed_limit != null
                    ? Number(item.speed_limit).toFixed(1)
                    : "—"}
                </TableCell>
                <TableCell className="text-destructive text-right text-sm font-semibold tabular-nums">
                  {item.avg_speed != null
                    ? Number(item.avg_speed).toFixed(1)
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTable>

      <TablePagination
        page={metadata.page}
        pageSize={metadata.page_size}
        totalCount={metadata.total_count}
        onPageChange={onPageChange}
      />
    </>
  );
};

export default SpeedViolationsTable;
