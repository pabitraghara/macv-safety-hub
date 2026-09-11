"use client";

import { useState, useEffect, useCallback } from "react";
import { vehiclesApi } from "./api";
import type {
  Vehicle,
  VehicleHistoryParams,
  VehicleHistoryResponse,
  VehicleListItem,
  VehicleListParams,
  VehiclePaginatedResponse,
} from "./types";
import { ApiError } from "../base/errors";

export function useVehicles(initialParams: VehicleListParams = {}) {
  const [params, setParams] = useState<VehicleListParams>(initialParams);
  const [data, setData] =
    useState<VehiclePaginatedResponse<VehicleListItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const paramsString = JSON.stringify(params);

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await vehiclesApi.getVehicles(params));
    } catch (err) {
      setError((err as ApiError).message);
      setData(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchVehicles();
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilters = useCallback((newParams: Partial<VehicleListParams>) => {
    setParams((p) => ({ ...p, ...newParams }));
  }, []);

  return {
    data,
    loading,
    error,
    initialized,
    params,
    refetch: fetchVehicles,
    updateFilters,
  };
}

export function useVehicle(licensePlate: string | null) {
  const [data, setData] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicle = useCallback(async () => {
    if (!licensePlate) {
      setData(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setData(await vehiclesApi.getVehicleByPlate(licensePlate));
    } catch (err) {
      setError((err as ApiError).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [licensePlate]);

  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  return { data, loading, error, refetch: fetchVehicle };
}

export function useVehicleHistory(
  licensePlate: string | null,
  params: VehicleHistoryParams = {},
) {
  const [data, setData] = useState<VehicleHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paramsString = JSON.stringify(params);

  const fetchHistory = useCallback(async () => {
    if (!licensePlate) {
      setData(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setData(await vehiclesApi.getVehicleHistory(licensePlate, params));
    } catch (err) {
      setError((err as ApiError).message);
      setData(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licensePlate, paramsString]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { data, loading, error, refetch: fetchHistory };
}

export function useWhitelistedVehicles(page = 1, pageSize = 50) {
  const [data, setData] = useState<VehiclePaginatedResponse<Vehicle> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWhitelisted = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await vehiclesApi.getWhitelistedVehicles(page, pageSize));
    } catch (err) {
      setError((err as ApiError).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchWhitelisted();
  }, [fetchWhitelisted]);

  return { data, loading, error, refetch: fetchWhitelisted };
}

export function useBlacklistedVehicles(page = 1, pageSize = 50) {
  const [data, setData] = useState<VehiclePaginatedResponse<Vehicle> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBlacklisted = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await vehiclesApi.getBlacklistedVehicles(page, pageSize));
    } catch (err) {
      setError((err as ApiError).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchBlacklisted();
  }, [fetchBlacklisted]);

  return { data, loading, error, refetch: fetchBlacklisted };
}
