"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { severityColor } from "./helpers";
import type { Violation } from "@/lib/violations";

function formatCaptured(capturedAt: Date | null): string {
  if (!capturedAt) return "Unknown date";
  return capturedAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ViolationCard({ violation }: { violation: Violation }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  function handleMouseEnter() {
    // The clip is only fetched on hover; the poster carries the card until then.
    videoRef.current?.play().catch(() => {});
  }

  function handleMouseLeave() {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }

  const topIssue = violation.analysis.issues[0];

  return (
    <Link
      href={`/observations/${violation.code}`}
      className="group relative flex h-48 w-72 shrink-0 flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 p-4 transition-transform hover:scale-[1.02]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={violation.videoUrl}
        poster={violation.posterUrl}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        loop
        preload="none"
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="absolute top-3 right-3 z-10">
        <Badge
          className={`text-[10px] ${severityColor(violation.analysis.maxSeverity)}`}
        >
          {violation.analysis.maxSeverity}
        </Badge>
      </div>

      <div className="absolute top-4 left-4 z-10 rounded-lg bg-white/10 p-2">
        <Eye className="h-5 w-5 text-white" />
      </div>

      <div className="absolute right-3 bottom-3 z-10 rounded-full bg-white/20 p-1 opacity-0 transition-opacity group-hover:opacity-100">
        <ChevronRight className="h-4 w-4 text-white" />
      </div>

      <div className="relative z-10">
        <p className="line-clamp-2 text-sm leading-snug font-semibold text-white">
          {topIssue?.name ?? violation.code}
        </p>
        <p className="mt-1 text-xs text-white/60">
          {violation.analysis.issues.length} issues ·{" "}
          {formatCaptured(violation.capturedAt)}
        </p>
      </div>
    </Link>
  );
}

/** Newest clips, most recent footage first. */
export function HighlightedIncidents({
  loading,
  violations,
  limit = 8,
}: {
  loading: boolean;
  violations: Violation[];
  limit?: number;
}) {
  const recent = violations.slice(0, limit);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-muted-foreground text-sm font-semibold">
          Recent Clips
        </h2>
        <Link
          href="/observations"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-48 w-72 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No clips uploaded yet
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {recent.map((violation) => (
            <ViolationCard key={violation.id} violation={violation} />
          ))}
        </div>
      )}
    </div>
  );
}
