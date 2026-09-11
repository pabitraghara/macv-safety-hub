"use client";

import { useState } from "react";
import { useHandleSignInCallback, useLogto } from "@logto/react";
import { useRouter } from "next/navigation";
import {
  acceptInvitationWithToken,
  takePendingInvitation,
} from "@/lib/invite-flow";

export default function CallbackPage() {
  const router = useRouter();
  const { getAccessToken, clearAllTokens } = useLogto();
  const [finishingInvite, setFinishingInvite] = useState(false);

  const { isLoading, error } = useHandleSignInCallback(() => {
    // An invitee comes back here straight from the sign-up screens. Accept the
    // invitation on the spot (the ID was stashed before the redirect) so the
    // user lands on the dashboard instead of round-tripping through /invite.
    const pendingInvitationId = takePendingInvitation();
    if (pendingInvitationId) {
      setFinishingInvite(true);
      void finishInvite(pendingInvitationId);
      return;
    }

    // Check for a custom pre-auth redirect stored in sessionStorage — used by
    // any flow that needs to preserve a return URL across the PKCE round-trip
    // (e.g. a deep link hit before sign-in).
    const returnTo = sessionStorage.getItem("logto_return_to");
    sessionStorage.removeItem("logto_return_to");
    // Only honour same-origin paths — never absolute or protocol-relative
    // URLs — so a poisoned value can't turn this into an open redirect.
    const safeReturnTo =
      returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
        ? returnTo
        : "/";
    router.push(safeReturnTo);
  });

  async function finishInvite(invitationId: string) {
    try {
      const token = await getAccessToken(process.env.NEXT_PUBLIC_API_RESOURCE!);
      if (!token) throw new Error("Could not obtain an access token");
      await acceptInvitationWithToken(invitationId, token);
    } catch {
      // Accepting failed (expired, revoked, wrong email). Hand off to /invite,
      // which renders the specific reason once it loads the invitation.
      window.location.replace(`/invite?invitation_id=${invitationId}`);
      return;
    }
    // Accepting granted the org role, so every cached token is now stale. Drop
    // them and do a full load of the dashboard: the next getAccessToken then
    // fetches a token carrying the new org membership and role claims.
    try {
      await clearAllTokens();
    } catch {
      // non-fatal — proceed to the dashboard regardless
    }
    window.location.replace("/");
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-destructive font-medium">Sign-in failed</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
          <button
            className="text-sm underline"
            onClick={() => router.push("/login")}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">
        {finishingInvite
          ? "Setting up your access..."
          : isLoading
            ? "Signing in..."
            : "Redirecting..."}
      </p>
    </div>
  );
}
