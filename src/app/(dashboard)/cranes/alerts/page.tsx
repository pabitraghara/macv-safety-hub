"use client";

import { useCallback, useMemo, useState } from "react";
import { ConeIcon, RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import ErrorAlert from "@/components/common/ErrorAlert";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import SiteFilter from "@/components/common/filters/SiteFilter";
import { DateRangePickerWithPresets } from "@/components/common/filters/DateRangePicker";
import { DateRange } from "@/components/tremor/inputs/DatePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { Permission } from "@/lib/permissions";
import { ApiError } from "@/api/base/errors";
import {
  cranesApi,
  useCraneAlertStream,
  useCraneProximityAlerts,
  useCranes,
  type CraneProximityAlert,
} from "@/api/cranes";
import CraneAlertsTable from "../_components/CraneAlertsTable";
import {
  buildCraneAlertListParams,
  type CraneLevelFilter,
  type CraneStatusFilter,
} from "../_hooks/craneFilters";

/** The UI's "no filter" sentinel — Radix Select cannot hold an empty value. */
const ALL = "all";

function defaultDateRange(): DateRange {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - 7);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export default function CraneAlertsPage() {
  const { permissions } = useAuth();
  const canView = permissions.has(Permission.craneView);
  const canManage = permissions.has(Permission.craneManage);

  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const [status, setStatus] = useState<CraneStatusFilter>(ALL);
  const [level, setLevel] = useState<CraneLevelFilter>(ALL);
  const [craneId, setCraneId] = useState<string>(ALL);
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [pendingId, setPendingId] = useState<string | null>(null);

  // Nothing is requested without crane:view — the "no access" card below is
  // the whole page for such a user, and a 403 storm helps no one.
  const { data: cranes } = useCranes({ enabled: canView });

  const params = useMemo(
    () =>
      buildCraneAlertListParams({
        page,
        pageSize,
        status,
        level,
        craneId: craneId === ALL ? undefined : craneId,
        siteIds,
        startDate: dateRange.from?.toISOString(),
        endDate: dateRange.to?.toISOString(),
      }),
    [page, pageSize, status, level, craneId, siteIds, dateRange],
  );

  const {
    data: alerts,
    metadata,
    loading,
    error,
    initialized,
    refetch,
  } = useCraneProximityAlerts(params, { enabled: canView });

  const { streamError } = useCraneAlertStream({
    enabled: canView,
    onEvent: () => {
      // Fixed id: a pair oscillating across the threshold fires these back to
      // back, and without it sonner stacks one toast per event.
      toast.info("New crane proximity alert", { id: "crane-new-alert" });
      refetch({ silent: true });
    },
  });

  const acknowledge = useCallback(
    async (alert: CraneProximityAlert) => {
      try {
        setPendingId(alert.id);
        await cranesApi.acknowledgeAlert(alert.id);
        toast.success("Alert acknowledged");
        await refetch({ silent: true });
      } catch (err) {
        toast.error((err as ApiError).message || "Failed to acknowledge alert");
      } finally {
        setPendingId(null);
      }
    },
    [refetch],
  );

  const resolve = useCallback(
    async (alert: CraneProximityAlert) => {
      try {
        setPendingId(alert.id);
        await cranesApi.resolveAlert(alert.id);
        toast.success("Alert resolved");
        await refetch({ silent: true });
      } catch (err) {
        toast.error((err as ApiError).message || "Failed to resolve alert");
      } finally {
        setPendingId(null);
      }
    },
    [refetch],
  );

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

  // Every filter resets to page 1: keeping the offset across a narrower
  // result set lands the user on a page that no longer exists.
  function withPageReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Crane Alert History"
        description="Every proximity breach the edge box reported, open and resolved."
      />

      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePickerWithPresets
            value={dateRange}
            onChange={(range) => {
              if (!range) return;
              setDateRange(range);
              setPage(1);
            }}
            showTimePicker={true}
          />
          <Select
            value={status}
            onValueChange={withPageReset((v: string) =>
              setStatus(v as CraneStatusFilter),
            )}
          >
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={level}
            onValueChange={withPageReset((v: string) =>
              setLevel(v as CraneLevelFilter),
            )}
          >
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All levels</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={craneId} onValueChange={withPageReset(setCraneId)}>
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue placeholder="Crane" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All cranes</SelectItem>
              {cranes.map((crane) => (
                <SelectItem key={crane.id} value={crane.id}>
                  {crane.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SiteFilter onSiteChange={withPageReset(setSiteIds)} />
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={loading}
            onClick={() => refetch()}
            aria-label="Refresh alerts"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="sr-only">Refresh alerts</span>
          </Button>
        </div>
      </div>

      {/*
        Worth saying out loud, but not an error: the table is still correct and
        the refresh button still works — only the instant nudge is missing.
      */}
      {streamError && (
        <div className="text-muted-foreground mb-3 flex items-center gap-2 rounded-lg border border-dashed px-4 py-2 text-xs">
          <WifiOff className="h-3.5 w-3.5" />
          Live alert stream disconnected — refresh to see the newest alerts.
        </div>
      )}

      <div>
        {loading && !initialized && (
          <LoadingSpinner label="Loading alerts..." />
        )}
        {!loading && error && (
          <ErrorAlert message={error} onRetry={() => refetch()} />
        )}
        {initialized && !error && alerts.length === 0 && (
          <EmptyState
            title="No alerts found"
            message="No crane proximity alerts match the selected filters."
          />
        )}
        {initialized && !error && alerts.length > 0 && (
          <CraneAlertsTable
            alerts={alerts}
            metadata={metadata}
            onPageChange={setPage}
            onAcknowledge={canManage ? acknowledge : undefined}
            onResolve={canManage ? resolve : undefined}
            pendingId={pendingId}
          />
        )}
      </div>
    </div>
  );
}
