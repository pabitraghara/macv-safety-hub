"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import SpeedViolationsTable from "@/components/domain/speed_violations/SpeedViolationsTable";
import { DateRangePickerWithPresets } from "@/components/common/filters/DateRangePicker";
import CameraFilter from "@/components/common/filters/CameraFilter";
import debounce from "lodash.debounce";
import {
  speedViolationsApi,
  createSpeedViolationEventSource,
} from "@/api/speed-violations";
import type {
  SpeedViolation,
  SpeedViolationListParams,
  SpeedViolationListResponse,
} from "@/api/speed-violations";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import ErrorAlert from "@/components/common/ErrorAlert";
import PageHeader from "@/components/common/PageHeader";
import { DateRange } from "@/components/tremor/inputs/DatePicker";
import { toast } from "sonner";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTimezone } from "@/contexts/TimezoneContext";

type SpeedViolationsMetadata = SpeedViolationListResponse["metadata"];

// SSE payload sent on the speed-violations stream: either a violation row or
// an error envelope.
interface SSEErrorData {
  error: string;
}

type SSEData = SpeedViolation | SSEErrorData;

export default function Page() {
  const { timezone } = useTimezone();
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  const [dateRange, setDateRange] = useState<DateRange>({
    from: todayStart,
    to: today,
  });

  // Free-text search covers plate and owner only; cameras are picked from the
  // multi-select below (backend takes camera_id as a comma-separated list).
  const [searchType, setSearchType] = useState<"license_plate" | "owner_name">(
    "license_plate",
  );
  const [licensePlateSearch, setLicensePlateSearch] = useState<string>("");
  const [ownerNameSearch, setOwnerNameSearch] = useState<string>("");
  const [cameraIds, setCameraIds] = useState<string[]>([]);
  const [speedViolations, setSpeedViolations] = useState<SpeedViolation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [metadata, setMetadata] = useState<SpeedViolationsMetadata>({
    total_count: 0,
    page: 1,
    page_size: 20,
  });

  // SSE-related state
  const [streamError, setStreamError] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  const sseRetryCount = useRef(0);
  const lastRefreshTime = useRef<Date>(new Date());

  // Function to handle date change
  const handleDateChange = (newDateRange: DateRange | undefined) => {
    if (newDateRange) {
      setDateRange(newDateRange);
    }
  };

  const cleanParams = useMemo<SpeedViolationListParams>(() => {
    const isSearching = Boolean(
      licensePlateSearch.trim() || ownerNameSearch.trim(),
    );
    const entries = Object.entries({
      has_license_plate: true,
      start_date: dateRange.from?.toISOString(),
      end_date: dateRange.to?.toISOString(),
      timezone,
      license_plate: licensePlateSearch.trim() || undefined,
      owner_name: ownerNameSearch.trim() || undefined,
      camera_id: cameraIds.length > 0 ? cameraIds.join(",") : undefined,
      page: isSearching ? undefined : page,
      page_size: pageSize,
    }).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    );
    return Object.fromEntries(entries) as unknown as SpeedViolationListParams;
  }, [
    dateRange,
    page,
    pageSize,
    licensePlateSearch,
    ownerNameSearch,
    cameraIds,
    timezone,
  ]);

  const fetchSpeedViolations = useCallback(
    debounce(async (params: SpeedViolationListParams) => {
      setIsLoading(true);
      try {
        const response = await speedViolationsApi.getViolations(params);
        setSpeedViolations(response.data);
        setMetadata(response.metadata);
        setError(null);
      } catch (err) {
        console.error("Error fetching speed violations:", err);
        setError("Failed to fetch speed violations. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [],
  );

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when page size changes
  };

  // Function to refresh data when new alerts are detected
  const refreshDataAfterNewAlert = useCallback(() => {
    lastRefreshTime.current = new Date();
    fetchSpeedViolations(cleanParams);
    toast.info("New speed violation detected! Data refreshed.");
  }, [fetchSpeedViolations, cleanParams]);

  // Held in a ref so the SSE effect below doesn't need this (filter-derived)
  // callback in its dependency array — otherwise every filter keystroke would
  // tear down and reopen the EventSource connection.
  const refreshDataAfterNewAlertRef = useRef(refreshDataAfterNewAlert);
  useEffect(() => {
    refreshDataAfterNewAlertRef.current = refreshDataAfterNewAlert;
  }, [refreshDataAfterNewAlert]);

  useEffect(() => {
    setIsLoading(true);
    fetchSpeedViolations(cleanParams);
  }, [cleanParams]);

  // SSE useEffect to monitor for new violations and trigger auto-refresh.
  // EventSource cannot send Authorization headers, so the token is passed
  // as a query parameter. The backend middleware accepts ?token= as a fallback.
  useEffect(() => {
    if (streamError && sseRetryCount.current >= 3) return;

    let eventSource: EventSource | null = null;
    let cancelled = false;

    (async () => {
      try {
        eventSource = await createSpeedViolationEventSource();
      } catch (err) {
        console.error("Failed to open SSE connection:", err);
        setStreamError(true);
        sseRetryCount.current += 1;
        return;
      }
      if (cancelled) {
        eventSource.close();
        return;
      }
      sseRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          setStreamError(false);
          sseRetryCount.current = 0;

          const eventData = JSON.parse(event.data) as SSEData;

          if ("error" in eventData) {
            console.error("SSE stream sent error:", eventData.error);
            setStreamError(true);
            eventSource?.close();
            sseRef.current = null;
            sseRetryCount.current += 1;
            return;
          }

          const newAlert = eventData as SpeedViolation;

          if (
            newAlert.alert_type &&
            (newAlert.alert_type.toLowerCase().includes("speed") ||
              newAlert.alert_type.toLowerCase().includes("violation"))
          ) {
            refreshDataAfterNewAlertRef.current();
          }
        } catch (err) {
          console.error("Error parsing SSE data:", err);
        }
      };

      eventSource.onopen = () => {
        setStreamError(false);
      };

      eventSource.onerror = () => {
        setStreamError(true);
        eventSource?.close();
        sseRef.current = null;
        sseRetryCount.current += 1;
      };
    })();

    return () => {
      cancelled = true;
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [streamError]);

  // Export to CSV
  function convertArrayToCSV(array: SpeedViolation[]): string {
    if (array.length === 0) return "";

    const header =
      "Camera,License Plate,Owner Name,Company,Date & Time,Speed Limit,Average Speed";
    const rows = array.map((obj) => {
      const timestamp = obj.timestamp
        ? new Intl.DateTimeFormat(undefined, {
            timeZone: timezone,
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date(obj.timestamp))
        : "N/A";
      const avgSpeed =
        obj.avg_speed != null ? Number(obj.avg_speed).toFixed(2) : "N/A";
      const speedLimit =
        obj.speed_limit != null ? Number(obj.speed_limit).toFixed(2) : "N/A";
      const licensePlate = obj.license_plate || "N/A";
      const ownerName = obj.owner?.name || "N/A";
      const company = obj.owner?.department || "N/A";

      return [
        obj.camera_name || "N/A",
        licensePlate,
        ownerName,
        company,
        timestamp,
        speedLimit,
        avgSpeed,
      ]
        .map((value) =>
          typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : value,
        )
        .join(",");
    });

    return [header, ...rows].join("\n");
  }

  function exportToCSV(
    data: SpeedViolation[],
    filename: string = "export.csv",
  ): void {
    const csvString = convertArrayToCSV(data);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  }

  const isSearching = Boolean(
    licensePlateSearch.trim() || ownerNameSearch.trim(),
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        title={
          isSearching
            ? `Search Results — ${licensePlateSearch.trim() || ownerNameSearch.trim()}`
            : "Vehicles with Speed Violations"
        }
        actions={
          isSearching ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                setLicensePlateSearch("");
                setOwnerNameSearch("");
                setSearchType("license_plate");
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Violations
            </Button>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePickerWithPresets
            value={dateRange}
            onChange={handleDateChange}
            showTimePicker={true}
          />
          <Select
            value={searchType}
            onValueChange={(value) => {
              setSearchType(value as "license_plate" | "owner_name");
              setLicensePlateSearch("");
              setOwnerNameSearch("");
            }}
          >
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="license_plate">License Plate</SelectItem>
              <SelectItem value="owner_name">Owner Name</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder={
              searchType === "license_plate"
                ? "Enter license plate..."
                : "Enter owner name..."
            }
            value={
              searchType === "license_plate"
                ? licensePlateSearch
                : ownerNameSearch
            }
            onChange={(e) => {
              const value = e.target.value;
              if (searchType === "license_plate") {
                setLicensePlateSearch(value);
              } else {
                setOwnerNameSearch(value);
              }
            }}
            className="h-8 w-48"
          />
          <CameraFilter onCameraChange={setCameraIds} />
          <Select
            value={String(pageSize)}
            onValueChange={(value) => handlePageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={isLoading}
            onClick={() => fetchSpeedViolations(cleanParams)}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button size="sm" className="h-8" onClick={() => setIsOpen(true)}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      <div>
        {isLoading && <LoadingSpinner label="Loading violations..." />}
        {!isLoading && error && (
          <ErrorAlert
            message={error}
            onRetry={() => fetchSpeedViolations(cleanParams)}
          />
        )}
        {!isLoading && !error && speedViolations.length === 0 && (
          <EmptyState
            title="No violations found"
            message={
              isSearching
                ? "No results found for the search criteria."
                : "No vehicles with speed violations found for the selected filters."
            }
          />
        )}
        {!isLoading && !error && speedViolations.length > 0 && (
          <SpeedViolationsTable
            speedViolations={speedViolations}
            metadata={metadata}
            onPageChange={handlePageChange}
            mode={isSearching ? "search_results" : "violations"}
          />
        )}
      </div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Speed Violations</DialogTitle>
            <DialogDescription>
              Export the current list of vehicles with speed violations to a CSV
              file.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                exportToCSV(
                  speedViolations,
                  "vehicles_with_speed_violations.csv",
                )
              }
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
