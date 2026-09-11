"use client";

import { useState, useEffect, useCallback } from "react";
import { speedViolationsApi } from "./api";
import type {
  SpeedViolation,
  SpeedViolationDetail,
  SpeedViolationDetailParams,
  SpeedViolationListParams,
} from "./types";
import { ApiError } from "../base/errors";

export function useSpeedViolations(
  initialParams: SpeedViolationListParams = {},
) {
  const [params, setParams] = useState<SpeedViolationListParams>(initialParams);
  const [data, setData] = useState<SpeedViolation[]>([]);
  const [metadata, setMetadata] = useState({
    total_count: 0,
    page: 1,
    page_size: 20,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const paramsString = JSON.stringify(params);

  const fetchViolations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await speedViolationsApi.getViolations(params);
      setData(response.data);
      setMetadata(response.metadata);
    } catch (err) {
      setError((err as ApiError).message);
      setData([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchViolations();
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilters = useCallback(
    (newParams: Partial<SpeedViolationListParams>) => {
      setParams((p) => ({ ...p, ...newParams }));
    },
    [],
  );

  return {
    data,
    metadata,
    loading,
    error,
    initialized,
    params,
    refetch: fetchViolations,
    updateFilters,
  };
}

export function useSpeedViolation(
  violationId: string | undefined,
  params: SpeedViolationDetailParams = {},
) {
  const [data, setData] = useState<SpeedViolationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paramsString = JSON.stringify(params);

  const fetchViolation = useCallback(async () => {
    if (!violationId) return;
    try {
      setLoading(true);
      setError(null);
      setData(await speedViolationsApi.getViolation(violationId, params));
    } catch (err) {
      setError((err as ApiError).message);
      setData(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [violationId, paramsString]);

  useEffect(() => {
    fetchViolation();
  }, [fetchViolation]);

  return { data, loading, error, refetch: fetchViolation };
}
