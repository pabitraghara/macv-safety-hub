"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cranesApi, createCraneAlertEventSource } from "./api";
import type {
  Crane,
  CraneAlertListParams,
  CraneProximityAlert,
  CraneProximitySettings,
  CraneSettingsParams,
} from "./types";
import { ApiError } from "../base/errors";

/** Give up reopening the alert stream after this many consecutive failures. */
const SSE_MAX_RETRIES = 3;

/** Backoff before reopening: 1 s, 2 s, 4 s. */
const SSE_BASE_BACKOFF_MS = 1000;

export interface UseCranesOptions {
  site_id?: string;
  /**
   * Set false to make the hook inert — no request is issued at all. The pages
   * pass `canView` here so a user without `crane:view` never fires a 403.
   */
  enabled?: boolean;
}

/** Every crane visible to the caller, for pickers and the settings table. */
export function useCranes({
  enabled = true,
  ...params
}: UseCranesOptions = {}) {
  const [data, setData] = useState<Crane[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const paramsString = JSON.stringify(params);

  const fetchCranes = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      setData(await cranesApi.getCranes(params));
    } catch (err) {
      setError((err as ApiError).message);
      setData([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [paramsString, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCranes();
  }, [paramsString, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, initialized, refetch: fetchCranes };
}

export interface FetchAlertsOptions {
  /**
   * A refresh the user did not ask for (the alert stream nudged it). It never
   * toggles `loading` — the table the user is reading must not blank — and
   * never surfaces an error, since one dropped background request should not
   * replace a good list with an error card.
   */
  silent?: boolean;
}

/**
 * Paged proximity-alert list for a fully controlled `params` object.
 *
 * The caller owns the filter state (the alerts page builds `params` with
 * `buildCraneAlertListParams`), so this hook only fetches. A `requestId` ref
 * discards responses from superseded requests: filters change fast — a date
 * preset plus a level in the same tick — and without it a slow earlier
 * response can land after a newer one and overwrite the list.
 */
export function useCraneProximityAlerts(
  params: CraneAlertListParams = {},
  { enabled = true }: { enabled?: boolean } = {},
) {
  const [data, setData] = useState<CraneProximityAlert[]>([]);
  const [metadata, setMetadata] = useState({
    total_count: 0,
    page: 1,
    page_size: 20,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const requestId = useRef(0);

  const paramsString = JSON.stringify(params);

  const fetchAlerts = useCallback(
    async ({ silent = false }: FetchAlertsOptions = {}) => {
      if (!enabled) return;
      const id = ++requestId.current;
      if (!silent) setLoading(true);
      try {
        const response = await cranesApi.getProximityAlerts(params);
        if (id !== requestId.current) return;
        setData(response.data);
        setMetadata(response.metadata);
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        if (!silent) {
          setError((err as ApiError).message);
          setData([]);
        }
      } finally {
        if (id === requestId.current) {
          if (!silent) setLoading(false);
          setInitialized(true);
        }
      }
    },
    [paramsString, enabled], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    fetchAlerts();
  }, [paramsString, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    metadata,
    loading,
    error,
    initialized,
    refetch: fetchAlerts,
  };
}

/** Proximity thresholds for one site (or the org-wide defaults). */
export function useCraneSettings(
  params: CraneSettingsParams = {},
  { enabled = true }: { enabled?: boolean } = {},
) {
  const [data, setData] = useState<CraneProximitySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const paramsString = JSON.stringify(params);

  const fetchSettings = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      setData(await cranesApi.getSettings(params));
    } catch (err) {
      // `data` is deliberately left as it was: a failed read must not be
      // mistaken for "this site has no thresholds", which would invite the
      // user to save defaults over a row that already exists.
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [paramsString, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSettings();
  }, [paramsString, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, initialized, refetch: fetchSettings };
}

export interface UseCraneAlertStreamOptions {
  /** No connection is opened while false — the pages pass `canView`. */
  enabled?: boolean;
  /** Called once per alert frame. Held in a ref, so it need not be stable. */
  onEvent: (alert: CraneProximityAlert) => void;
}

export interface UseCraneAlertStreamResult {
  /**
   * The stream is down. Both callers still refresh on their own, so this is
   * worth saying out loud but is not an error state.
   */
  streamError: boolean;
}

/**
 * The shared proximity-alert SSE subscription, used by both the live view and
 * the alert history page.
 *
 * Reconnection is driven by a nonce bumped only from `onerror`, never by the
 * `streamError` flag: an effect keyed on displayed state tears the connection
 * down and reopens it whenever that state is touched for any other reason.
 * The retry counter resets in `onopen` — a connection that actually opened has
 * spent none of the budget, however many attempts it took to get there — and
 * each reopen waits 1 s · 2^retry first, so a backend that is down is not
 * hammered.
 *
 * An `{"error": ...}` frame is a report from the backend, not a transport
 * failure: it is logged and the connection kept, because closing on one would
 * drop a stream that is otherwise healthy.
 */
export function useCraneAlertStream({
  enabled = true,
  onEvent,
}: UseCraneAlertStreamOptions): UseCraneAlertStreamResult {
  const [streamError, setStreamError] = useState(false);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const retryCount = useRef(0);

  // Held in a ref so a caller's inline callback never reopens the connection.
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let source: EventSource | null = null;
    let backoffTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleReconnect() {
      if (retryCount.current >= SSE_MAX_RETRIES) return;
      const delay = SSE_BASE_BACKOFF_MS * 2 ** retryCount.current;
      retryCount.current += 1;
      backoffTimer = setTimeout(() => {
        if (!cancelled) setReconnectNonce((nonce) => nonce + 1);
      }, delay);
    }

    createCraneAlertEventSource()
      .then((eventSource) => {
        if (cancelled) {
          eventSource.close();
          return;
        }
        source = eventSource;

        eventSource.onopen = () => {
          retryCount.current = 0;
          setStreamError(false);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && typeof data === "object" && "error" in data) {
              console.error(
                "[SSE] Crane alert stream reported an error:",
                data.error,
              );
              return;
            }
            onEventRef.current(data as CraneProximityAlert);
          } catch (err) {
            console.error("[SSE] Error parsing crane alert data:", err);
          }
        };

        eventSource.onerror = () => {
          setStreamError(true);
          eventSource.close();
          source = null;
          scheduleReconnect();
        };
      })
      .catch((err) => {
        console.error("Failed to open crane alert SSE connection:", err);
        if (cancelled) return;
        setStreamError(true);
        scheduleReconnect();
      });

    return () => {
      cancelled = true;
      if (backoffTimer) clearTimeout(backoffTimer);
      if (source) {
        source.close();
        source = null;
      }
    };
  }, [enabled, reconnectNonce]);

  // While disabled there is no stream to be down, so the caller must not be
  // told one is.
  return { streamError: enabled && streamError };
}
