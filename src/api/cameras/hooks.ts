"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { camerasApi } from "./api";
import type {
  Camera,
  CameraSnapshotRequest,
  CameraStatistics,
  CameraListParams,
} from "./types";
import { ApiError } from "../base/errors";

export function useCameras(initialParams: CameraListParams = {}) {
  const [params, setParams] = useState<CameraListParams>(initialParams);
  const [data, setData] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const paramsString = JSON.stringify(params);

  const fetchCameras = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await camerasApi.getCameras(params));
    } catch (err) {
      setError((err as ApiError).message);
      setData([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCameras();
  }, [paramsString]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilters = useCallback((newParams: Partial<CameraListParams>) => {
    setParams((p) => ({ ...p, ...newParams }));
  }, []);

  return {
    data,
    loading,
    error,
    initialized,
    params,
    refetch: fetchCameras,
    updateFilters,
  };
}

// ─── useCameraSnapshot (calibration editor snapshot flow) ────────────────────

const SNAPSHOT_POLL_INTERVAL_MS = 5000;
/**
 * Client-side ceiling on how long we poll a pending request. The edge polls
 * the backend every ~15s and the backend expires an unserved request after
 * 10 minutes; if nothing arrived in 3 minutes the edge box is almost
 * certainly down/misconfigured, so stop burning requests and say so.
 */
const SNAPSHOT_CLIENT_TIMEOUT_MS = 3 * 60 * 1000;

export type SnapshotUiStatus =
  | "none" // never requested
  | "pending"
  | "completed"
  | "failed"
  | "expired"
  | "timeout"; // client-side poll ceiling hit while still pending

/**
 * Latest snapshot for a camera + "request a fresh one" action.
 *
 * On mount: fetches the latest snapshot (404 → status "none"). While the
 * latest request is pending, polls every 5s (recursive setTimeout, cancelled
 * on unmount — same pattern as useVideoUploadByCode) up to a 3-minute client
 * timeout. `requestNew()` POSTs a request and (re)starts polling.
 */
export function useCameraSnapshot(cameraId: string) {
  const [snapshot, setSnapshot] = useState<CameraSnapshotRequest | null>(null);
  const [status, setStatus] = useState<SnapshotUiStatus>("none");
  const [loading, setLoading] = useState(!!cameraId);
  const [error, setError] = useState<string | null>(null);
  // Bumped to invalidate any in-flight poll chain (unmount / requestNew).
  const pollGeneration = useRef(0);

  const applyResult = useCallback((result: CameraSnapshotRequest) => {
    setSnapshot(result);
    setStatus(result.status);
  }, []);

  const pollUntilResolved = useCallback(
    (generation: number, startedAt: number) => {
      const tick = async () => {
        if (generation !== pollGeneration.current) return;
        try {
          const result = await camerasApi.getSnapshot(cameraId);
          if (generation !== pollGeneration.current) return;
          applyResult(result);
          if (result.status !== "pending") return;
          if (Date.now() - startedAt >= SNAPSHOT_CLIENT_TIMEOUT_MS) {
            setStatus("timeout");
            return;
          }
          setTimeout(tick, SNAPSHOT_POLL_INTERVAL_MS);
        } catch (err) {
          if (generation !== pollGeneration.current) return;
          setError((err as ApiError).message);
        }
      };
      setTimeout(tick, SNAPSHOT_POLL_INTERVAL_MS);
    },
    [cameraId, applyResult],
  );

  // Initial fetch of the latest snapshot (any status).
  useEffect(() => {
    if (!cameraId) return;
    pollGeneration.current += 1;
    const generation = pollGeneration.current;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await camerasApi.getSnapshot(cameraId);
        if (generation !== pollGeneration.current) return;
        applyResult(result);
        if (result.status === "pending") {
          // Resume polling a request created in an earlier page visit; its
          // own creation time bounds the wait, not ours — reuse the ceiling.
          pollUntilResolved(generation, Date.now());
        }
      } catch (err) {
        if (generation !== pollGeneration.current) return;
        if (err instanceof ApiError && err.status === 404) {
          setStatus("none"); // never requested — not an error
        } else {
          setError((err as ApiError).message);
        }
      } finally {
        if (generation === pollGeneration.current) setLoading(false);
      }
    })();
    return () => {
      pollGeneration.current += 1; // cancel any in-flight chain
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId]);

  const requestNew = useCallback(async () => {
    pollGeneration.current += 1;
    const generation = pollGeneration.current;
    try {
      setError(null);
      const result = await camerasApi.requestSnapshot(cameraId);
      if (generation !== pollGeneration.current) return;
      applyResult(result);
      if (result.status === "pending") {
        pollUntilResolved(generation, Date.now());
      }
    } catch (err) {
      if (generation !== pollGeneration.current) return;
      setError((err as ApiError).message);
    }
  }, [cameraId, applyResult, pollUntilResolved]);

  return {
    snapshot,
    status,
    polling: status === "pending",
    loading,
    error,
    requestNew,
  };
}

export function useCameraStatistics() {
  const [data, setData] = useState<CameraStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await camerasApi.getStatistics());
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { data, loading, error, refetch: fetchStats };
}
