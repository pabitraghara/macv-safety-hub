"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { incidentsApi } from "./api";
import type {
  Incident,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  IncidentListParams,
  Activity,
  CreateCommentRequest,
  Attachment,
} from "./types";
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

// ─── useIncidents ──────────────────────────────────────────────────────────

export function useIncidents(initialParams: IncidentListParams = {}) {
  const [params, setParams] = useState<IncidentListParams>({
    page: 1,
    page_size: 10,
    ...initialParams,
  });
  const [data, setData] = useState<Incident[]>([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const paramsRef = useRef(params);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const paramsString = JSON.stringify(params);

  const fetchIncidents = useCallback(
    async (fetchParams?: IncidentListParams) => {
      const finalParams = fetchParams ?? paramsRef.current;
      try {
        setLoading(true);
        setError(null);
        const response = await incidentsApi.getIncidents(finalParams);
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
    fetchIncidents(params);
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
    (newParams: Partial<IncidentListParams>) => {
      setParams((p) => ({ ...p, ...newParams, page: 1 }));
    },
    [],
  );

  const updateGenericFilters = useCallback((filterParams: FilterParams) => {
    setParams((p) => {
      const base: IncidentListParams = {
        page: 1,
        page_size: p.page_size ?? 10,
        search: p.search,
      };
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value !== undefined) (base as Record<string, unknown>)[key] = value;
      });
      if (JSON.stringify(base) === JSON.stringify(p)) return p;
      return base;
    });
  }, []);

  const createIncident = useCallback(
    async (incident: CreateIncidentRequest) => {
      try {
        setLoading(true);
        setError(null);
        const created = await incidentsApi.createIncident(incident);
        await fetchIncidents();
        return created;
      } catch (err) {
        setError((err as ApiError).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchIncidents],
  );

  return {
    data,
    pagination,
    loading,
    error,
    params,
    initialized,
    refetch: () => fetchIncidents(),
    createIncident,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    updateFilters,
    updateGenericFilters,
  };
}

// ─── useIncidentByCode ─────────────────────────────────────────────────────────

export function useIncidentByCode(code: string) {
  const [data, setData] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(!!code);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchIncident = useCallback(async () => {
    if (!code) return;
    try {
      setLoading(true);
      setError(null);
      setData(await incidentsApi.getIncidentByCode(code));
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
        await fetchIncident();
        return result;
      } catch (err) {
        setError((err as ApiError).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchIncident],
  );

  useEffect(() => {
    if (code && !initialized) fetchIncident();
  }, [code, initialized, fetchIncident]);

  return {
    data,
    loading,
    error,
    initialized,
    refetch: fetchIncident,
    updateIncident: (updates: UpdateIncidentRequest) =>
      mutate(() => incidentsApi.updateIncident(data!.id, updates)),
    deleteIncident: () => mutate(() => incidentsApi.deleteIncident(data!.id)),
    changeStatus: (status: string) =>
      mutate(() => incidentsApi.changeStatus(code, status)),
    changePriority: (priority: number) =>
      mutate(() => incidentsApi.changePriority(code, priority)),
    changeSeverity: (severity: string) =>
      mutate(() => incidentsApi.changeSeverity(code, severity)),
    changeIncidentType: (typeId: string) =>
      mutate(() => incidentsApi.changeIncidentType(code, typeId)),
    changeSite: (siteId: string) =>
      mutate(() => incidentsApi.changeSite(code, siteId)),
    changeDepartment: (deptId: string) =>
      mutate(() => incidentsApi.changeDepartment(code, deptId)),
    changeDueDate: (dueBy: string) =>
      mutate(() => incidentsApi.changeDueDate(code, dueBy)),
    resolveIncident: () => mutate(() => incidentsApi.resolveIncident(code)),
    assignIncident: (userId: string) =>
      mutate(() => incidentsApi.assignIncident(code, userId)),
  };
}

// ─── useIncidentActivities ─────────────────────────────────────────────────

export function useIncidentActivities(code: string, includeComments = true) {
  const [data, setData] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!code) return;
    try {
      setLoading(true);
      setError(null);
      setData(await incidentsApi.getActivities(code, includeComments));
    } catch (err) {
      setError((err as ApiError).message);
      setData([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [code, includeComments]);

  useEffect(() => {
    if (code && !initialized) fetchActivities();
  }, [code, initialized, fetchActivities]);

  return { data, loading, error, initialized, refetch: fetchActivities };
}

// ─── useAddIncidentComment ────────────────────────────────────────────────────

export function useAddIncidentComment(code: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addComment = useCallback(
    async (comment: string, parentCommentId?: string) => {
      if (!code) return;
      const data: CreateCommentRequest = {
        comment,
        ...(parentCommentId && { parent_comment_id: parentCommentId }),
      };
      try {
        setLoading(true);
        setError(null);
        return await incidentsApi.addComment(code, data);
      } catch (err) {
        setError((err as ApiError).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [code],
  );

  return { loading, error, addComment };
}

// ─── useIncidentAttachments ────────────────────────────────────────────────

export function useIncidentAttachments(code: string) {
  const [data, setData] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchAttachments = useCallback(async () => {
    if (!code) return;
    try {
      setLoading(true);
      setError(null);
      setData(await incidentsApi.getAttachments(code));
    } catch (err) {
      setError((err as ApiError).message);
      setData([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [code]);

  const uploadAttachment = useCallback(
    async (file: File) => {
      if (!code) return;
      try {
        setLoading(true);
        setError(null);
        const attachment = await incidentsApi.uploadAttachment(code, file);
        setData((prev) => [...prev, attachment]);
        return attachment;
      } catch (err) {
        setError((err as ApiError).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [code],
  );

  useEffect(() => {
    if (code && !initialized) fetchAttachments();
  }, [code, initialized, fetchAttachments]);

  return {
    data,
    loading,
    error,
    initialized,
    refetch: fetchAttachments,
    uploadAttachment,
  };
}
