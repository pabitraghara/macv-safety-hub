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
import {
  parseSafetyAnalysis,
  type SafetyAnalysis,
} from "@/lib/safety-analysis";
import { posterUrlFor } from "@/lib/media";

/** Shape of one entry in public/observations.json, written by generate-index. */
interface RawObservation {
  id: string;
  code: string;
  videoUrl: string;
  description: string;
  timestamp: string | null;
}

interface ViolationDetail {
  code: string;
  videoUrl: string;
  timestamp: string | null;
  analysis: SafetyAnalysis;
  prevCode: string | null;
  nextCode: string | null;
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) return "—";
  try {
    return format(new Date(timestamp), "MMM dd, yyyy · HH:mm");
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
    let cancelled = false;

    async function loadObservation() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/observations.json");
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);

        const data: RawObservation[] = await res.json();
        const index = data.findIndex((item) => item.code === codeParam);
        if (index === -1)
          throw new Error(`No violation with code ${codeParam}`);

        const item = data[index];
        if (cancelled) return;
        setDetail({
          code: item.code,
          videoUrl: item.videoUrl,
          timestamp: item.timestamp,
          analysis: parseSafetyAnalysis(item.description),
          prevCode: index > 0 ? data[index - 1].code : null,
          nextCode: index < data.length - 1 ? data[index + 1].code : null,
        });
      } catch (err) {
        console.error("Failed to load observations.json", err);
        if (!cancelled) setError("Could not load this violation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadObservation();
    return () => {
      cancelled = true;
    };
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
            {detail.code}
          </span>
        </div>
        <Badge
          variant="outline"
          className={`shrink-0 gap-1 ${SEVERITY_BADGE_CLASS[detail.analysis.maxSeverity]}`}
        >
          <SeverityIcon
            severity={detail.analysis.maxSeverity}
            className="h-3 w-3"
          />
          {detail.analysis.maxSeverity}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Safety Analysis Results</span>
            <span className="text-muted-foreground text-xs font-normal">
              {formatTimestamp(detail.timestamp)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-hidden rounded-lg border bg-black">
            <video
              key={detail.videoUrl}
              src={detail.videoUrl}
              poster={posterUrlFor(detail.videoUrl)}
              controls
              playsInline
              preload="metadata"
              className="h-auto w-full"
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <SafetyAnalysisCard analysis={detail.analysis} />
        </CardContent>
      </Card>
    </div>
  );
}
