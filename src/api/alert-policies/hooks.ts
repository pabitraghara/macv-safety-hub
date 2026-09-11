"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { alertPoliciesApi } from "./api";
import type {
  AlertPolicy,
  AlertTarget,
  CreateContactRequest,
  CreatePolicyRequest,
  PolicyFilters,
  RecipientInput,
  RecipientUpdate,
  UpdateContactRequest,
  UpdatePolicyRequest,
} from "./types";

export function usePolicies(filters?: PolicyFilters) {
  const [policies, setPolicies] = useState<AlertPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Serialize filters to a stable string so the effect below doesn't refetch
  // in a loop when callers pass a fresh object literal each render.
  const filtersKey = JSON.stringify(filters ?? {});

  // Monotonic request token: overlapping fetches (e.g. rapid filter changes)
  // can resolve out of order, so only the latest request is allowed to commit
  // its result. Prevents a stale response from clobbering fresher state.
  const requestIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError(null);
      const data = await alertPoliciesApi.listPolicies(filters);
      if (requestId === requestIdRef.current) {
        setPolicies(data);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(
          err instanceof Error ? err.message : "Failed to load policies",
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createPolicy = useCallback(
    async (data: CreatePolicyRequest) => {
      const created = await alertPoliciesApi.createPolicy(data);
      await fetchAll();
      return created;
    },
    [fetchAll],
  );

  const updatePolicy = useCallback(
    async (id: string, data: UpdatePolicyRequest) => {
      const updated = await alertPoliciesApi.updatePolicy(id, data);
      await fetchAll();
      return updated;
    },
    [fetchAll],
  );

  const deletePolicy = useCallback(
    async (id: string) => {
      await alertPoliciesApi.deletePolicy(id);
      await fetchAll();
    },
    [fetchAll],
  );

  const addRecipients = useCallback(
    async (policyId: string, data: RecipientInput[]) => {
      const created = await alertPoliciesApi.addRecipients(policyId, data);
      await fetchAll();
      return created;
    },
    [fetchAll],
  );

  const updateRecipient = useCallback(
    async (policyId: string, recipientId: string, data: RecipientUpdate) => {
      const updated = await alertPoliciesApi.updateRecipient(
        policyId,
        recipientId,
        data,
      );
      await fetchAll();
      return updated;
    },
    [fetchAll],
  );

  const deleteRecipient = useCallback(
    async (policyId: string, recipientId: string) => {
      await alertPoliciesApi.deleteRecipient(policyId, recipientId);
      await fetchAll();
    },
    [fetchAll],
  );

  return {
    policies,
    loading,
    error,
    refetch: fetchAll,
    createPolicy,
    updatePolicy,
    deletePolicy,
    addRecipients,
    updateRecipient,
    deleteRecipient,
  };
}

// The backend exposes no `GET /alert-policies/{id}`, so a single policy is
// derived client-side from the list endpoint.
export function usePolicy(id: string) {
  const [policy, setPolicy] = useState<AlertPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError(null);
      const all = await alertPoliciesApi.listPolicies();
      if (requestId === requestIdRef.current) {
        setPolicy(all.find((p) => p.id === id) ?? null);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load policy");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { policy, loading, error, refetch: fetchAll };
}

export function useContacts() {
  const [contacts, setContacts] = useState<AlertTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError(null);
      const data = await alertPoliciesApi.listContacts();
      if (requestId === requestIdRef.current) {
        setContacts(data);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(
          err instanceof Error ? err.message : "Failed to load contacts",
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createContact = useCallback(
    async (data: CreateContactRequest) => {
      const created = await alertPoliciesApi.createContact(data);
      await fetchAll();
      return created;
    },
    [fetchAll],
  );

  const updateContact = useCallback(
    async (id: string, data: UpdateContactRequest) => {
      const updated = await alertPoliciesApi.updateContact(id, data);
      await fetchAll();
      return updated;
    },
    [fetchAll],
  );

  const deleteContact = useCallback(
    async (id: string) => {
      await alertPoliciesApi.deleteContact(id);
      await fetchAll();
    },
    [fetchAll],
  );

  return {
    contacts,
    loading,
    error,
    refetch: fetchAll,
    createContact,
    updateContact,
    deleteContact,
  };
}
