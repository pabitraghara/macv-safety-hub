"use client";

import { useState, useEffect } from "react";
import { userApi } from "./api";
import type { UserProfile, UpdateUserProfileRequest } from "./types";

export function useMyProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    userApi
      .getMyProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load profile",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function update(data: UpdateUserProfileRequest): Promise<UserProfile> {
    const updated = await userApi.updateMyProfile(data);
    setProfile(updated);
    return updated;
  }

  return { profile, loading, error, update };
}
