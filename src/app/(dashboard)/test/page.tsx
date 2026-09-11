"use client";

import { useState, useEffect, useRef } from "react";
import { useLogto } from "@logto/react";
import { useAuth } from "@/lib/auth-context";
import { getAuthToken } from "@/api/base/auth";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Mail,
  Hash,
  ShieldCheck,
  Info,
} from "lucide-react";

type UserResponse = {
  id: number;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  logto_user_id: string;
  is_active: boolean;
  [key: string]: unknown;
};

type VerifyResult =
  | { ok: true; user: UserResponse }
  | { ok: false; status: number; message: string };

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
      <CheckCircle className="h-4 w-4" />
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
      <XCircle className="h-4 w-4" />
      Failed
    </span>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm font-medium break-all">{value ?? "\u2014"}</p>
      </div>
    </div>
  );
}

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  return (
    <div>
      <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated, activeOrgId, permissions } = useAuth();
  const { getAccessToken, getIdTokenClaims } = useLogto();

  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || hasLoaded.current) return;
    hasLoaded.current = true;

    let cancelled = false;

    async function load() {
      setLoading(true);

      // Get ID token claims
      try {
        const c = await getIdTokenClaims();
        if (!cancelled) setClaims(c as Record<string, unknown> | null);
      } catch {
        // ignore
      }

      // Verify backend auth
      try {
        const token = await getAuthToken();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
        const res = await fetch(`${apiUrl}/api/v1/auth/verify`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!cancelled) {
          if (res.ok) {
            const user = (await res.json()) as UserResponse;
            setVerifyResult({ ok: true, user });
          } else {
            const text = await res.text().catch(() => res.statusText);
            setVerifyResult({ ok: false, status: res.status, message: text });
          }
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setVerifyResult({ ok: false, status: 0, message });
        }
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeOrgId]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Home</h1>
        <p className="text-muted-foreground">Welcome to your dashboard.</p>
      </div>

      {/* Backend verify */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-muted-foreground h-5 w-5" />
            <h2 className="font-semibold">Backend Auth Verification</h2>
          </div>
          {verifyResult && <StatusBadge ok={verifyResult.ok} />}
        </div>

        <p className="text-muted-foreground mb-4 text-sm">
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
            GET {process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/verify
          </code>
        </p>

        {loading && <p className="text-muted-foreground text-sm">Loading...</p>}

        {verifyResult?.ok && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field icon={Hash} label="DB ID" value={verifyResult.user.id} />
            <Field
              icon={User}
              label="Name"
              value={
                [verifyResult.user.first_name, verifyResult.user.last_name]
                  .filter(Boolean)
                  .join(" ") || null
              }
            />
            <Field icon={Mail} label="Email" value={verifyResult.user.email} />
            <Field
              icon={User}
              label="Username"
              value={verifyResult.user.username}
            />
            <Field
              icon={Hash}
              label="Logto User ID"
              value={verifyResult.user.logto_user_id}
            />
            <Field
              icon={CheckCircle}
              label="Active"
              value={verifyResult.user.is_active ? "Yes" : "No"}
            />
          </div>
        )}

        {verifyResult && !verifyResult.ok && (
          <div className="bg-destructive/10 text-destructive flex items-start gap-3 rounded-md p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              {verifyResult.status !== 0 && (
                <p className="text-sm font-medium">
                  HTTP {verifyResult.status}
                </p>
              )}
              <p className="text-sm">{verifyResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Logto context debug */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Info className="text-muted-foreground h-5 w-5" />
          <h2 className="font-semibold">Logto Context (Debug)</h2>
          <span
            className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isAuthenticated
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {isAuthenticated ? "Authenticated" : "Not authenticated"}
          </span>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
              Active Org ID
            </p>
            <p className="text-sm font-medium">
              {activeOrgId || "none selected"}
            </p>
          </div>

          {permissions.size > 0 && (
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
                Permissions (from org token scope)
              </p>
              <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs leading-relaxed">
                {Array.from(permissions).join("\n")}
              </pre>
            </div>
          )}

          {claims && <JsonBlock label="ID Token Claims" data={claims} />}

          {verifyResult?.ok && (
            <JsonBlock label="Backend user response" data={verifyResult.user} />
          )}
        </div>
      </div>
    </div>
  );
}
