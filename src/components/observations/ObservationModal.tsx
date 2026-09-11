"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type {
  Observation,
  ObservationStatus,
  Violation,
} from "@/api/observations/types";
import { ObservationMainContent } from "./ObservationMainContent";
import { ObservationPropertiesSidebar } from "./ObservationPropertiesSidebar";
import { LoadingStates } from "./LoadingStates";

interface ObservationModalProps {
  code: string | null;
  onClose: () => void;
  /** Ordered list of observation codes for prev/next navigation */
  observationCodes?: string[];
  /** Called when user clicks prev/next to switch to a different observation */
  onNavigate?: (code: string) => void;
}

// Helper parser for local TXT descriptions
function parseRawDescription(rawText: string) {
  const violations: Violation[] = [];
  let summaryText = "";

  if (!rawText) return { summaryText: "No details available.", violations };

  const jsonBlockRegex = /\{'severity':.*?'description':.*?'\}/g;
  const matches = rawText.match(jsonBlockRegex);

  if (matches) {
    matches.forEach((match, idx) => {
      try {
        const validJsonStr = match.replace(/'/g, '"');
        const parsed = JSON.parse(validJsonStr);
        violations.push({
          id: `v-${idx}`,
          name: parsed.name,
          category: parsed.severity,
        });
      } catch (e) {
        const nameMatch = match.match(/'name':\s*'([^']+)'/);
        if (nameMatch) {
          violations.push({
            id: `v-${idx}`,
            name: nameMatch[1],
            category: "Observation",
          });
        }
      }
    });
  }

  if (
    rawText.includes(
      "DESCRIPTION\r\n==================================================",
    )
  ) {
    summaryText = rawText
      .split(
        "DESCRIPTION\r\n==================================================",
      )[1]
      .trim();
  } else {
    summaryText = rawText.slice(0, 150) + "...";
  }

  return { summaryText, violations };
}

export function ObservationModal({
  code,
  onClose,
  observationCodes = [],
  onNavigate,
}: ObservationModalProps) {
  const router = useRouter();
  const [observation, setObservation] = useState<Observation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const [violations, setViolations] = useState<Violation[]>([]);
  const [tempStatus, setTempStatus] = useState<ObservationStatus>("open");
  const [tempSeverity, setTempSeverity] = useState<string>("Low");

  // Load item from public/observations.json by matching 'code'
  useEffect(() => {
    if (!code) {
      setObservation(null);
      return;
    }

    async function fetchObservationDetail() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/observations.json");
        const data = await res.json();
        const matchedItem = data.find((item: any) => item.code === code);

        if (!matchedItem) {
          throw new Error(`Observation with code ${code} not found.`);
        }

        const { summaryText, violations: parsedViolations } =
          parseRawDescription(matchedItem.description);

        const formattedObs: Observation = {
          id: matchedItem.id,
          code: matchedItem.code,
          description: summaryText,
          severity: matchedItem.severity,
          review_status: matchedItem.status as ObservationStatus,
          timestamp: matchedItem.timestamp,
          thumbnail_url: matchedItem.videoUrl,
          video_url: matchedItem.videoUrl,
          violations: parsedViolations,
        };

        setObservation(formattedObs);
        setViolations(parsedViolations);
        setTempStatus(formattedObs.review_status);
        setTempSeverity(formattedObs.severity);
      } catch (err: any) {
        console.error(err);
        setError(err);
        toast.error("Failed to load observation details.");
      } finally {
        setLoading(false);
      }
    }

    fetchObservationDetail();
  }, [code]);

  const currentIndex = code ? observationCodes.indexOf(code) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext =
    currentIndex >= 0 && currentIndex < observationCodes.length - 1;

  const goToPrev = () => {
    if (hasPrev && onNavigate) onNavigate(observationCodes[currentIndex - 1]);
  };

  const goToNext = () => {
    if (hasNext && onNavigate) onNavigate(observationCodes[currentIndex + 1]);
  };

  useEffect(() => {
    if (!code) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, currentIndex, hasPrev, hasNext]);

  return (
    <Dialog
      open={!!code}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex h-[80vh] w-full max-w-6xl flex-col overflow-hidden p-0 sm:max-w-6xl"
      >
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-gray-200 px-6 pt-5 pb-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            {observationCodes.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!hasPrev}
                  onClick={goToPrev}
                  aria-label="Previous observation"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {currentIndex + 1}/{observationCodes.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!hasNext}
                  onClick={goToNext}
                  aria-label="Next observation"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <DialogTitle className="text-muted-foreground font-mono text-sm font-normal">
              {code}
            </DialogTitle>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => {
                onClose();
                router.push(`/observations/${code}`);
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open full page
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading || error || !observation ? (
            <div className="px-6 py-8">
              <LoadingStates
                isParamsLoaded={true}
                loading={loading}
                error={error}
                code={code ?? ""}
              />
            </div>
          ) : (
            <div className="flex flex-col xl:flex-row">
              <div className="min-w-0 flex-1 px-6 py-6 sm:px-8">
                <ObservationMainContent
                  observation={observation}
                  code={code ?? ""}
                  violations={violations}
                />
              </div>

              <div className="hidden w-px shrink-0 bg-gray-200 xl:block dark:bg-gray-800" />

              <div className="shrink-0 px-4 py-6 sm:px-6 xl:w-72">
                <ObservationPropertiesSidebar
                  observation={observation}
                  tempStatus={tempStatus}
                  onTriageChange={setTempStatus}
                  tempSeverity={tempSeverity}
                  onSeverityChange={setTempSeverity}
                  violations={violations}
                  onViolationsUpdate={setViolations}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
