/**
 * Invite hand-off across the OIDC round trip.
 *
 * The invitee's browser leaves the app for auth.macv.ai (password + profile
 * screens) and comes back on /callback. Stashing the invitation ID lets the
 * callback accept it directly instead of bouncing back through /invite — one
 * fewer navigation, and no second invitation-detail fetch.
 *
 * The accept call deliberately does NOT go through the shared axios client:
 * that client reads a module-level token getter which AuthProvider only wires
 * once `isAuthenticated` has propagated, which is not guaranteed at the moment
 * the callback fires. Taking the token straight from the SDK removes the race.
 */

const PENDING_INVITE_KEY = "pending_invitation_id";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

export function setPendingInvitation(invitationId: string): void {
  sessionStorage.setItem(PENDING_INVITE_KEY, invitationId);
}

/** Read and clear the pending invitation ID (one-shot, so retries can't loop). */
export function takePendingInvitation(): string | null {
  const id = sessionStorage.getItem(PENDING_INVITE_KEY);
  sessionStorage.removeItem(PENDING_INVITE_KEY);
  return id;
}

export async function acceptInvitationWithToken(
  invitationId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/users/invitations/${invitationId}/accept`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    const detail = await res
      .json()
      .then((body: { detail?: string }) => body?.detail)
      .catch(() => undefined);
    throw new Error(detail ?? "Failed to accept invitation");
  }
}
