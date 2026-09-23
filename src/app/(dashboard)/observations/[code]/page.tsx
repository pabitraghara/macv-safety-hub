"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafetyAnalysisCard } from "@/components/observations/SafetyAnalysisCard";
import {
  SEVERITY_BADGE_CLASS,
  SeverityIcon,
} from "@/components/observations/severity";
import { loadViolations, type Violation } from "@/lib/violations";

interface ViolationDetail {
  violation: Violation;
  prevCode: string | null;
  nextCode: string | null;
}

function formatCaptured(capturedAt: Date | null) {
  if (!capturedAt) return "—";
  try {
    return format(capturedAt, "MMM dd, yyyy · HH:mm");
  } catch {
    return "Invalid date";
  }
}

export default function ObservationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const codeParam =
    typeof params?.code === "string"
      ? params.code
      : Array.isArray(params?.code)
        ? params.code[0]
        : "";

  const [detail, setDetail] = useState<ViolationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadObservation() {
      setLoading(true);
      setError(null);
      try {
        const violations = await loadViolations(controller.signal);
        const index = violations.findIndex((v) => v.code === codeParam);
        if (index === -1)
          throw new Error(`No violation with code ${codeParam}`);

        setDetail({
          violation: violations[index],
          prevCode: index > 0 ? violations[index - 1].code : null,
          nextCode:
            index < violations.length - 1 ? violations[index + 1].code : null,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Failed to load observations.json", err);
        setError("Could not load this violation.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadObservation();
    return () => controller.abort();
  }, [codeParam]);

  if (loading) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        Loading violation…
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <Card className="border-destructive/50">
          <CardContent className="space-y-3 text-center">
            <p className="text-destructive text-sm">
              {error ?? "Violation not found."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/observations")}
            >
              Back to violations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!detail.prevCode}
            aria-label="Previous violation"
            onClick={() => router.push(`/observations/${detail.prevCode}`)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!detail.nextCode}
            aria-label="Next violation"
            onClick={() => router.push(`/observations/${detail.nextCode}`)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground ml-1 font-mono text-xs break-all">
            {detail.violation.code}
          </span>
        </div>
        <Badge
          variant="outline"
          className={`shrink-0 gap-1 ${SEVERITY_BADGE_CLASS[detail.violation.analysis.maxSeverity]}`}
        >
          <SeverityIcon
            severity={detail.violation.analysis.maxSeverity}
            className="h-3 w-3"
          />
          {detail.violation.analysis.maxSeverity}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Safety Analysis Results</span>
            <span className="text-muted-foreground text-xs font-normal">
              {formatCaptured(detail.violation.capturedAt)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-hidden rounded-lg border bg-black">
            <video
              key={detail.violation.videoUrl}
              src={detail.violation.videoUrl}
              poster={detail.violation.posterUrl}
              controls
              playsInline
              preload="metadata"
              className="h-auto w-full"
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <SafetyAnalysisCard analysis={detail.violation.analysis} />
        </CardContent>
      </Card>
    </div>
  );
}
