"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafetyAnalysisCard } from "@/components/observations/SafetyAnalysisCard";
import { VideoThumbnail } from "@/components/observations/VideoThumbnail";
import {
  SEVERITY_BADGE_CLASS,
  SeverityIcon,
} from "@/components/observations/severity";
import { loadViolations, type Violation } from "@/lib/violations";

function formatCaptured(capturedAt: Date | null) {
  if (!capturedAt) return "—";
  try {
    return format(capturedAt, "MMM dd, yyyy · HH:mm");
  } catch {
    return "Invalid date";
  }
}

function ViolationRow({
  violation,
  isSelected,
  onSelect,
}: {
  violation: Violation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { maxSeverity, issues } = violation.analysis;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isSelected}
      className={`flex w-full items-center gap-3 border-b p-3 text-left transition-colors last:border-b-0 ${
        isSelected ? "bg-muted" : "hover:bg-muted/50"
      }`}
    >
      <VideoThumbnail
        src={violation.posterUrl}
        alt={`First frame of clip ${violation.code}`}
        className="h-12 w-20 shrink-0 rounded"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs">{violation.code}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {issues.length} {issues.length === 1 ? "issue" : "issues"}
        </p>
      </div>
      <Badge
        variant="outline"
        className={`shrink-0 gap-1 ${SEVERITY_BADGE_CLASS[maxSeverity]}`}
      >
        <SeverityIcon severity={maxSeverity} className="h-3 w-3" />
        {maxSeverity}
      </Badge>
    </button>
  );
}

export default function ObservationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    loadViolations(controller.signal)
      .then((parsed) => {
        setViolations(parsed);
        setSelectedCode(parsed[0]?.code ?? null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load observations.json", err);
        setError("Could not load violations.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const selected = useMemo(
    () =>
      violations.find((violation) => violation.code === selectedCode) ?? null,
    [violations, selectedCode],
  );

  return (
    // The dashboard chrome above this page is a 4rem header inside 1rem of
    // padding, so 6rem is what the viewport has left for the page itself.
    <div className="mx-auto flex w-full max-w-7xl flex-col px-4 sm:px-6 lg:h-[calc(100svh-6rem)] lg:px-8">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="text-2xl font-semibold">Violations</h1>
          <span className="text-muted-foreground text-sm">
            {violations.length} clips
          </span>
        </div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
          className="h-8"
          aria-label="Reload violations"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/50">
          <CardContent className="text-destructive text-center text-sm">
            {error}
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="text-muted-foreground py-16 text-center text-sm">
            Loading violations…
          </CardContent>
        </Card>
      ) : violations.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-16 text-center text-sm">
            No violations have been uploaded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[340px_1fr]">
          <Card className="h-fit min-w-0 gap-0 py-0 lg:h-full lg:min-h-0">
            <CardContent className="max-h-[70svh] overflow-y-auto p-0 lg:h-full lg:max-h-none">
              {violations.map((violation) => (
                <ViolationRow
                  key={violation.id}
                  violation={violation}
                  isSelected={violation.code === selectedCode}
                  onSelect={() => setSelectedCode(violation.code)}
                />
              ))}
            </CardContent>
          </Card>

          {selected && (
            <Card className="min-w-0 lg:h-full lg:min-h-0">
              <CardHeader className="shrink-0">
                <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-normal break-all">
                    {selected.code}
                  </span>
                  <span className="text-muted-foreground text-xs font-normal">
                    {formatCaptured(selected.capturedAt)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                <div className="overflow-hidden rounded-lg border bg-black">
                  <video
                    key={selected.videoUrl}
                    src={selected.videoUrl}
                    poster={selected.posterUrl}
                    controls
                    preload="metadata"
                    className="h-auto w-full"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>

                <SafetyAnalysisCard analysis={selected.analysis} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
