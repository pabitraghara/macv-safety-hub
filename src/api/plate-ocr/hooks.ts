"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/api/base/errors";
import { plateOcrApi } from "./api";
import type {
  PlateOcrListParams,
  PlateOcrReviewRequest,
  PlateOcrSample,
  PlateOcrSamplePage,
  PlateOcrSummary,
  PlateOcrTrainingRun,
  PlateOcrTrainingRunCreate,
  PlateOcrVerificationRun,
  PlateOcrVerificationRunCreate,
  PlateOcrVerificationSummary,
} from "./types";

const EMPTY_PAGE: PlateOcrSamplePage = {
  data: [],
  total_count: 0,
  page: 1,
  page_size: 25,
  total_pages: 0,
};

const EMPTY_SUMMARY: PlateOcrSummary = {
  total: 0,
  verification_statuses: {},
  review_statuses: {},
  training_eligible: 0,
};

export function usePlateOcrReviewQueue(params: PlateOcrListParams) {
  const [page, setPage] = useState<PlateOcrSamplePage>(EMPTY_PAGE);
  const [summary, setSummary] = useState<PlateOcrSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const paramsKey = JSON.stringify(params);

  const fetchQueue = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const [nextPage, nextSummary] = await Promise.all([
        plateOcrApi.list(params),
        plateOcrApi.summary(),
      ]);
      if (currentRequest !== requestId.current) return;
      setPage(nextPage);
      setSummary(nextSummary);
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      setError((err as ApiError).message || "Could not load the OCR queue");
      setPage(EMPTY_PAGE);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const mutate = useCallback(
    async (action: () => Promise<PlateOcrSample>) => {
      setSubmitting(true);
      setError(null);
      try {
        const result = await action();
        await fetchQueue();
        return result;
      } catch (err) {
        setError(
          (err as ApiError).message || "Could not update the OCR sample",
        );
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchQueue],
  );

  return {
    page,
    summary,
    loading,
    submitting,
    error,
    refresh: fetchQueue,
    review: (sampleId: string, data: PlateOcrReviewRequest) =>
      mutate(() => plateOcrApi.review(sampleId, data)),
    requeue: (sampleId: string) => mutate(() => plateOcrApi.requeue(sampleId)),
  };
}

export function usePlateOcrTrainingRuns() {
  const [runs, setRuns] = useState<PlateOcrTrainingRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await plateOcrApi.listTrainingRuns();
      setRuns(response.data);
    } catch (err) {
      setError((err as ApiError).message || "Could not load OCR training runs");
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mutate = useCallback(
    async (action: () => Promise<PlateOcrTrainingRun>) => {
      setSubmitting(true);
      setError(null);
      try {
        const result = await action();
        await refresh();
        return result;
      } catch (err) {
        setError((err as ApiError).message || "Could not update OCR training");
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [refresh],
  );

  return {
    runs,
    loading,
    submitting,
    error,
    refresh,
    create: (data: PlateOcrTrainingRunCreate = {}) =>
      mutate(() => plateOcrApi.createTrainingRun(data)),
    promote: (runId: string) =>
      mutate(() => plateOcrApi.promoteTrainingRun(runId)),
  };
}

export function usePlateOcrVerificationRuns() {
  const [runs, setRuns] = useState<PlateOcrVerificationRun[]>([]);
  const [summary, setSummary] = useState<PlateOcrVerificationSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [nextSummary, nextRuns] = await Promise.all([
        plateOcrApi.verificationSummary(),
        plateOcrApi.listVerificationRuns(),
      ]);
      setSummary(nextSummary);
      setRuns(nextRuns.data);
    } catch (err) {
      setError(
        (err as ApiError).message || "Could not load Gemini verification usage",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasActiveRun = runs.some((run) =>
    ["preparing", "queued", "running"].includes(run.status),
  );
  useEffect(() => {
    if (!hasActiveRun) return;
    const timer = window.setInterval(refresh, 3000);
    return () => window.clearInterval(timer);
  }, [hasActiveRun, refresh]);

  const mutate = useCallback(
    async (action: () => Promise<PlateOcrVerificationRun>) => {
      setSubmitting(true);
      setError(null);
      try {
        const result = await action();
        await refresh();
        return result;
      } catch (err) {
        setError(
          (err as ApiError).message || "Could not update Gemini verification",
        );
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [refresh],
  );

  return {
    runs,
    summary,
    loading,
    submitting,
    error,
    refresh,
    create: (data: PlateOcrVerificationRunCreate) =>
      mutate(() => plateOcrApi.createVerificationRun(data)),
    cancel: (runId: string) =>
      mutate(() => plateOcrApi.cancelVerificationRun(runId)),
  };
}
