"use client";

import { useState, useEffect, useCallback } from "react";
import { sitesApi } from "./api";
import type { Site, UpdateSiteRequest } from "./types";

export function useSite(id: string) {
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSite(await sitesApi.getSite(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load site");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  async function update(data: UpdateSiteRequest): Promise<Site> {
    const updated = await sitesApi.updateSite(id, data);
    setSite(updated);
    return updated;
  }

  return { site, loading, error, update };
}

export function useMySites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSites(await sitesApi.getMySites());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { sites, loading, error, refetch: fetch };
}
