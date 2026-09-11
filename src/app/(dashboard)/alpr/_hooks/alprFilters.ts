import type { AlprListParams, AlprSortField } from "@/api/alpr";

export type DirectionFilter = "all" | "entry" | "exit";

export interface CameraFilterOption {
  id: string;
  name: string;
}

export function normalizeDirection(
  value: string | null | undefined,
): DirectionFilter {
  return value === "entry" || value === "exit" ? value : "all";
}

/** Default sort column mirrors the legacy per-page defaults.
 *
 * "all" sorts by `timestamp`, NOT `entry_time`: a row there is a whole visit,
 * and an exit-only row (vehicle exited without a recorded entry) has
 * `entry_time = null`. Sorting mixed rows by a column half of them lack orders
 * them by a value that isn't there — on 2026-07-29 that put 504 unpaired exits
 * ahead of the day's 219 real entries and the list looked empty for hours.
 * `timestamp` tracks each row's latest event, so rows interleave
 * chronologically whatever their pairing state.
 */
export function sortFieldForDirection(
  direction: DirectionFilter,
): AlprSortField {
  if (direction === "exit") return "exit_time";
  if (direction === "entry") return "entry_time";
  return "timestamp";
}

export interface BuildAlprListParamsInput {
  page: number;
  pageSize: number;
  searchType: "search" | "name";
  licensePlateSearch: string;
  ownerNameSearch: string;
  startDate?: string; // ISO
  endDate?: string; // ISO
  direction: DirectionFilter;
  selectedCameraIds: string[];
  sortBy: AlprSortField;
  sortOrder: "asc" | "desc";
}

export function buildAlprListParams(
  input: BuildAlprListParamsInput,
): AlprListParams {
  const searchValue =
    input.searchType === "search"
      ? input.licensePlateSearch.trim()
      : input.ownerNameSearch.trim();

  const raw = {
    page: input.page,
    page_size: input.pageSize,
    ...(input.searchType === "search"
      ? { search: searchValue || undefined }
      : { name: searchValue || undefined }),
    start_date: input.startDate,
    end_date: input.endDate,
    direction: input.direction === "all" ? undefined : input.direction,
    camera_id:
      input.selectedCameraIds.length > 0
        ? input.selectedCameraIds.join(",")
        : undefined,
    sort_by: input.sortBy,
    sort_order: input.sortOrder,
  };

  return Object.fromEntries(
    Object.entries(raw).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  ) as AlprListParams;
}

export interface AlprSseEvent {
  license_plate?: string | null;
  direction?: string | null;
  entry_stream_name?: string | null;
  exit_stream_name?: string | null;
}

export interface SseFilterState {
  direction: DirectionFilter;
  /** Camera NAMES currently selected. Empty = match all cameras. */
  selectedCameraNames: string[];
}

/** True when a live SSE detection should trigger a refetch under current filters. */
export function sseEventMatchesFilters(
  event: AlprSseEvent,
  filters: SseFilterState,
): boolean {
  if (!event.license_plate) return false;

  if (filters.direction !== "all" && event.direction !== filters.direction) {
    return false;
  }

  if (filters.selectedCameraNames.length > 0) {
    const eventNames = [event.entry_stream_name, event.exit_stream_name].filter(
      Boolean,
    ) as string[];
    if (!eventNames.some((n) => filters.selectedCameraNames.includes(n))) {
      return false;
    }
  }

  return true;
}
