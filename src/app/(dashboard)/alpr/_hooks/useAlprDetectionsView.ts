"use client";

import debounce from "lodash.debounce";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  alprApi,
  createAlprEventSource,
  type AlprDetection,
  type AlprListResponse,
} from "@/api/alpr";
import { camerasApi } from "@/api/cameras";
import { useTimezone } from "@/contexts/TimezoneContext";
import { DateRange } from "@/components/tremor/inputs/DatePicker";
import {
  buildAlprListParams,
  sortFieldForDirection,
  sseEventMatchesFilters,
  type CameraFilterOption,
  type DirectionFilter,
} from "./alprFilters";

export interface UseAlprDetectionsViewOptions {
  initialDirection?: DirectionFilter; // from ?direction=, default "all"
}

export interface UseAlprDetectionsViewResult {
  vehicles: AlprDetection[];
  metadata: AlprListResponse["metadata"];
  summary: AlprListResponse["aggregated_data"] | undefined;
  isLoading: boolean;
  /**
   * A background refresh (SSE-triggered) is in flight. Unlike `isLoading`
   * this must NOT blank the list — the current rows stay mounted and are
   * swapped in place when the response lands. Use it for a subtle indicator
   * (e.g. spinning the refresh icon) only.
   */
  isRefreshing: boolean;
  error: string | null;
  streamError: boolean;

  dateRange: DateRange;
  handleDateChange: (r: DateRange | undefined) => void;

  direction: DirectionFilter;
  setDirection: (d: DirectionFilter) => void;

  cameraOptions: CameraFilterOption[];
  selectedCameraIds: string[];
  setSelectedCameraIds: (ids: string[]) => void;

  searchType: "search" | "name";
  changeSearchType: (t: "search" | "name") => void;
  licensePlateSearch: string;
  ownerNameSearch: string;
  setSearch: (value: string) => void;

  page: number;
  pageSize: number;
  handlePageChange: (p: number) => void;
  handlePageSizeChange: (n: number) => void;

  refetch: () => void;
  exportData: (format: "csv" | "pdf") => Promise<void>;
}

