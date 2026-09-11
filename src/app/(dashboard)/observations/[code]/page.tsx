"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Clock,
  ShieldAlert,
  FileText,
  ChevronDown,
} from "lucide-react";

// --- Types ---
export type SeverityLevel = "Critical" | "High" | "Medium" | "Low";
export type ObservationStatus = "open" | "in_review" | "resolved";

export interface Violation {
  id: string;
  name: string;
  severity: SeverityLevel;
  description: string;
}

export interface RawObservationItem {
  id: string;
  code: string;
  videoUrl: string;
  description: string;
  severity: SeverityLevel;
  status: ObservationStatus;
  timestamp: string;
}

export interface FormattedObservation {
  id: string;
  code: string;
  videoUrl: string;
  severity: SeverityLevel;
  status: ObservationStatus;
  timestamp: string;
  summary: string;
  violations: Violation[];
}

// --- Helper: Parse raw description blocks into Violations ---
function parseObservationData(
  rawItem: RawObservationItem,
): FormattedObservation {
  const violations: Violation[] = [];
  let summary = "";

  const rawText = rawItem.description || "";

  // Extract individual violation blocks: {'severity': '...', 'name': '...', 'description': '...'}
  const jsonBlockRegex =
    /\{'severity':\s*'([^']*)',\s*'name':\s*'([^']*)',\s*'description':\s*'([^']*)'\}/g;
  let match;
  let idx = 0;

  while ((match = jsonBlockRegex.exec(rawText)) !== null) {
    violations.push({
      id: `v-${idx++}`,
      severity: match[1] as SeverityLevel,
      name: match[2],
      description: match[3],
    });
  }

  // Extract summary block
  if (
    rawText.includes(
      "DESCRIPTION\r\n==================================================",
    )
  ) {
    summary = rawText
      .split(
        "DESCRIPTION\r\n==================================================",
      )[1]
      .trim();
  } else if (
    rawText.includes(
      "DESCRIPTION\n==================================================",
    )
  ) {
    summary = rawText
      .split(
        "DESCRIPTION\n==================================================",
      )[1]
      .trim();
  } else {
    summary = rawText.slice(0, 200) + "...";
  }

  return {
    id: rawItem.id,
    code: rawItem.code,
    videoUrl: rawItem.videoUrl,
    severity: rawItem.severity,
    status: rawItem.status,
    timestamp: rawItem.timestamp,
    summary,
    violations,
  };
}

// --- Helper: Severity Styling ---
const getSeverityBadgeStyle = (severity: SeverityLevel) => {
  switch (severity) {
    case "Critical":
      return "bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-950/30 dark:text-red-400";
    case "High":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20 dark:bg-orange-950/30 dark:text-orange-400";
    case "Medium":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-950/30 dark:text-amber-400";
    case "Low":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-400/20 dark:text-blue-400";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
};

export default function ObservationDetailPage() {
  const params = useParams();
  const router = useRouter();

  const codeParam =
    typeof params?.code === "string"
      ? params.code
      : Array.isArray(params?.code)
        ? params.code[0]
        : "";

  const [observation, setObservation] = useState<FormattedObservation | null>(
    null,
  );
  const [prevCode, setPrevCode] = useState<string | null>(null);
  const [nextCode, setNextCode] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  // Empty string by default so all violations remain collapsed initially
  const [selectedViolationId, setSelectedViolationId] = useState<string>("");
  const [status, setStatus] = useState<ObservationStatus>("open");

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    async function fetchObservations() {
      setLoading(true);
      try {
        const res = await fetch("/observations.json");
        const data: RawObservationItem[] = await res.json();

        if (!data || data.length === 0) return;

        const matchIdx = codeParam
          ? data.findIndex((item) => item.code === codeParam)
          : 0;

        const targetIdx = matchIdx !== -1 ? matchIdx : 0;
        const formatted = parseObservationData(data[targetIdx]);

        setObservation(formatted);
        setStatus(formatted.status);

        // Keep selection empty by default
        setSelectedViolationId("");

        setPrevCode(targetIdx > 0 ? data[targetIdx - 1].code : null);
        setNextCode(
          targetIdx < data.length - 1 ? data[targetIdx + 1].code : null,
        );
      } catch (err) {
        console.error("Failed to load observations.json", err);
      } finally {
        setLoading(false);
      }
    }

    fetchObservations();
  }, [codeParam]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (loading || !observation) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        Loading observation details...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/80 px-6 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              disabled={!prevCode}
              onClick={() =>
                prevCode && router.push(`/observations/${prevCode}`)
              }
              className="rounded-md p-1.5 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800"
              title="Previous Observation"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={!nextCode}
              onClick={() =>
                nextCode && router.push(`/observations/${nextCode}`)
              }
              className="rounded-md p-1.5 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800"
              title="Next Observation"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <span className="font-mono text-xs font-semibold text-gray-500 dark:text-gray-400">
            {observation.code}
          </span>
        </div>

        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getSeverityBadgeStyle(
            observation.severity,
          )}`}
        >
          Overall: {observation.severity}
        </span>
      </header>

      {/* Main Container */}
      <main className="mx-auto flex max-w-7xl flex-col xl:flex-row">
        {/* Left Section: Video Player & Description */}
        <div className="min-w-0 flex-1 border-r border-gray-200 px-6 py-6 sm:px-8 dark:border-gray-800">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black shadow-lg">
            <video
              ref={videoRef}
              className="h-full w-full object-contain"
              src={observation.videoUrl}
              controls
              playsInline
              muted
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white">
              <button
                type="button"
                onClick={togglePlay}
                className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur hover:bg-white/30"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-white" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5 fill-white" />
                )}
              </button>
              <div className="flex items-center gap-2 font-mono text-xs opacity-80">
                <Clock className="h-3.5 w-3.5" />
                {new Date(observation.timestamp).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                Observation Summary
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {observation.summary}
            </p>
          </div>
        </div>

        {/* Right Section: Collapsible Violations List */}
        <aside className="w-full shrink-0 px-6 py-6 xl:w-96">
          <div className="space-y-6">
            {/* Status Control */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <label className="mb-2 block text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                Review Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ObservationStatus)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="open">Open</option>
                <option value="in_review">In Review</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Collapsible Violations Accordion */}
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Detected Violations ({observation.violations.length})
                </h3>
              </div>

              <div className="space-y-2">
                {observation.violations.length > 0 ? (
                  observation.violations.map((v) => {
                    const isExpanded = selectedViolationId === v.id;

                    return (
                      <div
                        key={v.id}
                        className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors dark:border-gray-800 dark:bg-gray-800/50"
                      >
                        {/* Clickable Header */}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedViolationId(isExpanded ? "" : v.id)
                          }
                          className="flex w-full items-center justify-between p-3.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <div className="flex items-center gap-2 pr-2">
                            <span
                              className={`shrink-0 rounded border px-2 py-0.5 text-xs font-semibold ${getSeverityBadgeStyle(
                                v.severity,
                              )}`}
                            >
                              {v.severity}
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {v.name}
                            </span>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {/* Collapsible Body (Hidden by default) */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 p-3.5 pt-3 dark:border-gray-800">
                            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                              {v.description}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500">No violations found.</p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
