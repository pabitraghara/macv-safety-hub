"use client";

import { useMemo, useState } from "react";
import { Ban, Clock3, Loader2, Play, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import { usePlateOcrVerificationRuns } from "@/api/plate-ocr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const ACTIVE_STATUSES = new Set(["preparing", "queued", "running"]);

function integer(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function dollars(value: number) {
  return `$${value.toFixed(value < 0.1 ? 6 : 2)}`;
}

function latency(value: number | null) {
  if (value === null) return "—";
  return value >= 1000
    ? `${(value / 1000).toFixed(2)}s`
    : `${value.toFixed(0)}ms`;
}

function elapsed(startedAt: string | null, completedAt: string | null) {
  if (!startedAt) return "—";
  const seconds = Math.max(
    0,
    Math.round(
      ((completedAt ? new Date(completedAt).getTime() : Date.now()) -
        new Date(startedAt).getTime()) /
        1000,
    ),
  );
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function statusClass(status: string) {
  if (status === "completed")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "cancelled" || status === "failed")
    return "border-red-200 bg-red-50 text-red-800";
  return "border-blue-200 bg-blue-50 text-blue-800";
}

export function VerificationRuns() {
  const verification = usePlateOcrVerificationRuns();
  const [sampleCount, setSampleCount] = useState("100");
  const parsedCount = Number(sampleCount);
  const maximum = verification.summary?.max_samples_per_run ?? 1000;
  const canStart =
    verification.summary?.enabled === true &&
    Number.isInteger(parsedCount) &&
    parsedCount >= 1 &&
    parsedCount <= maximum &&
    !verification.runs.some((run) => ACTIVE_STATUSES.has(run.status));

  const pricing = useMemo(() => {
    if (!verification.summary) return null;
    return `${dollars(verification.summary.input_price_per_million_usd)}/M input + ${dollars(verification.summary.output_price_per_million_usd)}/M output + ${dollars(verification.summary.thinking_price_per_million_usd)}/M thinking`;
  }, [verification.summary]);

  const start = async () => {
    if (!canStart) return;
    try {
      const run = await verification.create({ sample_count: parsedCount });
      toast.success(`Queued ${run.selected_count} newest OCR samples`);
    } catch {
      toast.error("Could not start the Gemini verification campaign");
    }
  };

  const cancel = async (runId: string) => {
    try {
      await verification.cancel(runId);
      toast.success("Gemini verification campaign cancelled");
    } catch {
      toast.error("Could not cancel the campaign");
    }
  };

  return (
    <Card className="mb-5">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold">Gemini verification</h2>
              {verification.summary && (
                <Badge variant="outline">
                  {verification.summary.enabled ? "Enabled" : "Disabled"}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Run bounded newest-first campaigns. New live detections continue
              independently.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              aria-label="Backfill sample count"
              type="number"
              min={1}
              max={maximum}
              value={sampleCount}
              onChange={(event) => setSampleCount(event.target.value)}
              className="w-28"
            />
            <Button
              disabled={!canStart || verification.submitting}
              onClick={start}
            >
              {verification.submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Start newest {Number.isFinite(parsedCount) ? parsedCount : ""}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Refresh Gemini metrics"
              onClick={verification.refresh}
            >
              <RefreshCw
                className={`h-4 w-4 ${verification.loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {verification.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {verification.error}
          </div>
        )}

        {verification.summary && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                [
                  "Pending crops",
                  integer(verification.summary.pending_sample_count),
                ],
                [
                  "Gemini requests",
                  integer(verification.summary.request_count),
                ],
                [
                  "Total tokens",
                  integer(verification.summary.total_token_count),
                ],
                [
                  "Estimated cost",
                  dollars(verification.summary.estimated_cost_usd),
                ],
                [
                  "Average latency",
                  latency(verification.summary.average_latency_ms),
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p className="mt-1 font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Estimate uses Vertex response tokens at {pricing}; thinking level
              is {verification.summary.thinking_level}. Requests carry billing
              labels <code>application=macv-alpr-ocr</code> and{" "}
              <code>operation=plate-verification</code>. Actual GCP billing can
              lag and may include discounts or taxes.
            </p>
          </>
        )}

        <div className="space-y-2">
          {verification.runs.map((run) => {
            const completed = run.metrics.completed_count;
            const progress = run.selected_count
              ? Math.round((completed / run.selected_count) * 100)
              : 100;
            const active = ACTIVE_STATUSES.has(run.status);
            return (
              <div key={run.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{run.name}</p>
                      <Badge
                        variant="outline"
                        className={statusClass(run.status)}
                      >
                        {run.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {completed}/{run.selected_count} complete · {progress}% ·{" "}
                      {integer(run.metrics.total_token_count)} tokens ·{" "}
                      {dollars(run.metrics.estimated_cost_usd)} ·{" "}
                      {latency(run.metrics.average_latency_ms)} average ·{" "}
                      {elapsed(run.started_at, run.completed_at)} elapsed
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {run.metrics.status_counts.agreed ?? 0} agreed ·{" "}
                      {run.metrics.status_counts.disagreement ?? 0}{" "}
                      disagreements · {run.metrics.failure_count} failed
                    </p>
                  </div>
                  {active && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={verification.submitting}
                      onClick={() => cancel(run.id)}
                    >
                      <Ban className="mr-2 h-4 w-4" /> Stop
                    </Button>
                  )}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
          {!verification.loading && verification.runs.length === 0 && (
            <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm">
              <Clock3 className="h-4 w-4" /> No Gemini verification campaigns
              yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
