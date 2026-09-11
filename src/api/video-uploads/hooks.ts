"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../base/errors";
import { uploadToStorage, videoUploadsApi } from "./api";
import type {
  VideoUploadCreateRequest,
  VideoUploadDetailResponse,
  VideoUploadListParams,
  VideoUploadResponse,
  VideoUploadStatus,
} from "./types";

const DEFAULT_PAGINATION = {
  total_items: 0,
  page_size: 10,
  current_page: 1,
  total_pages: 0,
  has_next: false,
  has_previous: false,
};

const POLL_INTERVAL_MS = 3000;

// ─── useVideoUploads (list) ──────────────────────────────────────────────────

export function useVideoUploads(initialParams: VideoUploadListParams = {}) {
  const [params, setParams] = useState<VideoUploadListParams>({
    page: 1,
    page_size: 10,
    ...initialParams,
  });
  const [data, setData] = useState<VideoUploadResponse[]>([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const paramsString = JSON.stringify(params);

  const fetchUploads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await videoUploadsApi.list(params);
      setData(response.items);
      setPagination(response.pagination);
    } catch (err) {
      setError((err as ApiError).message);
      setData([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsString]);

  useEffect(() => {
    fetchUploads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsString]);

  return {
    data,
    pagination,
    loading,
    error,
    params,
    initialized,
    refetch: fetchUploads,
    setParams,
  };
}

// ─── useVideoUploadByCode (poll for status / observations) ───────────────────

export function useVideoUploadByCode(
  code: string,
  options: { pollWhile?: VideoUploadStatus[] } = {},
) {
  const [data, setData] = useState<VideoUploadDetailResponse | null>(null);
  const [loading, setLoading] = useState(!!code);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const pollWhile = options.pollWhile ?? ["pending", "processing"];
  const pollWhileKey = pollWhile.join(",");

  const fetchUpload = useCallback(async () => {
    if (!code) return;
    try {
      setError(null);
      const result = await videoUploadsApi.get(code);
      setData(result);
      return result;
    } catch (err) {
      setError((err as ApiError).message);
      throw err;
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [code]);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      try {
        const result = await fetchUpload();
        if (cancelled) return;
        if (result && pollWhile.includes(result.status)) {
          timeoutId = setTimeout(tick, POLL_INTERVAL_MS);
        }
      } catch {
        // stop polling on error
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, pollWhileKey]);

  return {
    data,
    loading,
    error,
    initialized,
    refetch: fetchUpload,
  };
}

// ─── Submit hooks (file vs url — separate flows) ─────────────────────────────

export type UploadPhase =
  | "idle"
  | "presigning"
  | "uploading"
  | "registering"
  | "polling"
  | "starting"
  | "done"
  | "error";

interface SubmitMetadata {
  name?: string | null;
  site_id: string;
  footage_timestamp?: string | null;
  use_case_ids?: string[];
  regulatory_standards?: string[];
  user_prompt?: string | null;
  model_name?: string;
}

export interface FileUploadArgs extends SubmitMetadata {
  file: File;
}

export interface UrlUploadArgs extends SubmitMetadata {
  source_url: string;
}

interface UploadHookState {
  phase: UploadPhase;
  progress: number;
  error: string | null;
  result: VideoUploadResponse | null;
}

function useUploadHookState() {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoUploadResponse | null>(null);
  const cancelledRef = useRef(false);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    setPhase("idle");
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  return {
    phase,
    setPhase,
    progress,
    setProgress,
    error,
    setError,
    result,
    setResult,
    cancelledRef,
    reset,
    cancel,
  };
}

function buildMetadataBody(meta: SubmitMetadata): VideoUploadCreateRequest {
  return {
    name: meta.name || null,
    site_id: meta.site_id,
    footage_timestamp: meta.footage_timestamp || null,
    use_case_ids: meta.use_case_ids,
    regulatory_standards: meta.regulatory_standards,
    user_prompt: meta.user_prompt || null,
    ...(meta.model_name ? { model_name: meta.model_name } : {}),
  };
}

/**
 * File upload flow:
 *   1. POST /video-uploads/presign      → SAS URL
 *   2. PUT  <upload_url>                → upload to Google Cloud Storage directly
 *   3. POST /video-uploads              → register with blob_path
 *   4. POST /video-uploads/{code}/start → trigger VLM
 */
export function useFileUpload() {
  const s = useUploadHookState();

  const submit = useCallback(
    async (args: FileUploadArgs): Promise<VideoUploadResponse> => {
      s.cancelledRef.current = false;
      s.setError(null);
      s.setResult(null);
      s.setProgress(0);

      try {
        // 1. Presign
        s.setPhase("presigning");
        const presign = await videoUploadsApi.presign({
          filename: args.file.name,
          content_type: args.file.type || "video/mp4",
          file_size_bytes: args.file.size,
          site_id: args.site_id,
        });
        if (s.cancelledRef.current) throw new Error("Cancelled");

        // 2. PUT to storage
        s.setPhase("uploading");
        await uploadToStorage(
          presign.upload_url,
          args.file,
          args.file.type || "video/mp4",
          (loaded, total) => s.setProgress(total ? loaded / total : 0),
        );
        if (s.cancelledRef.current) throw new Error("Cancelled");

        // 3. Register
        s.setPhase("registering");
        let record = await videoUploadsApi.create({
          ...buildMetadataBody(args),
          blob_path: presign.blob_path,
        });
        if (s.cancelledRef.current) throw new Error("Cancelled");

        if (record.status === "failed") {
          throw new Error(record.error_message || "Upload failed");
        }

        // 4. Start VLM
        s.setPhase("starting");
        record = await videoUploadsApi.start(record.code);

        s.setResult(record);
        s.setPhase("done");
        return record;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Upload failed";
        s.setError(message);
        s.setPhase("error");
        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return {
    submit,
    reset: s.reset,
    cancel: s.cancel,
    phase: s.phase,
    progress: s.progress,
    error: s.error,
    result: s.result,
  };
}

/**
 * URL upload flow:
 *   1. POST /video-uploads              → register with source_url (status=pending)
 *   2. GET  /video-uploads/{code}       → poll until status=uploaded
 *   3. POST /video-uploads/{code}/start → trigger VLM
 */
export function useUrlUpload() {
  const s = useUploadHookState();

  const submit = useCallback(
    async (args: UrlUploadArgs): Promise<VideoUploadResponse> => {
      s.cancelledRef.current = false;
      s.setError(null);
      s.setResult(null);
      s.setProgress(0);

      try {
        // 1. Register
        s.setPhase("registering");
        let record = await videoUploadsApi.create({
          ...buildMetadataBody(args),
          source_url: args.source_url,
        });
        if (s.cancelledRef.current) throw new Error("Cancelled");

        // 2. Poll until uploaded
        if (record.status === "pending") {
          s.setPhase("polling");
          while (!s.cancelledRef.current && record.status === "pending") {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            record = await videoUploadsApi.get(record.code);
          }
        }
        if (s.cancelledRef.current) throw new Error("Cancelled");

        if (record.status === "failed") {
          throw new Error(record.error_message || "Upload failed");
        }

        // 3. Start VLM
        s.setPhase("starting");
        record = await videoUploadsApi.start(record.code);

        s.setResult(record);
        s.setPhase("done");
        return record;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Upload failed";
        s.setError(message);
        s.setPhase("error");
        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return {
    submit,
    reset: s.reset,
    cancel: s.cancel,
    phase: s.phase,
    progress: s.progress,
    error: s.error,
    result: s.result,
  };
}

// Re-export the combined state shape for callers that want to pass through
// either hook's return value to the same UI.
export type UploadHookReturn = UploadHookState & {
  submit: (
    args: FileUploadArgs | UrlUploadArgs,
  ) => Promise<VideoUploadResponse>;
  reset: () => void;
  cancel: () => void;
};

// ─── useVideoUploadSubmit (unified file + url) ───────────────────────────────

export type VideoUploadInput =
  | { kind: "file"; file: File }
  | { kind: "url"; url: string };

export interface VideoUploadSubmitArgs extends SubmitMetadata {
  input: VideoUploadInput;
  autoStart?: boolean;
}

/**
 * Unified submit hook that dispatches to either the file or URL flow based on
 * `input.kind`. Both flows end in status=uploaded → POST /start.
 */
export function useVideoUploadSubmit() {
  const s = useUploadHookState();

  const submit = useCallback(
    async (args: VideoUploadSubmitArgs): Promise<VideoUploadResponse> => {
      s.cancelledRef.current = false;
      s.setError(null);
      s.setResult(null);
      s.setProgress(0);

      const { input, autoStart = true, ...meta } = args;

      try {
        let record: VideoUploadResponse;

        if (input.kind === "file") {
          // 1. Presign
          s.setPhase("presigning");
          const presign = await videoUploadsApi.presign({
            filename: input.file.name,
            content_type: input.file.type || "video/mp4",
            file_size_bytes: input.file.size,
            site_id: meta.site_id,
          });
          if (s.cancelledRef.current) throw new Error("Cancelled");

          // 2. PUT to storage
          s.setPhase("uploading");
          await uploadToStorage(
            presign.upload_url,
            input.file,
            input.file.type || "video/mp4",
            (loaded, total) => s.setProgress(total ? loaded / total : 0),
          );
          if (s.cancelledRef.current) throw new Error("Cancelled");

          // 3. Register
          s.setPhase("registering");
          record = await videoUploadsApi.create({
            ...buildMetadataBody(meta),
            blob_path: presign.blob_path,
          });
        } else {
          // 1. Register with source_url
          s.setPhase("registering");
          record = await videoUploadsApi.create({
            ...buildMetadataBody(meta),
            source_url: input.url,
          });

          // 2. Poll until status leaves "pending"
          if (record.status === "pending") {
            s.setPhase("polling");
            while (!s.cancelledRef.current && record.status === "pending") {
              await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
              record = await videoUploadsApi.get(record.code);
            }
          }
        }

        if (s.cancelledRef.current) throw new Error("Cancelled");

        if (record.status === "failed") {
          throw new Error(record.error_message || "Upload failed");
        }

        if (autoStart) {
          s.setPhase("starting");
          record = await videoUploadsApi.start(record.code);
        }

        s.setResult(record);
        s.setPhase("done");
        return record;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Upload failed";
        s.setError(message);
        s.setPhase("error");
        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return {
    submit,
    reset: s.reset,
    cancel: s.cancel,
    phase: s.phase,
    progress: s.progress,
    error: s.error,
    result: s.result,
  };
}
