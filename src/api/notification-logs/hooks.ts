"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notificationLogsApi } from "./api";
import { ApiError } from "../base/errors";
import type { PaginatedResponse } from "../base/http";
import type {
  DeliveryLogEntry,
  DeliveryLogFilters,
  DeliveryLogSummary,
  DeliverySummaryFilters,
} from "./types";

type Pagination = PaginatedResponse<DeliveryLogEntry>["pagination"];

const EMPTY_PAGINATION: Pagination = {
  total_items: 0,
  page_size: 25,
  current_page: 1,
  total_pages: 0,
  has_next: false,
  has_previous: false,
};

const EMPTY_SUMMARY: DeliveryLogSummary = {
  sent: 0,
  failed: 0,
  suppressed: 0,
  queued: 0,
};

export interface FetchOptions {
  /**
   * Hold the request until the caller's filters are settled. A relative date
   * window can only be anchored in an effect (reading the clock during render
   * is impure), so without this the first paint would fire a throwaway query
   * against the wrong range.
   */
  enabled?: boolean;
}

/**
 * Paginated delivery log for the current organisation.
 *
 * Callers pass a fresh object literal every render, so the effect keys off a
 * serialized copy rather than the reference. Overlapping fetches (rapid filter
 * changes) can resolve out of order, so a monotonic request token lets only
 * the newest response commit — a stale one can never clobber fresher state.
 */
export function useDeliveryLog(
  filters: DeliveryLogFilters = {},
  { enabled = true }: FetchOptions = {},
) {
  const [items, setItems] = useState<DeliveryLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const filtersKey = JSON.stringify(filters);
  const requestIdRef = useRef(0);

  const fetchLogs = useCallback(async () => {
    // Not ready yet: stay in the loading state rather than flashing an empty
    // table, and refetch as soon as the caller enables us.
    if (!enabled) {
      setLoading(true);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await notificationLogsApi.list(
        JSON.parse(filtersKey) as DeliveryLogFilters,
      );
      if (requestId !== requestIdRef.current) return;
      setItems(response.items);
      setPagination(response.pagination);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError((err as ApiError).message);
      setItems([]);
      setPagination(EMPTY_PAGINATION);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setInitialized(true);
      }
    }
  }, [filtersKey, enabled]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return { items, pagination, loading, error, initialized, refetch: fetchLogs };
}

/** Per-status tallies for the same range the table is showing. */
export function useDeliverySummary(
  filters: DeliverySummaryFilters = {},
  { enabled = true }: FetchOptions = {},
) {
  const [summary, setSummary] = useState<DeliveryLogSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);
  const requestIdRef = useRef(0);

  const fetchSummary = useCallback(async () => {
    if (!enabled) {
      setLoading(true);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await notificationLogsApi.summary(
        JSON.parse(filtersKey) as DeliverySummaryFilters,
      );
      if (requestId !== requestIdRef.current) return;
      setSummary(response);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError((err as ApiError).message);
      setSummary(EMPTY_SUMMARY);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [filtersKey, enabled]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}
