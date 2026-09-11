"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ViolationTagsDisplay } from "@/components/observations/ViolationTags";
import { useValidationQueue } from "@/hooks/use-validation-queue";
import { observationsApi } from "@/api/observations";
import {
  CheckCircle2,
  XCircle,
  Download,
  ArrowLeft,
  Trash2,
  SkipForward,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { ValidationDecision } from "@/api/observations/types";

function getSeverityColor(severity: string) {
  switch (severity?.toLowerCase()) {
    case "low":
      return "bg-green-100 text-green-800 border-green-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export default function ValidatePage() {
  const router = useRouter();
  const {
    status,
    current,
    submitDecision,
    advance,
    skip: skipObservation,
  } = useValidationQueue();

  const [confidence, setConfidence] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setConfidence(undefined);
    setNotes("");
  }, [current?.observation.id]);

  const handleSubmit = useCallback(
    async (decision: ValidationDecision) => {
      await submitDecision(decision, {
        confidence,
        notes: notes.trim() || undefined,
      });
    },
    [submitDecision, confidence, notes],
  );

  const handleDelete = useCallback(async () => {
    if (!current) return;
    try {
      await observationsApi.deleteObservation(current.observation.code);
      toast.success("Observation deleted");
      await advance();
    } catch {
      toast.error("Failed to delete observation");
    }
  }, [current, advance]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;
      if (status !== "reviewing") return;
      if (e.key === "t" || e.key === "T") handleSubmit("true_positive");
      if (e.key === "f" || e.key === "F") handleSubmit("false_positive");
      const digit = parseInt(e.key);
      if (digit >= 1 && digit <= 5) setConfidence(digit);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, handleSubmit]);

  const obs = current?.observation;
  const queueTotal = current?.queue_total ?? 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/observations")}
            className="-ml-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Validate Observations</h1>
            {queueTotal > 0 && (
              <p className="text-muted-foreground text-sm">
                {queueTotal} remaining
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/observations/validate/export")}
        >
          <Download className="mr-1 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Loading */}
      {(status === "loading" || status === "submitting") && (
        <div className="flex gap-6">
          <div className="min-w-0 flex-1 space-y-4 rounded-lg border bg-white p-6">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="w-72 flex-shrink-0 space-y-4 rounded-lg border bg-white p-5">
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Skeleton key={n} className="h-9 w-9 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      )}

      {/* Empty queue */}
      {status === "empty" && (
        <div className="rounded-lg border bg-white p-12 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h2 className="mb-1 text-lg font-semibold">Queue complete</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            All open observations have been validated.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/observations")}
            >
              Back to observations
            </Button>
            <Button
              onClick={() => router.push("/observations/validate/export")}
            >
              <Download className="mr-1 h-4 w-4" />
              Export validation data
            </Button>
          </div>
        </div>
      )}

      {/* Main content + sidebar */}
      {status === "reviewing" && obs && (
        <div className="flex flex-col gap-6 xl:flex-row">
          {/* Media + info */}
          <div className="min-w-0 flex-1 overflow-hidden rounded-lg border bg-white">
            {obs.thumbnail_url ? (
              <div className="relative aspect-video bg-black">
                <img
                  src={obs.thumbnail_url}
                  alt={obs.code}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center bg-gray-100">
                <span className="text-muted-foreground text-sm">No media</span>
              </div>
            )}
            <div className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-medium">
                  {obs.code}
                </span>
                <Badge
                  className={`${getSeverityColor(obs.severity)} text-xs`}
                  variant="outline"
                >
                  {obs.severity}
                </Badge>
                {obs.timestamp && (
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(obs.timestamp), "MMM dd, yyyy HH:mm")}
                  </span>
                )}
              </div>
              {obs.description && (
                <p className="text-sm text-gray-700">{obs.description}</p>
              )}
              {obs.violations && obs.violations.length > 0 && (
                <ViolationTagsDisplay violations={obs.violations} />
              )}
            </div>
          </div>

          {/* Validation sidebar */}
          <div className="w-full space-y-4 xl:w-72 xl:flex-shrink-0">
            <div className="space-y-4 rounded-lg border bg-white p-5">
              <div>
                <p className="mb-2 text-xs font-medium text-gray-600">
                  Confidence{" "}
                  <span className="text-muted-foreground font-normal">
                    (press 1–5)
                  </span>
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        setConfidence(confidence === n ? undefined : n)
                      }
                      className={`h-9 w-9 rounded-full border text-sm font-medium transition-colors ${
                        confidence === n
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-gray-600">
                  Notes{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </p>
                <Textarea
                  placeholder="Add context for the model trainer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-20 resize-none text-sm"
                />
              </div>

              <Button
                variant="outline"
                className="w-full border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50"
                onClick={() => handleSubmit("false_positive")}
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                False Positive
                <kbd className="ml-auto font-mono text-xs opacity-50">F</kbd>
              </Button>
              <Button
                className="w-full bg-green-600 text-white hover:bg-green-700"
                onClick={() => handleSubmit("true_positive")}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                True Positive
                <kbd className="ml-auto font-mono text-xs opacity-70">T</kbd>
              </Button>

              <div className="flex flex-col gap-1 border-t pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground w-full"
                  onClick={skipObservation}
                >
                  <SkipForward className="mr-1.5 h-3.5 w-3.5" />
                  Skip for now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive w-full"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete observation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
