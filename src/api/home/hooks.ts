"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { observationsApiHomePage } from "./api";
import type {
  Observation,
  CreateObservationRequest,
  TriageObservationRequest,
  ObservationListParams,
  ObservationStatus,
} from "../observations/types";
import type { FilterParams } from "@/api/filters/types";
import { ApiError } from "../base/errors";

const DEFAULT_PAGINATION = {
  total_items: 0,
  page_size: 10,
  current_page: 1,
  total_pages: 0,
  has_next: false,
  has_previous: false,
};

// ─── useObservations ──────────────────────────────────────────────────────────

export function useObservations(initialParams: ObservationListParams = {}) {
  const [params, setParams] = useState<ObservationListParams>({
    // page: 1,
    // page_size: 10,
    ...initialParams,
  });
  const [data, setData] = useState<Observation[]>([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const paramsRef = useRef(params);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const paramsString = JSON.stringify(params);

  const fetchObservations = useCallback(
    async (fetchParams?: ObservationListParams) => {
      const finalParams = fetchParams ?? paramsRef.current;
      try {
        setLoading(true);
        setError(null);
        const response =
          await observationsApiHomePage.getObservationsHomePage(finalParams);
        if (Array.isArray(response)) {
          setData(response);
          setPagination({
            ...DEFAULT_PAGINATION,
            total_items: response.length,
            page_size: response.length,
            total_pages: 1,
          });
        } else {
          setData(response.items);
          setPagination(response.pagination);
        }
      } catch (err) {
        setError((err as ApiError).message);
        setData([]);
        setPagination(DEFAULT_PAGINATION);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    },
    [paramsString],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchObservations(params);
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToPage = useCallback((page: number) => {
    setParams((p) => ({ ...p, page }));
  }, []);

  const nextPage = useCallback(() => {
    if (pagination.has_next) goToPage(pagination.current_page + 1);
  }, [pagination.has_next, pagination.current_page, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination.has_previous) goToPage(pagination.current_page - 1);
  }, [pagination.has_previous, pagination.current_page, goToPage]);

  const setPageSize = useCallback((page_size: number) => {
    setParams((p) => ({ ...p, page_size, page: 1 }));
  }, []);

  const updateFilters = useCallback(
    (newParams: Partial<ObservationListParams>) => {
      setParams((p) => ({ ...p, ...newParams, page: 1 }));
    },
    [],
  );

  const updateGenericFilters = useCallback((filterParams: FilterParams) => {
    setParams((p) => {
      const base: ObservationListParams = {
        page: 1,
        page_size: p.page_size ?? 10,
      };
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value !== undefined) (base as Record<string, unknown>)[key] = value;
      });
      if (JSON.stringify(base) === JSON.stringify(p)) return p;
      return base;
    });
  }, []);

  const createObservation = useCallback(
    async (observation: CreateObservationRequest) => {
      try {
        setLoading(true);
        setError(null);
        const created =
          await observationsApiHomePage.createObservation(observation);
        await fetchObservations();
        return created;
      } catch (err) {
        setError((err as ApiError).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchObservations],
  );

  return {
    data,
    pagination,
    loading,
    error,
    params,
    initialized,
    refetch: () => fetchObservations(),
    createObservation,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    updateFilters,
    updateGenericFilters,
  };
}

// ─── useObservationByCode ─────────────────────────────────────────────────────

export function useObservationByCode(code: string) {
  const [data, setData] = useState<Observation | null>(null);
  const [loading, setLoading] = useState(!!code);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchObservation = useCallback(async () => {
    if (!code) return;
    try {
      setLoading(true);
      setError(null);
      setData(await observationsApiHomePage.getObservationByCode(code));
    } catch (err) {
      setError((err as ApiError).message);
      setData(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [code]);

  const mutate = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn();
        await fetchObservation();
        return result;
      } catch (err) {
        setError((err as ApiError).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchObservation],
  );

  // Refetch whenever `code` changes. The modal keeps this hook mounted and
  // only swaps the `code` prop, so gating on `initialized` would lock it to
  // the first observation loaded (showing the same image every time).
  useEffect(() => {
    if (code) {
      fetchObservation();
    } else {
      setData(null);
      setError(null);
    }
  }, [code, fetchObservation]);

  return {
    data,
    loading,
    error,
    initialized,
    refetch: fetchObservation,
    deleteObservation: () =>
      mutate(() => observationsApiHomePage.deleteObservation(code)),
    triageObservation: (triageData: TriageObservationRequest) =>
      mutate(() => observationsApiHomePage.triageObservation(code, triageData)),
    setStatus: (status: ObservationStatus, notes?: string) =>
      mutate(() =>
        observationsApiHomePage.triageObservation(code, {
          review_status: status,
          review_notes: notes,
        }),
      ),
  };
}
