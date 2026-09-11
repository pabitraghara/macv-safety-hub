"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLogto } from "@logto/react";
import { useAuth } from "@/lib/auth-context";
import { setPendingInvitation } from "@/lib/invite-flow";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import type { InvitationDetail } from "@/api/team/types";
import { teamApi } from "@/api/team";
import { toast } from "sonner";

/** Marks that this invitation already sent the browser to Logto once. */
function attemptKey(invitationId: string): string {
  return `invite_signin_attempted:${invitationId}`;
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <InvitePageInner />
    </Suspense>
  );
}

function InvitePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { signIn, clearAllTokens } = useLogto();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const invitationId = searchParams.get("invitation_id");
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [invitation, setInvitation] = useState<InvitationDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [needsManualSignIn, setNeedsManualSignIn] = useState(false);
  const signInStarted = useRef(false);

  // Redirect if no invitation ID
  useEffect(() => {
    if (!invitationId) router.replace("/");
  }, [invitationId, router]);

  // Hand off to Logto. The invitation ID is stashed first so /callback can
  // accept it the moment sign-in completes — the invitee never comes back
  // through this page. A ref guards React StrictMode's double-invoke.
  const startSignIn = useCallback(() => {
    if (!invitationId || signInStarted.current) return;
    signInStarted.current = true;
    setNeedsManualSignIn(false);
    sessionStorage.setItem(attemptKey(invitationId), "1");
    setPendingInvitation(invitationId);
    signIn({
      redirectUri: `${window.location.origin}/callback`,
      ...(email ? { loginHint: email } : {}),
      extraParams: token ? { one_time_token: token } : undefined,
    }).catch(() => {
      // signIn() only rejects on a failure before it can navigate away.
      signInStarted.current = false;
      setNeedsManualSignIn(true);
    });
  }, [invitationId, email, token, signIn]);

  // Unauthenticated invitees go straight to sign-in — the old "Accept & Sign
  // in" interstitial only ever had one button, so it cost a click and a render
  // without adding information.
  //
  // Auto-redirect fires only on the first arrival for this invitation. If the
  // user comes back here still unauthenticated (a failed callback, a dropped
  // session) the manual button takes over, so the app can never bounce them
  // between here and auth.macv.ai in a loop.
  useEffect(() => {
    if (authLoading || isAuthenticated || !invitationId) return;
    if (sessionStorage.getItem(attemptKey(invitationId))) {
      setNeedsManualSignIn(true);
      return;
    }
    startSignIn();
  }, [authLoading, isAuthenticated, invitationId, startSignIn]);

  // After accepting, clear all cached tokens so the next getAccessToken call
  // fetches a fresh token from Logto that includes the new org membership/role
  // claims, then navigate to the dashboard.
  const refreshSessionAndRedirect = useCallback(async () => {
    try {
      await clearAllTokens();
    } catch {
      // non-fatal — proceed to dashboard regardless
    }
    window.location.href = "/";
  }, [clearAllTokens]);

  // Fetch invitation details once authenticated
  useEffect(() => {
    if (!isAuthenticated || authLoading || !invitationId) return;

    let cancelled = false;
    setLoading(true);

    teamApi
      .getInvitationDetail(invitationId)
      .then((inv) => {
        if (!cancelled) {
          if (inv.status === "Accepted") {
            // Already accepted (e.g. Logto auto-accepted via one-time token).
            // Clear cached tokens so next request picks up the new org claims.
            refreshSessionAndRedirect();
            return;
          }
          setInvitation(inv);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(
            err instanceof Error ? err.message : "Could not load invitation.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    authLoading,
    invitationId,
    router,
    refreshSessionAndRedirect,
  ]);

  // Handle manual accept
  async function handleAccept() {
    if (!invitationId) return;
    try {
      setAccepting(true);
      await teamApi.acceptInvitation(invitationId);
      toast.success("You've joined the organisation!");
      await refreshSessionAndRedirect();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to accept invitation",
      );
      setAccepting(false);
    }
  }

  if (!invitationId) return null;

  // ── Loading ──
  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // ── Unauthenticated: redirecting to sign-in ──
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="text-primary mx-auto mb-2 h-10 w-10" />
            <CardTitle>You have been invited</CardTitle>
            <CardDescription>
              {needsManualSignIn
                ? "Sign in to accept your invitation — you'll be added to the organisation automatically."
                : "Taking you to sign-in… you'll be added to the organisation automatically."}
            </CardDescription>
          </CardHeader>
          {(email || needsManualSignIn) && (
            <CardContent className="space-y-3">
              {email && (
                <div className="flex items-center justify-between rounded-md border px-4 py-3">
                  <span className="text-muted-foreground text-sm">
                    Invited email
                  </span>
                  <span className="text-sm font-medium">{email}</span>
                </div>
              )}
              {needsManualSignIn && (
                <Button className="w-full" size="lg" onClick={startSignIn}>
                  Sign in to accept
                </Button>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  // ── Authenticated: Error ──
  if (fetchError || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShieldAlert className="text-destructive mx-auto mb-2 h-10 w-10" />
            <CardTitle>Invitation not found</CardTitle>
            <CardDescription>
              {fetchError ??
                "This invitation may have expired or been revoked."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" asChild>
              <a href="/">Go to dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Authenticated: Expired / Already handled ──
  const isExpired = new Date(invitation.expires_at) < new Date();
  const isHandled = invitation.status !== "Pending";

  if (isExpired || isHandled) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Clock className="text-muted-foreground mx-auto mb-2 h-10 w-10" />
            <CardTitle>
              {isExpired
                ? "Invitation expired"
                : `Invitation ${invitation.status.toLowerCase()}`}
            </CardTitle>
            <CardDescription>
              {isExpired
                ? "This invitation link has expired. Ask an admin to send a new one."
                : "This invitation has already been used."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" asChild>
              <a href="/">Go to dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Authenticated: Pending — show details and accept ──
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle2 className="text-primary mx-auto mb-2 h-10 w-10" />
          <CardTitle>You have been invited to join</CardTitle>
          <CardDescription className="text-foreground mt-1 text-base font-medium">
            {invitation.org_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border px-4 py-3">
            <span className="text-muted-foreground text-sm">Invited as</span>
            <div className="flex gap-1.5">
              {invitation.roles.map((r) => (
                <Badge key={r} variant="secondary" className="capitalize">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border px-4 py-3">
            <span className="text-muted-foreground text-sm">Your email</span>
            <span className="text-sm font-medium">{invitation.email}</span>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? "Accepting…" : "Accept invitation"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
