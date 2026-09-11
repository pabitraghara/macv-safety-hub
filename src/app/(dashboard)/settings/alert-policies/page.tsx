"use client";

import { useMemo } from "react";
import { Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { Permission } from "@/lib/permissions";
import type { AlertTriggerType } from "@/api/alert-policies";
import { PolicyList } from "@/components/alert-policies/PolicyList";
import { ContactBook } from "@/components/alert-policies/ContactBook";
import { DeliveryLog } from "@/components/alert-policies/DeliveryLog";

export default function AlertPoliciesPage() {
  const { permissions } = useAuth();
  const canView = permissions.has(Permission.siteView);
  const canManage = permissions.has(Permission.siteManage);

  const availableTriggers = useMemo<AlertTriggerType[]>(() => {
    const triggers: AlertTriggerType[] = [];
    if (
      permissions.has(Permission.observationView) ||
      permissions.has(Permission.incidentView)
    ) {
      triggers.push("safety");
    }
    if (permissions.has(Permission.vehicleView)) {
      triggers.push("speed_violation");
      triggers.push("alpr");
    }
    return triggers;
  }, [permissions]);

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Bell className="text-muted-foreground h-8 w-8" />
            <p className="text-sm">
              You don&apos;t have access to alert policies.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Alert Policies</h1>
        <p className="text-muted-foreground text-sm">
          Create an alert once, then choose who gets notified.
        </p>
      </div>

      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="deliveries">Delivery log</TabsTrigger>
        </TabsList>
        <TabsContent value="policies">
          <PolicyList
            canManage={canManage}
            availableTriggers={availableTriggers}
          />
        </TabsContent>
        <TabsContent value="contacts">
          <ContactBook canManage={canManage} />
        </TabsContent>
        <TabsContent value="deliveries">
          <DeliveryLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
