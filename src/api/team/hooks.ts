'use client';

import { useState, useEffect, useCallback } from 'react';
import { teamApi } from './api';
import type { OrgMember, OrgRole, PendingInvitation } from './types';

export function useTeamMembers() {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setMembers(await teamApi.getMembers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateRole = useCallback(
    async (logtoUserId: string, role: string) => {
      await teamApi.updateMemberRole(logtoUserId, { role });
      await fetch();
    },
    [fetch],
  );

  const remove = useCallback(
    async (logtoUserId: string) => {
      await teamApi.removeMember(logtoUserId);
      await fetch();
    },
    [fetch],
  );

  return { members, loading, error, refetch: fetch, updateRole, remove };
}

export function usePendingInvitations() {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setInvitations(await teamApi.getInvitations());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const revoke = useCallback(
    async (invitationId: string) => {
      await teamApi.revokeInvitation(invitationId);
      await fetch();
    },
    [fetch],
  );

  return { invitations, loading, error, refetch: fetch, revoke };
}

export function useOrgRoles() {
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    teamApi
      .getOrgRoles()
      .then(setRoles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { roles, loading };
}
