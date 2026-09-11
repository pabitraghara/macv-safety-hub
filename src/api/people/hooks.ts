"use client";

import { useState, useEffect, useCallback } from "react";
import { peopleApi } from "./api";
import type {
  PersonListParams,
  PersonListResponse,
  PersonVehiclesResponse,
  PersonWithVehicles,
} from "./types";
import { ApiError } from "../base/errors";

export function usePeople(initialParams: PersonListParams = {}) {
  const [params, setParams] = useState<PersonListParams>(initialParams);
  const [data, setData] = useState<PersonListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const paramsString = JSON.stringify(params);

  const fetchPeople = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await peopleApi.getPeople(params));
    } catch (err) {
      setError((err as ApiError).message);
      setData(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPeople();
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilters = useCallback((newParams: Partial<PersonListParams>) => {
    setParams((p) => ({ ...p, ...newParams }));
  }, []);

  return {
    data,
    loading,
    error,
    initialized,
    params,
    refetch: fetchPeople,
    updateFilters,
  };
}

export function usePerson(personId: string | null) {
  const [data, setData] = useState<PersonWithVehicles | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPerson = useCallback(async () => {
    if (!personId) {
      setData(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setData(await peopleApi.getPerson(personId));
    } catch (err) {
      setError((err as ApiError).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    fetchPerson();
  }, [fetchPerson]);

  return { data, loading, error, refetch: fetchPerson };
}

export function usePersonVehicles(personId: string | null) {
  const [data, setData] = useState<PersonVehiclesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonVehicles = useCallback(async () => {
    if (!personId) {
      setData(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setData(await peopleApi.getPersonVehicles(personId));
    } catch (err) {
      setError((err as ApiError).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    fetchPersonVehicles();
  }, [fetchPersonVehicles]);

  return { data, loading, error, refetch: fetchPersonVehicles };
}
