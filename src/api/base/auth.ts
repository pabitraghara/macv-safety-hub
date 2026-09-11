/**
 * Module-level auth token management.
 *
 * The AuthProvider sets the token getter (from @logto/react), the active org
 * ID, and a session-clear hook. The axios request interceptor (see @/lib/api)
 * calls getAuthToken() before every request to get a Bearer token — preferring
 * an org-scoped token when an org is selected.
 */

type GetAccessTokenFn = (
  resource: string,
  organizationId?: string,
) => Promise<string | undefined>;

let _getAccessToken: GetAccessTokenFn | null = null;
let _activeOrgId: string | null = null;
let _clearSession: (() => void) | null = null;

// In-flight token requests keyed by org id (the resource is constant).
// Concurrent callers asking for the same token share a single promise, so a
// cold dashboard load fires ONE refresh per key instead of many racing ones.
// This matters because Logto rotates the refresh token on use: parallel
// refreshes can consume and invalidate the same stored refresh token, which
// permanently breaks every future refresh (the state that previously required
// manually clearing localStorage to recover).
const _inFlight = new Map<string, Promise<string | undefined>>();

export function setAccessTokenGetter(fn: GetAccessTokenFn) {
  _getAccessToken = fn;
}

export function setActiveOrgId(orgId: string | null) {
  _activeOrgId = orgId;
}

/**
 * Register the hook that drops the stored Logto session (all tokens). Wired
 * from AuthProvider to the SDK's clearAllTokens.
 */
export function setClearSession(fn: () => void) {
  _clearSession = fn;
}

/**
 * Clear the stored Logto session on an unrecoverable auth failure (a 401 the
 * SDK couldn't silently refresh). Clearing the ID token makes the next mount's
 * isAuthenticated() read false, so the sign-in redirect runs cleanly instead of
 * bouncing between / and /login in an infinite full-page-reload loop.
 * No-op if not wired yet.
 */
export function clearSession() {
  _inFlight.clear();
  _clearSession?.();
}

/**
 * Acquire a token for the given org (or the plain resource token when omitted),
 * de-duplicating concurrent requests for the same key while one is in flight.
 */
function fetchToken(orgId?: string): Promise<string | undefined> {
  if (!_getAccessToken) return Promise.resolve(undefined);
  const resource = process.env.NEXT_PUBLIC_API_RESOURCE!;
  const key = orgId ?? "";

  const existing = _inFlight.get(key);
  if (existing) return existing;

  const pending = _getAccessToken(resource, orgId).finally(() => {
    _inFlight.delete(key);
  });
  _inFlight.set(key, pending);
  return pending;
}

export async function getAuthToken(): Promise<string | undefined> {
  if (!_getAccessToken) return undefined;

  // Prefer org-scoped token when an org is selected
  if (_activeOrgId) {
    try {
      const token = await fetchToken(_activeOrgId);
      if (token) return token;
    } catch {
      // Fall through to plain resource token
    }
  }

  try {
    const token = await fetchToken();
    return token || undefined;
  } catch {
    return undefined;
  }
}
