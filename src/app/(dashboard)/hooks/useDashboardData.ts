"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { observationsApi } from "@/api/observations/api";
import { incidentsApi } from "@/api/incidents/api";
import type {
  DailyViolationTypeEntry,
  Observation,
  ObservationStats,
} from "@/api/observations/types";
import type { Incident } from "@/api/incidents/types";
import type { PaginatedResponse } from "@/api/base/http";

async function fetchAllIncidents(): Promise<{
  items: Incident[];
  total: number;
}> {
  const res = await incidentsApi.getIncidents({
    page: 1,
    page_size: 50,
  });
  if (Array.isArray(res)) return { items: res, total: res.length };
  const paginated = res as PaginatedResponse<Incident>;
  return { items: paginated.items, total: paginated.pagination.total_items };
}

/**
 * Dashboard aggregates for a trailing window.
 *
 * `days` is forwarded to the stats endpoints so every chart reflects the
 * selected range — the window is applied server-side, not by re-slicing a
 * fixed payload on the client.
 */
export function useDashboardData(days: number = 30) {
  const { activeOrgId } = useAuth();
  const [stats, setStats] = useState<ObservationStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [recentObservations, setRecentObservations] = useState<Observation[]>(
    [],
  );
  const [dailyByViolationType, setDailyByViolationType] = useState<
    DailyViolationTypeEntry[]
  >([]);
  const [loading, setLoading] = useState(true);
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    try {
      const [obsStats, incResult, obsResult, vtTrend] = await Promise.all([
        observationsApi.getStats(days),
        fetchAllIncidents(),
        observationsApi.getObservations({ page: 1, page_size: 10 }),
        observationsApi.getDailyByViolationType(days),
      ]);
      if (id !== fetchIdRef.current) return;
      setStats(obsStats);
      setIncidents(incResult.items);
      const obsItems = Array.isArray(obsResult)
        ? obsResult
        : (obsResult as PaginatedResponse<Observation>).items;
      setRecentObservations(obsItems);
      setDailyByViolationType(vtTrend);
    } catch {
      if (id !== fetchIdRef.current) return;
      setStats(null);
      setIncidents([]);
      setRecentObservations([]);
      setDailyByViolationType([]);
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, [activeOrgId, days]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeOrgId) fetchData();
    return () => {
      fetchIdRef.current++;
    };
  }, [activeOrgId, fetchData]);

  const openObservations = stats?.open ?? 0;
  const escalatedObservations = stats?.escalated ?? 0;
  const criticalObservations = stats?.critical ?? 0;

  const openIncidents = incidents.filter(
    (i) => i.status === "open" || i.status === "in_progress",
  ).length;
  const criticalIncidents = incidents.filter(
    (i) =>
      i.severity.toLowerCase() === "critical" &&
      i.status !== "resolved" &&
      i.status !== "closed",
  ).length;

  const incSeverities = incidents.reduce<Record<string, number>>((acc, i) => {
    const s = i.severity.toLowerCase();
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const incStatuses = incidents.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1;
    return acc;
  }, {});

  const obsSeverities = (stats?.by_severity ?? []).reduce<
    Record<string, number>
  >((acc, { severity, count }) => {
    acc[severity.toLowerCase()] = count;
    return acc;
  }, {});

  const recentIncidents = [...incidents]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  return {
    loading,
    stats,
    incidents,
    recentObservations,
    dailyByViolationType,
    openObservations,
    escalatedObservations,
    criticalObservations,
    openIncidents,
    criticalIncidents,
    obsSeverities,
    incSeverities,
    incStatuses,
    recentIncidents,
  };
}
