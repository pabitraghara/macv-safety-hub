'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi } from './api';
import type { Notification, NotificationPreference } from './types';

// ─── useNotifications ────────────────────────────────────────────────────────

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [resp, countResp] = await Promise.all([
        notificationsApi.getNotifications(1, 50),
        notificationsApi.getUnreadCount(),
      ]);
      setNotifications(resp.items);
      setUnreadCount(countResp.unread_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = useCallback(
    async (notificationId: string) => {
      try {
        await notificationsApi.markRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n,
          ),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark as read');
      }
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all as read');
    }
  }, []);

  return { notifications, unreadCount, loading, error, markRead, markAllRead, refetch: fetchNotifications };
}

// ─── useNotificationPreferences ──────────────────────────────────────────────

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const prefs = await notificationsApi.getPreferences();
      setPreferences(prefs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const savePreferences = useCallback(
    async (
      updates: Array<{ event_type: string; in_app_enabled: boolean; email_enabled: boolean }>,
    ) => {
      try {
        setSaving(true);
        setError(null);
        const updated = await notificationsApi.updatePreferences({ preferences: updates });
        setPreferences(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save preferences');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return { preferences, loading, saving, error, savePreferences, refetch: fetchPreferences };
}
