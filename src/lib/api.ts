import axios, { type AxiosError } from "axios";
import { getAuthToken, clearSession } from "@/api/base/auth";
import { ApiError } from "@/api/base/errors";

/**
 * The single HTTP client for the FastAPI backend.
 *
 * Every request automatically carries a Logto Bearer token (org-scoped when an
 * org is selected). A 401 response redirects to /login. Every other failure is
 * converted into a thrown {@link ApiError} preserving the same
 * message/status/data semantics the old fetch-based BaseApiClient produced, so
 * `err instanceof ApiError && err.status === 403` call sites keep working.
 *
 * For Server-Sent Events use createEventSource() below — EventSource cannot
 * send headers, so the token is passed via the `token` query param, which the
 * backend AuthMiddleware accepts.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

const api = axios.create({
  baseURL: BASE_URL,
  // Repeat array params without brackets (`key=a&key=b`) to match the old
  // fetch client's URLSearchParams.append() behavior. null/undefined params
  // are skipped by axios automatically.
  paramsSerializer: { indexes: null },
});

api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const response = error.response;

    // 401 means the token is invalid/expired and the SDK couldn't silently
    // refresh it. Redirect to login and return a never-resolving promise so
    // callers don't see a partial error while navigation is in progress.
    // Skip the redirect if we're already on /login to avoid a reload loop.
    if (
      response?.status === 401 &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      // Drop the dead Logto session first. Without this the stored ID token
      // survives, so isAuthenticated() still reads true on the /login mount and
      // the login page bounces the user straight back here — an infinite
      // full-page-reload loop. Clearing the tokens makes /login fall through to
      // a real sign-in (which silently re-auths if the IdP session is alive).
      clearSession();
      // Preserve the current page so the callback restores it after
      // re-authentication.
      sessionStorage.setItem(
        "logto_return_to",
        window.location.pathname + window.location.search,
      );
      window.location.replace("/login");
      return new Promise<never>(() => {});
    }

    // Network error / no response.
    if (!response) {
      return Promise.reject(
        new ApiError(error.message || "Network error", 0, undefined),
      );
    }

    const data = response.data;
    const detail = data as Record<string, string> | undefined;
    const message =
      detail?.detail ??
      detail?.error ??
      detail?.message ??
      `HTTP ${response.status}`;

    return Promise.reject(new ApiError(message, response.status, data));
  },
);

/**
 * Open an authenticated SSE connection to the backend.
 * `path` is a backend path like "/api/v1/speed-violations/stream".
 *
 * The token is baked into the URL at connection time and EventSource never
 * refreshes it — consumers must close the connection and call this again
 * (e.g. on `onerror`) to pick up a renewed token rather than relying on the
 * browser to reconnect with stale credentials.
 */
export async function createEventSource(path: string): Promise<EventSource> {
  const token = await getAuthToken();
  const url = new URL(`${BASE_URL}${path}`);
  if (token) {
    url.searchParams.set("token", token);
  }
  return new EventSource(url.toString());
}

export const useApi = () => api;
export default api;
