"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpeedViolation } from "@/api/speed-violations";
import { useTimezone } from "@/contexts/TimezoneContext";
import { AnprHistory } from "./components/AnprHistory";
import { EvidenceMedia } from "./components/EvidenceMedia";
import { OwnerCard } from "./components/OwnerCard";
import { ViolationSummary } from "./components/ViolationSummary";
import { AlertsSentPanel } from "@/components/alert-policies/AlertsSentPanel";
import { useAuth } from "@/lib/auth-context";
import { Permission } from "@/lib/permissions";

/**
 * Speed-violation detail page.
 *
 * Freshness model: all evidence media are 1-hour signed GCS URLs and the
 * backend re-signs them on every GET, so `refetch()` is the universal
 * refresh — it renews media links AND repulls the ANPR history / owner
 * registry (which can change after ingest, unlike the violation row itself).
 * Exposed as a header Refresh button, an expired-media overlay, and a 50-min
 * auto refetch that beats the URL expiry for long-open tabs.
 */

// Re-sign safely before the 1h URL expiry.
const RESIGN_INTERVAL_MS = 50 * 60 * 1000;

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-900",
  error:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  default:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900",
};

export default function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const { timezone } = useTimezone();
  const router = useRouter();
  // The delivery log is gated on site:view, same as alert policies.
  const { permissions } = useAuth();
  const canViewDeliveries = permissions.has(Permission.siteView);

  const [anprPage, setAnprPage] = useState(1);
  const [anprPageSize, setAnprPageSize] = useState(5);

  const params = useMemo(
    () => ({
      include_anpr: true,
      anpr_page: anprPage,
      anpr_page_size: anprPageSize,
      timezone,
    }),
    [anprPage, anprPageSize, timezone],
  );

  const { data, loading, error, refetch } = useSpeedViolation(id, params);
  const violation = data?.violation ?? null;
  const anpr = data?.anpr_detections ?? null;

  // Long-open tabs: refetch before the signed URLs expire.
  useEffect(() => {
    const timer = setInterval(() => void refetch(), RESIGN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refetch]);

  // ── Loading / error states ─────────────────────────────────────────────

  if (!violation && loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Skeleton className="aspect-video w-full" />
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!violation) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <Card className="p-8 text-center">
          <p className="text-destructive mb-1 font-medium">
            {error ? "Failed to load violation" : "Violation not found"}
          </p>
          {error && (
            <p className="text-muted-foreground mb-4 text-sm">{error}</p>
          )}
          <Button variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const statusClass =
    STATUS_BADGE_CLASSES[violation.status] ?? STATUS_BADGE_CLASSES.default;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <div className="bg-destructive/10 flex h-9 w-9 items-center justify-center rounded-lg">
          <AlertTriangle className="text-destructive h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Speed Violation</h1>
          {violation.alert_id && (
            <p className="text-muted-foreground truncate text-xs">
              Alert ID: {violation.alert_id}
            </p>
          )}
        </div>
        <Badge
          variant="outline"
          className={`${statusClass} text-xs capitalize`}
        >
          {violation.status}
        </Badge>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Evidence + summary */}
      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <EvidenceMedia
          violation={violation}
          refreshing={loading}
          onRefresh={() => void refetch()}
        />
        <div className="space-y-4">
          <ViolationSummary violation={violation} timezone={timezone} />
          <OwnerCard
            owner={violation.owner}
            hasPlate={Boolean(violation.license_plate)}
          />
          {canViewDeliveries && <AlertsSentPanel triggerId={violation.id} />}
        </div>
      </div>

      {/* ANPR history */}
      <AnprHistory
        detections={anpr?.data ?? []}
        metadata={anpr?.metadata ?? null}
        page={anprPage}
        pageSize={anprPageSize}
        timezone={timezone}
        onPageChange={setAnprPage}
        onPageSizeChange={(size) => {
          setAnprPageSize(size);
          setAnprPage(1);
        }}
      />
    </div>
  );
}
