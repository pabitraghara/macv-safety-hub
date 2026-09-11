"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  cranesApi,
  useCraneAlertStream,
  type CraneLiveResponse,
  type CraneProximityAlert,
} from "@/api/cranes";
import { ApiError } from "@/api/base/errors";

/** Matches the edge's fastest sensible cadence without hammering the API. */
const POLL_INTERVAL_MS = 3000;

export interface UseCraneLiveViewOptions {
  /**
   * False makes the hook inert — neither the poll nor the alert stream starts.
   * The page passes `crane:view` here, so a user without it issues no request.
   */
  enabled?: boolean;
}

export interface UseCraneLiveViewResult {
  live: CraneLiveResponse | null;
  openAlerts: CraneProximityAlert[];
  loading: boolean;
  error: string | null;
  /** True once the first poll has settled, successfully or not. */
  initialized: boolean;
  /** The SSE alert stream is down; polling still keeps the view current. */
  streamError: boolean;
  refresh: () => void;
  acknowledge: (alertId: string) => Promise<void>;
}

/**
 * The live crane view: positions polled on a timer, alerts nudged by SSE.
 *
 * There is no SSE stream for positions, so `/cranes/positions/live` is polled
 * every 3 s (the plan's cadence). The alert stream exists, but it is used only
 * as a trigger to re-read the open-alert list rather than as the source of
 * truth: the poll is already running, so a missed or duplicated event costs at
 * most one 3-second-stale banner instead of a wrong one.
 *
 * A `requestId` guard drops responses from polls that were overtaken while in
 * flight, which happens as soon as one request takes longer than the interval.
 */
export function useCraneLiveView({
  enabled = true,
}: UseCraneLiveViewOptions = {}): UseCraneLiveViewResult {
  const [live, setLive] = useState<CraneLiveResponse | null>(null);
  const [openAlerts, setOpenAlerts] = useState<CraneProximityAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const requestId = useRef(0);

  /**
   * `silent` marks the background poll. A silent tick never toggles `loading`
   * (the map must not be torn down and replaced by a skeleton every 3 s) and
   * never surfaces an error — one dropped poll while a fitter is watching the
   * map should not replace it with an error card. The next explicit refresh
   * reports the failure.
   */
  const fetchLive = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!enabled) return;
      const silent = opts.silent === true;
      const id = ++requestId.current;
      if (!silent) setLoading(true);
      try {
        const [liveResponse, alertsResponse] = await Promise.all([
          cranesApi.getLivePositions(),
          cranesApi.getProximityAlerts({ status: "open", page_size: 50 }),
        ]);
        if (id !== requestId.current) return;
        setLive(liveResponse);
        setOpenAlerts(alertsResponse.data);
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        if (!silent) setError((err as ApiError).message);
      } finally {
        if (id === requestId.current) {
          if (!silent) setLoading(false);
          setInitialized(true);
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) return;
    fetchLive();
    const timer = setInterval(
      () => fetchLive({ silent: true }),
      POLL_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [fetchLive, enabled]);

  const { streamError } = useCraneAlertStream({
    enabled,
    // The frame itself is ignored: the poll is the source of truth, so an
    // event only means "re-read now rather than in up to 3 seconds".
    onEvent: () => {
      fetchLive({ silent: true });
    },
  });

  const acknowledge = useCallback(
    async (alertId: string) => {
      try {
        await cranesApi.acknowledgeAlert(alertId);
        toast.success("Alert acknowledged", { id: "crane-ack" });
        await fetchLive({ silent: true });
      } catch (err) {
        toast.error((err as ApiError).message || "Failed to acknowledge alert");
      }
    },
    [fetchLive],
  );

  return {
    live,
    openAlerts,
    loading,
    error,
    initialized,
    streamError,
    refresh: () => fetchLive(),
    acknowledge,
  };
}
