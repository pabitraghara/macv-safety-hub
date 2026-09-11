"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useLogto } from "@logto/react";
import {
  setAccessTokenGetter,
  setActiveOrgId,
  setClearSession,
} from "@/api/base/auth";
import { organisationApi } from "@/api/organisation/api";

const ACTIVE_ORG_KEY = "active_org_id";

export type Org = { id: string; name: string };

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { name: string; email: string } | null;
  orgs: Org[];
  activeOrgId: string;
  setActiveOrg: (orgId: string) => void;
  signOut: () => void;
  permissions: Set<string>;
  enabledModules: Set<string>;
};

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  orgs: [],
  activeOrgId: "",
  setActiveOrg: () => {},
  signOut: () => {},
  permissions: new Set(),
  enabledModules: new Set(),
});

export function useAuth() {
  return useContext(AuthContext);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    isAuthenticated,
    isLoading: logtoLoading,
    getAccessToken,
    getIdTokenClaims,
    fetchUserInfo,
    signOut: logtoSignOut,
    clearAllTokens,
  } = useLogto();

  const [user, setUser] = useState<{ name: string; email: string } | null>(
    null,
  );
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrgId, setActiveOrgIdState] = useState<string>("");
  const [userInfoLoaded, setUserInfoLoaded] = useState(false);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());

  // Wire up the module-level token getter for the API client.
  // getAccessToken is intentionally excluded from deps — it is a stable reference
  // from the Logto SDK and never changes between renders.
  useEffect(() => {
    if (!isAuthenticated) return;
    setAccessTokenGetter(async (resource: string, orgId?: string) => {
      const token = await getAccessToken(resource, orgId);
      return token ?? undefined;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Keep the module-level active org ID in sync
  useEffect(() => {
    setActiveOrgId(activeOrgId || null);
  }, [activeOrgId]);

  // Wire the session-clear hook so the API layer can drop a dead Logto session
  // on an unrecoverable 401. Clearing the ID token makes the next mount read as
  // unauthenticated, breaking the /login <-> / redirect loop that otherwise
  // manifests as the page reloading constantly after a failed token refresh.
  // clearAllTokens is bound to the stable SDK client, so wiring once is safe.
  useEffect(() => {
    setClearSession(() => {
      void clearAllTokens();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load user info once after authentication is established.
  // Intentionally excludes logtoLoading from deps — we don't want this re-running
  // every time Logto's internal loading counter toggles (which happens on every
  // getAccessToken/getIdTokenClaims call via the proxy wrapper, causing an infinite loop).
  useEffect(() => {
    if (!isAuthenticated || userInfoLoaded) return;

    let cancelled = false;

    (async () => {
      try {
        const claims = await getIdTokenClaims();
        if (cancelled) return;

        const givenName = (claims?.given_name as string) ?? "";
        const familyName = (claims?.family_name as string) ?? "";
        const name =
          givenName || familyName
            ? [givenName, familyName].filter(Boolean).join(" ")
            : ((claims?.name as string) ??
              (claims?.username as string) ??
              "User");
        const email = (claims?.email as string) ?? "";
        setUser({ name, email });

        let orgData =
          (claims?.organization_data as Array<{ id: string; name: string }>) ??
          [];

        // If the ID token has no org data (e.g. user just accepted an invitation
        // and the token was issued before they were added to the org), fetch fresh
        // user info from Logto's /oidc/userinfo endpoint which reflects current state.
        if (orgData.length === 0) {
          try {
            const freshInfo = await fetchUserInfo();
            const freshOrgs =
              (freshInfo?.organization_data as Array<{
                id: string;
                name: string;
              }>) ?? [];
            if (freshOrgs.length > 0) orgData = freshOrgs;
          } catch {
            // fetchUserInfo failure is non-fatal — proceed with empty orgs
          }
        }

        setOrgs(orgData);

        const stored = localStorage.getItem(ACTIVE_ORG_KEY);
        const validStored = orgData.find((o) => o.id === stored);
        const resolvedOrg = validStored?.id ?? orgData[0]?.id ?? "";
        setActiveOrgIdState(resolvedOrg);
        // Sync module-level org immediately so the first API call after auth
        // resolves uses the correct org-scoped token (not the plain resource token).
        setActiveOrgId(resolvedOrg || null);
        setUserInfoLoaded(true);
      } catch {
        setUserInfoLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Extract permissions from org-scoped token whenever org changes
  useEffect(() => {
    if (!isAuthenticated || !activeOrgId) return;

    let cancelled = false;
    const resource = process.env.NEXT_PUBLIC_API_RESOURCE!;

    getAccessToken(resource, activeOrgId)
      .then((token) => {
        if (cancelled || !token) return;
        const claims = decodeJwtPayload(token);
        const scope = (claims?.scope as string) ?? "";
        setPermissions(new Set(scope.split(" ").filter(Boolean)));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeOrgId]);

  // Fetch explicit module entitlement (GATE 1) from the org whenever it changes.
  // The request carries the org-scoped token automatically (the module-level
  // active org is synced before this runs), mirroring the permissions effect.
  // Failure is non-fatal — module groups simply stay hidden until it resolves.
  useEffect(() => {
    if (!isAuthenticated || !activeOrgId) return;

    let cancelled = false;

    organisationApi
      .getMyOrg()
      .then((org) => {
        if (cancelled) return;
        setEnabledModules(new Set(org.enabled_modules ?? []));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, activeOrgId]);

  const setActiveOrg = useCallback((orgId: string) => {
    setActiveOrgIdState(orgId);
    // Sync to module-level immediately (synchronously) so any API call fired in
    // the same tick as the org change uses the correct org ID, not the stale one.
    setActiveOrgId(orgId);
    // Clear stale permissions immediately — the permissions effect will repopulate
    // them once the new org-scoped token is fetched.
    setPermissions(new Set());
    // Clear stale module entitlement too — the entitlement effect refetches it
    // for the new org.
    setEnabledModules(new Set());
    localStorage.setItem(ACTIVE_ORG_KEY, orgId);
  }, []);

  const signOut = useCallback(() => {
    logtoSignOut(`${window.location.origin}/login`);
  }, [logtoSignOut]);

  // Once userInfoLoaded is true, never return to loading — prevents child
  // remounts when Logto briefly flips logtoLoading during background token refreshes.
  // Only show loading during Logto's initial auth check (before isAuthenticated is known)
  // or while we're fetching user info for the first time.
  // Do NOT include logtoLoading after userInfoLoaded — it toggles on every getAccessToken
  // call (proxy side-effect) which would remount children and cause request storms.
  const isLoading =
    (!userInfoLoaded && isAuthenticated) || (logtoLoading && !userInfoLoaded);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        orgs,
        activeOrgId,
        setActiveOrg,
        signOut,
        permissions,
        enabledModules,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