function downloadBlob(blob: Blob, fileName: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export function useAlprDetectionsView(
  options: UseAlprDetectionsViewOptions = {},
): UseAlprDetectionsViewResult {
  const { timezone } = useTimezone();

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  const [dateRange, setDateRange] = useState<DateRange>({
    from: todayStart,
    to: today,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<AlprDetection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [metadata, setMetadata] = useState<AlprListResponse["metadata"]>({
    total_count: 0,
    page: 1,
    page_size: 10,
  });
  const [summary, setSummary] = useState<
    AlprListResponse["aggregated_data"] | undefined
  >(undefined);
  const [searchType, setSearchType] = useState<"search" | "name">("search");
  const [licensePlateSearch, setLicensePlateSearch] = useState("");
  const [ownerNameSearch, setOwnerNameSearch] = useState("");
  const [sortOrder] = useState<"asc" | "desc">("desc");

  const [direction, setDirectionState] = useState<DirectionFilter>(
    options.initialDirection ?? "all",
  );
  const [selectedCameraIds, setSelectedCameraIdsState] = useState<string[]>([]);
  const [cameraOptions, setCameraOptions] = useState<CameraFilterOption[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  const sseRetryCount = useRef(0);

  // Fetch camera options for the multi-select. Keep only ALPR-capable
  // cameras; fall back to all cameras if the detection_types filter yields
  // nothing (defensive — detection_types may be null/missing).
  useEffect(() => {
    let cancelled = false;
    camerasApi
      .getCameras()
      .then((cameras) => {
        if (cancelled) return;
        const all = cameras.map((c) => ({ id: c.id, name: c.name }));
        const alprOnly = cameras
          .filter((c) => c.detection_types?.includes("alpr"))
          .map((c) => ({ id: c.id, name: c.name }));
        setCameraOptions(alprOnly.length > 0 ? alprOnly : all);
      })
      .catch(() => {
        if (!cancelled) setCameraOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCameraNames = useMemo(
    () =>
      cameraOptions
        .filter((c) => selectedCameraIds.includes(c.id))
        .map((c) => c.name),
    [cameraOptions, selectedCameraIds],
  );

  /**
   * `silent` marks a background refresh (a live detection arriving over SSE)
   * rather than a user-initiated load. Silent refreshes never touch
   * `isLoading`, so the table is not unmounted and replaced by a spinner
   * every time a vehicle passes the gate — rows are swapped in place.
   *
   * A silent refresh also leaves any existing `error` untouched on failure:
   * a transient background fetch must not replace a list the user is
   * reading with an error state. The next user-initiated load surfaces it.
   */
  const fetchVehicles = useCallback(
    debounce(
      async (
        params: ReturnType<typeof buildAlprListParams>,
        opts: { silent?: boolean } = {},
      ) => {
        const silent = opts.silent === true;
        if (silent) setIsRefreshing(true);
        else setIsLoading(true);
        try {
          const response = await alprApi.getDetections(params);
          setVehicles(response.data);
          setMetadata(response.metadata);
          setSummary(response.aggregated_data);
          setError(null);
        } catch (err) {
          console.error("Error fetching vehicles:", err);
          if (!silent) setError("Failed to fetch vehicles. Please try again.");
        } finally {
          if (silent) setIsRefreshing(false);
          else setIsLoading(false);
        }
      },
      500,
    ),
    [],
  );

  const cleanParams = useMemo(
    () =>
      buildAlprListParams({
        page,
        pageSize,
        searchType,
        licensePlateSearch,
        ownerNameSearch,
        startDate: dateRange.from?.toISOString(),
        endDate: dateRange.to?.toISOString(),
        direction,
        selectedCameraIds,
        sortBy: sortFieldForDirection(direction),
        sortOrder,
      }),
    [
      page,
      pageSize,
      searchType,
      licensePlateSearch,
      ownerNameSearch,
      dateRange,
      direction,
      selectedCameraIds,
      sortOrder,
    ],
  );

  const handlePageChange = (newPage: number) => setPage(newPage);

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const handleDateChange = (newDateRange: DateRange | undefined) => {
    if (!newDateRange) return;
    setDateRange(newDateRange);
    setPage(1);
  };

  const setDirection = (d: DirectionFilter) => {
    setDirectionState(d);
    setPage(1);
  };

  const setSelectedCameraIds = (ids: string[]) => {
    setSelectedCameraIdsState(ids);
    setPage(1);
  };

  const changeSearchType = (t: "search" | "name") => {
    setSearchType(t);
    setLicensePlateSearch("");
    setOwnerNameSearch("");
    setPage(1);
  };

  const setSearch = (value: string) => {
    if (searchType === "search") setLicensePlateSearch(value);
    else setOwnerNameSearch(value);
    setPage(1);
  };

  const refreshDataAfterNewAlert = useCallback(() => {
    fetchVehicles(cleanParams, { silent: true });
    // Fixed id: a busy gate fires these back-to-back, and without it sonner
    // stacks a new toast per vehicle. Reusing the id replaces the existing
    // toast in place instead.
    toast.info("New vehicle detected", { id: "alpr-new-detection" });
  }, [fetchVehicles, cleanParams]);

  // Held in refs so the SSE effect below doesn't need these (filter-derived)
  // values in its dependency array — otherwise every filter keystroke would
  // tear down and reopen the EventSource connection.
  const refreshRef = useRef(refreshDataAfterNewAlert);
  useEffect(() => {
    refreshRef.current = refreshDataAfterNewAlert;
  }, [refreshDataAfterNewAlert]);

  const filterRef = useRef({ direction, selectedCameraNames });
  useEffect(() => {
    filterRef.current = { direction, selectedCameraNames };
  }, [direction, selectedCameraNames]);

  const exportData = useCallback(
    async (format: "csv" | "pdf") => {
      const params = {
        start_date: dateRange.from?.toISOString(),
        end_date: dateRange.to?.toISOString(),
        timezone,
      };
      try {
        const isPdf = format === "pdf";
        let blob: Blob;
        let prefix: string;
        if (isPdf) {
          blob = await alprApi.exportPdf(params);
          prefix = "alpr_data";
        } else if (direction === "entry") {
          blob = await alprApi.exportEntry(params);
          prefix = "entry_vehicles";
        } else if (direction === "exit") {
          blob = await alprApi.exportExit(params);
          prefix = "exit_vehicles";
        } else {
          blob = await alprApi.exportOverview(params);
          prefix = "alpr_data";
        }
        const ext = isPdf ? "pdf" : "xlsx";
        downloadBlob(
          blob,
          `${prefix}_${new Date().toISOString().split("T")[0]}.${ext}`,
        );
        toast.success(`${format.toUpperCase()} exported successfully!`);
      } catch (err) {
        console.error("Export error:", err);
        toast.error("Failed to export data");
        throw err;
      }
    },
    [dateRange, timezone, direction],
  );

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => fetchVehicles(cleanParams), 0);
    return () => clearTimeout(timer);
  }, [cleanParams, fetchVehicles]);

  useEffect(() => {
    if (streamError && sseRetryCount.current >= 3) return;

    let cancelled = false;

    createAlprEventSource()
      .then((eventSource) => {
        if (cancelled) {
          eventSource.close();
          return;
        }
        sseRef.current = eventSource;

        eventSource.onopen = () => setStreamError(false);

        eventSource.onmessage = (event) => {
          try {
            setStreamError(false);
            sseRetryCount.current = 0;
            const eventData = JSON.parse(event.data);
            if ("error" in eventData) {
              console.error("[SSE] Stream sent error:", eventData.error);
              setStreamError(true);
              eventSource.close();
              sseRef.current = null;
              sseRetryCount.current += 1;
              return;
            }
            if (sseEventMatchesFilters(eventData, filterRef.current)) {
              refreshRef.current();
            }
          } catch (err) {
            console.error("[SSE] Error parsing alert data:", err);
          }
        };

        eventSource.onerror = (err) => {
          console.error("[SSE] Connection error:", err);
          setStreamError(true);
          eventSource.close();
          sseRef.current = null;
          sseRetryCount.current += 1;
        };
      })
      .catch((err) => {
        console.error("Failed to open SSE connection:", err);
        setStreamError(true);
        sseRetryCount.current += 1;
      });

    return () => {
      cancelled = true;
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [streamError]);

  return {
    vehicles,
    metadata,
    summary,
    isLoading,
    isRefreshing,
    error,
    streamError,

    dateRange,
    handleDateChange,

    direction,
    setDirection,

    cameraOptions,
    selectedCameraIds,
    setSelectedCameraIds,

    searchType,
    changeSearchType,
    licensePlateSearch,
    ownerNameSearch,
    setSearch,

    page,
    pageSize,
    handlePageChange,
    handlePageSizeChange,

    refetch: () => fetchVehicles(cleanParams),
    exportData,
  };
}
