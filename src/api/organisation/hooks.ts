"use client";

import { useState, useEffect, useCallback } from "react";
import { organisationApi } from "./api";
import type { Organisation, UpdateOrganisationRequest } from "./types";

export function useMyOrganisation() {
  const [org, setOrg] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setOrg(await organisationApi.getMyOrg());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load organisation",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const update = useCallback(
    async (data: UpdateOrganisationRequest): Promise<Organisation> => {
      const updated = await organisationApi.updateMyOrg(data);
      setOrg(updated);
      return updated;
    },
    [],
  );

  return { org, loading, error, update };
}
