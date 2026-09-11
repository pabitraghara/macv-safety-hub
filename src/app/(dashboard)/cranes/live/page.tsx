"use client";

import dynamic from "next/dynamic";
import { ConeIcon, RefreshCw, WifiOff } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import ErrorAlert from "@/components/common/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth-context";
import { Permission } from "@/lib/permissions";
import { useState } from "react";
import { isLocated } from "../_hooks/craneFilters";
import { AlertBanner } from "../_components/AlertBanner";
import { CraneLivePanel } from "../_components/CraneLivePanel";
import { useCraneLiveView } from "../_hooks/useCraneLiveView";

/**
 * Leaflet is loaded only here, and only in the browser: it touches `window`
 * at import time, so server-rendering the module fails the build. The
 * skeleton reserves the map's full height so the page does not jump when the
 * chunk lands.
 */
const CraneMap = dynamic(() => import("../_components/CraneMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-[600px] w-full" />,
});

export default function CranesLivePage() {
  const { permissions } = useAuth();
  const canView = permissions.has(Permission.craneView);
  const canManage = permissions.has(Permission.craneManage);

  const [showRadius, setShowRadius] = useState(true);
  const {
    live,
    openAlerts,
    loading,
    error,
    initialized,
    streamError,
    refresh,
    acknowledge,
    // No crane request is issued at all without crane:view — the "no access"
    // card below is the whole page for such a user.
  } = useCraneLiveView({ enabled: canView });

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <ConeIcon className="text-muted-foreground h-8 w-8" />
            <p className="text-sm">
              You don&apos;t have access to the crane proximity module.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cranes = live?.cranes ?? [];
  const pairs = live?.pairs ?? [];
  const hasLocatedCrane = cranes.some(isLocated);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Crane Live Map"
        description="Positions refresh every 3 seconds. Distances are radius-adjusted and computed on the server."
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="crane-show-radius"
                checked={showRadius}
                onCheckedChange={setShowRadius}
              />
              <Label htmlFor="crane-show-radius" className="text-sm">
                Radius
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={loading}
              onClick={refresh}
              aria-label="Refresh live positions"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="sr-only">Refresh live positions</span>
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        {/*
          The stream being down is worth saying out loud but is not an error
          state: the 3-second poll still keeps the map and banner current, so
          the page stays fully usable — only the instant nudge is missing.
        */}
        {streamError && (
          <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed px-4 py-2 text-xs">
            <WifiOff className="h-3.5 w-3.5" />
            Live alert stream disconnected — still refreshing every 3 seconds.
          </div>
        )}

        {error && <ErrorAlert message={error} onRetry={refresh} />}

        <AlertBanner
          alerts={openAlerts}
          onAcknowledge={canManage ? acknowledge : undefined}
        />

        {!initialized ? (
          <Skeleton className="h-[600px] w-full" />
        ) : cranes.length === 0 ? (
          <EmptyState
            title="No cranes configured"
            message="Add cranes under Settings → Cranes, then the edge box will start reporting their positions here."
          />
        ) : (
          <>
            {!hasLocatedCrane && (
              <EmptyState
                title="No positions yet"
                message="Cranes are configured but none has reported a GPS fix. Check that the edge box can reach each crane's router."
              />
            )}
            {hasLocatedCrane && (
              <div className="h-[600px] w-full overflow-hidden rounded-xl border">
                <CraneMap
                  cranes={cranes}
                  pairs={pairs}
                  showRadius={showRadius}
                />
              </div>
            )}
            <CraneLivePanel cranes={cranes} pairs={pairs} />
          </>
        )}
      </div>
    </div>
  );
}
