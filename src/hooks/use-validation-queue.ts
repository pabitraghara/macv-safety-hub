import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { observationsApi } from "@/api/observations";
import type {
  ValidationDecision,
  ValidationQueueNextResponse,
} from "@/api/observations/types";

type QueueStatus = "loading" | "reviewing" | "submitting" | "empty";

interface UseValidationQueueOptions {
  siteId?: string;
}

export function useValidationQueue({ siteId }: UseValidationQueueOptions = {}) {
  const [status, setStatus] = useState<QueueStatus>("loading");
  const [current, setCurrent] = useState<ValidationQueueNextResponse | null>(
    null,
  );
  const [skipOffset, setSkipOffset] = useState(0);

  const fetchAt = useCallback(
    async (skip: number) => {
      setStatus("loading");
      try {
        const params: { site_id?: string; skip?: number } = {};
        if (siteId) params.site_id = siteId;
        if (skip > 0) params.skip = skip;
        const next = await observationsApi.getValidationQueueNext(params);
        if (!next) {
          // Wrapped around or truly empty — reset offset and try from the start
          if (skip > 0) {
            const first = await observationsApi.getValidationQueueNext(
              siteId ? { site_id: siteId } : undefined,
            );
            if (!first) {
              setCurrent(null);
              setStatus("empty");
            } else {
              setSkipOffset(0);
              setCurrent(first);
              setStatus("reviewing");
            }
          } else {
            setCurrent(null);
            setStatus("empty");
          }
        } else {
          setCurrent(next);
          setStatus("reviewing");
        }
      } catch {
        toast.error("Failed to load next observation");
        setStatus("empty");
      }
    },
    [siteId],
  );

  const advance = useCallback(async () => {
    setSkipOffset(0);
    await fetchAt(0);
  }, [fetchAt]);

  useEffect(() => {
    fetchAt(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const skip = useCallback(async () => {
    const next = skipOffset + 1;
    setSkipOffset(next);
    await fetchAt(next);
  }, [skipOffset, fetchAt]);

  const submitDecision = useCallback(
    async (
      decision: ValidationDecision,
      opts?: { confidence?: number; notes?: string },
    ) => {
      if (!current) return;
      const code = current.observation.code;
      setStatus("submitting");
      try {
        await observationsApi.submitValidation(code, {
          decision,
          confidence: opts?.confidence,
          notes: opts?.notes,
        });
        toast.success(
          decision === "false_positive"
            ? "Marked as false positive — observation removed"
            : "Confirmed as true positive",
        );
        // After a decision the queue shrinks, so decrement offset to stay in sync
        const nextOffset = Math.max(0, skipOffset - 1);
        setSkipOffset(nextOffset);
        await fetchAt(nextOffset);
      } catch {
        toast.error("Failed to submit validation. Please try again.");
        setStatus("reviewing");
      }
    },
    [current, skipOffset, fetchAt],
  );

  return {
    status,
    current,
    advance,
    skip,
    submitDecision,
    isEmpty: status === "empty",
    isLoading: status === "loading",
    isSubmitting: status === "submitting",
  };
}
