"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  CloudCog,
  Loader2,
  RefreshCw,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { usePlateOcrTrainingRuns } from "@/api/plate-ocr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function metric(value: unknown) {
  return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "—";
}

function statusStyle(status: string) {
  if (status === "promoted") return "bg-violet-100 text-violet-800";
  if (status === "ready") return "bg-emerald-100 text-emerald-800";
  if (status === "rejected" || status === "failed")
    return "bg-red-100 text-red-800";
  return "bg-blue-100 text-blue-800";
}

export function TrainingRuns({ eligibleCount }: { eligibleCount: number }) {
  const training = usePlateOcrTrainingRuns();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const startTraining = async () => {
    try {
      await training.create();
      setConfirmOpen(false);
      toast.success("OCR fine-tuning submitted to Vertex AI");
    } catch {
      toast.error("Could not start OCR fine-tuning");
    }
  };

  const promote = async (runId: string) => {
    try {
      await training.promote(runId);
      toast.success("OCR candidate promoted");
    } catch {
      toast.error("Could not promote this candidate");
    }
  };

  return (
    <div className="mb-5 overflow-hidden rounded-xl border bg-white dark:bg-slate-950">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <CloudCog className="h-4 w-4" /> Model fine-tuning
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Snapshot approved gate and speed crops, train on Vertex AI, then
            compare against the base model.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={training.refresh}
            title="Refresh training runs"
          >
            <RefreshCw
              className={`h-4 w-4 ${training.loading ? "animate-spin" : ""}`}
            />
          </Button>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button disabled={eligibleCount === 0 || training.submitting}>
                {training.submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="mr-2 h-4 w-4" />
                )}
                Start fine-tune
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start an OCR fine-tune?</DialogTitle>
                <DialogDescription>
                  This snapshots all {eligibleCount} approved labels, uses a
                  stable 80/20 train-validation split, and starts a GPU job. The
                  result will not replace the active model automatically.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={startTraining} disabled={training.submitting}>
                  Submit training job
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {training.error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {training.error}
        </div>
      )}

      {training.loading && training.runs.length === 0 ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 p-8 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading training runs…
        </div>
      ) : training.runs.length === 0 ? (
        <div className="text-muted-foreground p-6 text-center text-sm">
          No fine-tuning runs yet. Review enough samples, then start the first
          run.
        </div>
      ) : (
        <div className="divide-y">
          {training.runs.map((run) => {
            const metrics = run.metrics ?? {};
            return (
              <div
                key={run.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {run.name}
                    </span>
                    <Badge className={statusStyle(run.status)}>
                      {run.status}
                    </Badge>
                    {run.is_active && (
                      <Badge
                        variant="outline"
                        className="border-violet-300 text-violet-700"
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {run.train_count} train · {run.validation_count} validation
                    · created{" "}
                    {format(new Date(run.created_at), "dd MMM, HH:mm")}
                  </p>
                  {run.error && (
                    <p className="mt-1 text-xs text-red-700">{run.error}</p>
                  )}
                </div>
                <div className="text-muted-foreground flex gap-5 text-xs">
                  <span>
                    Base
                    <strong className="text-foreground ml-1 font-medium">
                      {metric(metrics.baseline_plate_accuracy)}
                    </strong>
                  </span>
                  <span>
                    Candidate
                    <strong className="text-foreground ml-1 font-medium">
                      {metric(metrics.candidate_plate_accuracy)}
                    </strong>
                  </span>
                </div>
                <div>
                  {run.status === "ready" && run.evaluation_passed ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={training.submitting}
                      onClick={() => promote(run.id)}
                    >
                      <ShieldCheck className="mr-1.5 h-4 w-4" /> Promote
                    </Button>
                  ) : run.status === "promoted" ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Evaluation passed
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
