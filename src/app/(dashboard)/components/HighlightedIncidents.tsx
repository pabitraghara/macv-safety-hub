"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { severityColor, formatLabel, timeAgo } from "./helpers";
import { observationsApi } from "@/api/observations/api";
import type { Observation } from "@/api/observations/types";
import type { PaginatedResponse } from "@/api/base/http";

function ObservationCard({ obs }: { obs: Observation }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  function handleMouseEnter() {
    videoRef.current?.play().catch(() => {});
  }

  function handleMouseLeave() {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  }

  return (
    <Link
      href={`/observations/${obs.code}`}
      className="group relative flex h-48 w-72 shrink-0 flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 p-4 transition-transform hover:scale-[1.02]"
      onMouseEnter={obs.video_url ? handleMouseEnter : undefined}
      onMouseLeave={obs.video_url ? handleMouseLeave : undefined}
    >
      {/* Thumbnail always visible as base layer */}
      {obs.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={obs.thumbnail_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : !obs.video_url ? (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.15),transparent_60%)]" />
        </div>
      ) : null}

      {/* Video plays on hover, covers thumbnail */}
      {obs.video_url && (
        <video
          ref={videoRef}
          src={obs.video_url}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          loop
          preload="none"
        />
      )}

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="absolute top-3 right-3 z-10">
        <Badge className={`text-[10px] ${severityColor(obs.severity)}`}>
          {formatLabel(obs.severity)}
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
          {obs.description || obs.code}
        </p>
        <p className="mt-1 text-xs text-white/60">
          {obs.code} · {timeAgo(obs.created_at)}
        </p>
      </div>
    </Link>
  );
}

export function HighlightedIncidents() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    observationsApi
      .getObservations({ page: 1, page_size: 5 })
      .then((res) => {
        const items = Array.isArray(res)
          ? res
          : (res as PaginatedResponse<Observation>).items;
        setObservations(items);
      })
      .catch(() => setObservations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-muted-foreground text-sm font-semibold">
          Recent Observations
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
      ) : observations.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No recent activity
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {observations.map((obs) => (
            <ObservationCard key={obs.id} obs={obs} />
          ))}
        </div>
      )}
    </div>
  );
}
