'use client';

import { useState, useEffect } from 'react';
import { Bell, Mail, MonitorSmartphone, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useNotificationPreferences } from '@/api/notifications';
import { NOTIFICATION_EVENT_LABELS } from '@/api/notifications/types';
import { useToast } from '@/hooks/use-toast';

type PrefState = Record<string, { in_app_enabled: boolean; email_enabled: boolean }>;

const EVENT_TYPES = Object.keys(NOTIFICATION_EVENT_LABELS);

export default function NotificationPreferencesPage() {
  const { preferences, loading, saving, savePreferences } = useNotificationPreferences();
  const { toast } = useToast();

  const [local, setLocal] = useState<PrefState>({});
  const [dirty, setDirty] = useState(false);

  // Initialise local state once preferences load
  useEffect(() => {
    if (preferences.length === 0) return;
    const map: PrefState = {};
    for (const et of EVENT_TYPES) {
      const pref = preferences.find((p) => p.event_type === et);
      map[et] = {
        in_app_enabled: pref ? pref.in_app_enabled : true,
        email_enabled: pref ? pref.email_enabled : true,
      };
    }
    setLocal(map);
    setDirty(false);
  }, [preferences]);

  function toggle(eventType: string, channel: 'in_app_enabled' | 'email_enabled') {
    setLocal((prev) => ({
      ...prev,
      [eventType]: { ...prev[eventType], [channel]: !prev[eventType]?.[channel] },
    }));
    setDirty(true);
  }

  async function handleSave() {
    try {
      const updates = EVENT_TYPES.map((et) => ({
        event_type: et,
        in_app_enabled: local[et]?.in_app_enabled ?? true,
        email_enabled: local[et]?.email_enabled ?? true,
      }));
      await savePreferences(updates);
      setDirty(false);
      toast({ title: 'Preferences saved' });
    } catch {
      toast({ title: 'Failed to save preferences', variant: 'destructive' });
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notification Preferences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how you want to be notified about activity on incidents and observations.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Delivery channels</CardTitle>
          <CardDescription>
            Toggle in-app and email notifications for each event type.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Column headers */}
          <div className="flex items-center px-6 py-2 text-xs text-muted-foreground border-b bg-muted/30">
            <span className="flex-1">Event</span>
            <div className="flex items-center gap-8 pr-1">
              <span className="flex items-center gap-1.5 w-16 justify-center">
                <MonitorSmartphone className="h-3.5 w-3.5" />
                In-app
              </span>
              <span className="flex items-center gap-1.5 w-16 justify-center">
                <Mail className="h-3.5 w-3.5" />
                Email
              </span>
            </div>
          </div>

          {loading && (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          )}

          {!loading &&
            EVENT_TYPES.map((et, idx) => (
              <div key={et}>
                <div className="flex items-center px-6 py-4">
                  <span className="flex-1 text-sm">{NOTIFICATION_EVENT_LABELS[et]}</span>
                  <div className="flex items-center gap-8 pr-1">
                    <div className="w-16 flex justify-center">
                      <Switch
                        checked={local[et]?.in_app_enabled ?? true}
                        onCheckedChange={() => toggle(et, 'in_app_enabled')}
                      />
                    </div>
                    <div className="w-16 flex justify-center">
                      <Switch
                        checked={local[et]?.email_enabled ?? true}
                        onCheckedChange={() => toggle(et, 'email_enabled')}
                      />
                    </div>
                  </div>
                </div>
                {idx < EVENT_TYPES.length - 1 && <Separator />}
              </div>
            ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
