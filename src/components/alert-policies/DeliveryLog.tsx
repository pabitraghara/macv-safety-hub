"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EmptyState from "@/components/common/EmptyState";
import ErrorAlert from "@/components/common/ErrorAlert";
import { TablePagination } from "@/components/common/TablePagination";
import { useDeliveryLog, useDeliverySummary } from "@/api/notification-logs";
import type {
  DeliveryChannel,
  DeliveryStatus,
  DeliveryTriggerType,
} from "@/api/notification-logs";
import { usePolicies } from "@/api/alert-policies";
import {
  CHANNEL_LABELS,
  DeliveryStatusBadge,
  TRIGGER_TYPE_LABELS,
  formatDeliveryTime,
} from "./DeliveryStatusBadge";

/**
 * The delivery record for the organisation — "was anyone actually told?".
 *
 * Read-only: `notification_logs` is immutable, so there is nothing to edit
 * here. Suppressed and failed rows matter as much as sent ones, which is why
 * the status tiles sit above the table rather than behind a filter.
 */

const PAGE_SIZE = 25;

// Sentinel for "no filter" — Radix Select rejects an empty-string value.
const ANY = "any";

const RANGE_OPTIONS = [
  { value: "24h", label: "Last 24 hours", hours: 24 },
  { value: "7d", label: "Last 7 days", hours: 24 * 7 },
  { value: "30d", label: "Last 30 days", hours: 24 * 30 },
  { value: "all", label: "All time", hours: null },
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

/**
 * The ISO instant a relative range starts at, or undefined for "all time".
 * Reading the clock is impure, so this is only ever called from an effect or
 * an event handler — never during render.
 */
function anchorRange(range: RangeValue) {
  const option = RANGE_OPTIONS.find((o) => o.value === range);
  return {
    range,
    startDate: option?.hours
      ? new Date(Date.now() - option.hours * 3600_000).toISOString()
      : undefined,
  };
}

function SummaryTile({
  label,
  value,
  loading,
  className,
}: {
  label: string;
  value: number;
  loading: boolean;
  className?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-12" />
      ) : (
        <p className={`mt-1 text-2xl font-semibold ${className ?? ""}`}>
          {value}
        </p>
      )}
    </Card>
  );
}

export function DeliveryLog() {
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<RangeValue>("7d");
  const [status, setStatus] = useState<string>(ANY);
  const [channel, setChannel] = useState<string>(ANY);
  const [triggerType, setTriggerType] = useState<string>(ANY);
  const [policyId, setPolicyId] = useState<string>(ANY);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { policies } = usePolicies();

  // Typing a recipient shouldn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [range, status, channel, triggerType, policyId, debouncedSearch]);

  // The window is anchored once per range change so a re-render can't shift it
  // under the user. Until the anchor catches up with the selected range the
  // fetches stay parked — see `ready` below.
  const [rangeWindow, setRangeWindow] = useState<ReturnType<
    typeof anchorRange
  > | null>(null);

  useEffect(() => {
    setRangeWindow(anchorRange(range));
  }, [range]);

  const ready = rangeWindow?.range === range;
  const startDate = rangeWindow?.startDate;

  const filters = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      start_date: startDate,
      status: status === ANY ? undefined : (status as DeliveryStatus),
      channel: channel === ANY ? undefined : (channel as DeliveryChannel),
      trigger_type:
        triggerType === ANY ? undefined : (triggerType as DeliveryTriggerType),
      policy_id: policyId === ANY ? undefined : policyId,
      recipient_search: debouncedSearch || undefined,
    }),
    [page, startDate, status, channel, triggerType, policyId, debouncedSearch],
  );

  const summaryFilters = useMemo(
    () => ({ start_date: startDate }),
    [startDate],
  );

  const { items, pagination, loading, error, initialized, refetch } =
    useDeliveryLog(filters, { enabled: ready });
  const {
    summary,
    loading: summaryLoading,
    refetch: refetchSummary,
  } = useDeliverySummary(summaryFilters, { enabled: ready });

  // Re-anchoring rolls a relative window forward, so "Last 24 hours" means the
  // last 24 hours from the refresh — not from when the tab was opened.
  function refreshAll() {
    const next = anchorRange(range);
    if (next.startDate !== startDate) {
      setRangeWindow(next);
      return; // The filter change refetches on its own.
    }
    void refetch();
    void refetchSummary();
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Status tallies for the selected range — a failure is visible without
          paging through the table. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Sent"
          value={summary.sent}
          loading={summaryLoading}
          className="text-green-700 dark:text-green-400"
        />
        <SummaryTile
          label="Failed"
          value={summary.failed}
          loading={summaryLoading}
          className="text-red-700 dark:text-red-400"
        />
        <SummaryTile
          label="Suppressed"
          value={summary.suppressed}
          loading={summaryLoading}
          className="text-amber-700 dark:text-amber-400"
        />
        <SummaryTile
          label="Queued"
          value={summary.queued}
          loading={summaryLoading}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search recipient address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>

        <Select value={range} onValueChange={(v) => setRange(v as RangeValue)}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="suppressed">Suppressed</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
          </SelectContent>
        </Select>

        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any channel</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="in_app">In-app</SelectItem>
          </SelectContent>
        </Select>

        <Select value={triggerType} onValueChange={setTriggerType}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Trigger" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any trigger</SelectItem>
            <SelectItem value="observation">Observation</SelectItem>
            <SelectItem value="speed_violation">Speed violation</SelectItem>
            <SelectItem value="alpr">ANPR detection</SelectItem>
          </SelectContent>
        </Select>

        <Select value={policyId} onValueChange={setPolicyId}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Policy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any policy</SelectItem>
            {policies.map((policy) => (
              <SelectItem key={policy.id} value={policy.id}>
                {policy.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={refreshAll}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && <ErrorAlert message={error} onRetry={refreshAll} />}

      {!initialized && loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <EmptyState
          title="No deliveries"
          message="No alerts have been delivered in this range. Adjust the filters, or check that an alert policy has recipients."
        />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[170px]">Time</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead className="w-[100px]">Channel</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead>Trigger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDeliveryTime(entry.sent_at ?? entry.created_at)}
                  </TableCell>
                  <TableCell>
                    <DeliveryStatusBadge status={entry.status} />
                    {entry.failed_reason && (
                      <p
                        className="text-destructive mt-1 max-w-[160px] truncate text-xs"
                        title={entry.failed_reason}
                      >
                        {entry.failed_reason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {entry.recipient_label ?? entry.sent_to ?? "—"}
                    </div>
                    {entry.recipient_label && entry.sent_to && (
                      <div className="text-muted-foreground text-xs">
                        {entry.sent_to}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {CHANNEL_LABELS[entry.channel] ?? entry.channel}
                  </TableCell>
                  <TableCell>
                    {/* A deleted policy leaves the row's policy_id unresolved;
                        the legacy subscription pipeline has none at all. */}
                    {entry.policy_name ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      {entry.trigger_summary ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {TRIGGER_TYPE_LABELS[entry.trigger_type] ??
                        entry.trigger_type}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="px-4 pb-4">
            <TablePagination
              page={page}
              pageSize={PAGE_SIZE}
              totalCount={pagination.total_items}
              onPageChange={setPage}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
