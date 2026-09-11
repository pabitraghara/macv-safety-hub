"use client";

import { useState, useEffect, useCallback } from "react";
import { alprApi } from "./api";
import type {
  AlprAnalyticsParams,
  AlprAnalyticsSummary,
  AlprDetection,
  AlprDirectionStats,
  AlprFilterOptions,
  AlprHeatmap,
  AlprListParams,
} from "./types";
import { ApiError } from "../base/errors";

export function useAlprDetections(initialParams: AlprListParams = {}) {
  const [params, setParams] = useState<AlprListParams>(initialParams);
  const [data, setData] = useState<AlprDetection[]>([]);
  const [metadata, setMetadata] = useState({
    total_count: 0,
    page: 1,
    page_size: 10,
  });
  const [aggregatedData, setAggregatedData] = useState<{
    entry: AlprDirectionStats;
    exit: AlprDirectionStats;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const paramsString = JSON.stringify(params);

  const fetchDetections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await alprApi.getDetections(params);
      setData(response.data);
      setMetadata(response.metadata);
      setAggregatedData(response.aggregated_data);
    } catch (err) {
      setError((err as ApiError).message);
      setData([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDetections();
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilters = useCallback((newParams: Partial<AlprListParams>) => {
    setParams((p) => ({ ...p, ...newParams }));
  }, []);

  return {
    data,
    metadata,
    aggregatedData,
    loading,
    error,
    initialized,
    params,
    refetch: fetchDetections,
    updateFilters,
  };
}

export function useAlprDetection(detectionId: string | undefined) {
  const [data, setData] = useState<AlprDetection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetection = useCallback(async () => {
    if (!detectionId) return;
    try {
      setLoading(true);
      setError(null);
      setData(await alprApi.getDetection(detectionId));
    } catch (err) {
      setError((err as ApiError).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [detectionId]);

  useEffect(() => {
    fetchDetection();
  }, [fetchDetection]);

  return { data, loading, error, refetch: fetchDetection };
}

export function useAlprAnalyticsSummary(params: AlprAnalyticsParams = {}) {
  const [data, setData] = useState<AlprAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paramsString = JSON.stringify(params);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await alprApi.getAnalyticsSummary(params));
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSummary();
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: fetchSummary };
}

export function useAlprHeatmap(params: AlprAnalyticsParams = {}) {
  const [data, setData] = useState<AlprHeatmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paramsString = JSON.stringify(params);

  const fetchHeatmap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await alprApi.getHeatmap(params));
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchHeatmap();
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: fetchHeatmap };
}

export function useAlprFilterOptions(
  params: Pick<AlprAnalyticsParams, "start_date" | "end_date"> = {},
) {
  const [data, setData] = useState<AlprFilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paramsString = JSON.stringify(params);

  const fetchFilterOptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await alprApi.getFilterOptions(params));
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchFilterOptions();
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: fetchFilterOptions };
}
