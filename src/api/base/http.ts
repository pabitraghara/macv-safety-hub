import api from "@/lib/api";

/**
 * Shared typed request helper over the platform axios instance.
 *
 * Replaces the old fetch-based `BaseApiClient.request()` with an identical
 * signature so domain modules keep the same call shape. Auth injection, the
 * 401 redirect, and ApiError conversion all live in the axios interceptors
 * (see `@/lib/api`); this helper only builds the request and unwraps the body.
 *
 * - JSON bodies: axios sets `application/json` automatically.
 * - FormData bodies: axios sets the multipart boundary automatically — never
 *   set Content-Type manually.
 * - Blob downloads: pass `{ responseType: "blob" }`.
 * - Query params: `null`/`undefined` are skipped; arrays repeat the key.
 */

export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    total_items: number;
    page_size: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
};

type RequestOptions = {
  params?: Record<string, unknown>;
  responseType?: "blob" | "json";
};

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const res = await api.request<T>({
    method,
    url: path,
    data: body,
    params: options.params,
    responseType: options.responseType,
  });

  // Preserve the old client's 204 semantics (fetch returned `undefined`).
  if (res.status === 204) return undefined as T;
  return res.data;
}
