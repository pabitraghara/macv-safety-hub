"use client";

import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CirclePause,
  Radio,
  RefreshCw,
  WifiOff,
  CircleSlash,
  Zap,
  ZapOff,
} from "lucide-react";
import type { Camera } from "@/api/cameras/types";

/**
 * The edge reconciler polls and heartbeats every ~60s; after 5 missed ticks
 * we stop trusting the last reported status (a stale "running" must never
 * render green — the edge process may have died without saying "down").
 */
const STALE_AFTER_MS = 5 * 60_000;

export type PipelineHealth =
  | "running"
  | "reconnecting"
  | "down"
  | "stale"
  | "none";

export function pipelineHealth(
  camera: Pick<Camera, "pipeline_status" | "pipeline_heartbeat_at">,
  now: number = Date.now(),
): PipelineHealth {
  if (!camera.pipeline_status || !camera.pipeline_heartbeat_at) return "none";
  const beat = new Date(camera.pipeline_heartbeat_at).getTime();
  if (Number.isNaN(beat) || now - beat > STALE_AFTER_MS) return "stale";
  return camera.pipeline_status;
}

const HEALTH_STYLES: Record<Exclude<PipelineHealth, "none">, string> = {
  running: "bg-green-100 text-green-800 border-green-200",
  reconnecting: "bg-yellow-100 text-yellow-800 border-yellow-200",
  down: "bg-red-100 text-red-800 border-red-200",
  stale: "bg-gray-100 text-gray-600 border-gray-200",
};

const HEALTH_LABELS: Record<Exclude<PipelineHealth, "none">, string> = {
  running: "Running",
  reconnecting: "Reconnecting",
  down: "Down",
  stale: "Stale",
};

function HealthIcon({ health }: { health: Exclude<PipelineHealth, "none"> }) {
  if (health === "running") return <Radio className="h-3 w-3" />;
  if (health === "reconnecting") return <RefreshCw className="h-3 w-3" />;
  if (health === "down") return <WifiOff className="h-3 w-3" />;
  return <CircleSlash className="h-3 w-3" />;
}

/**
 * Edge-pipeline liveness badge for a camera row. Renders a dash for cameras
 * that have never been driven by a pipeline (both fields null).
 */
export function PipelineHealthBadge({ camera }: { camera: Camera }) {
  // OPERATOR INTENT beats observed liveness in the display: a non-Active
  // camera is deliberately paused (the backend stops serving it to the
  // edge), which is a different statement than a stale/failed heartbeat.
  if (camera.status !== "Active" && (camera.detection_types ?? []).length > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className="inline-flex items-center gap-1 border-amber-200 bg-amber-50 text-xs text-amber-800"
            variant="outline"
          >
            <CirclePause className="h-3 w-3" />
            Paused
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Processing stopped — camera status is “{camera.status}”. Set it to
          Active to resume (the edge picks it up within a minute).
        </TooltipContent>
      </Tooltip>
    );
  }

  const health = pipelineHealth(camera);
  if (health === "none")
    return <span className="text-muted-foreground">—</span>;

  const beatAgo = formatDistanceToNow(new Date(camera.pipeline_heartbeat_at!), {
    addSuffix: true,
  });
  const tooltip =
    health === "stale"
      ? `Last heartbeat ${beatAgo} (reported "${camera.pipeline_status}") — the edge pipeline has stopped reporting`
      : `Edge pipeline heartbeat ${beatAgo}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          className={`${HEALTH_STYLES[health]} inline-flex items-center gap-1 text-xs`}
          variant="outline"
        >
          <HealthIcon health={health} />
          {HEALTH_LABELS[health]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Gate-relay health badge (alpr cameras). Tri-state from the edge heartbeat:
 * false = the barrier relay is failing (loud red — a whitelisted vehicle may
 * be stuck at the gate), true = healthy (subtle), null/undefined = no relay
 * information (renders nothing — most cameras have no relay).
 */
export function RelayHealthBadge({ camera }: { camera: Camera }) {
  if (camera.pipeline_relay_ok == null) return null;
  if (camera.pipeline_relay_ok) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className="inline-flex items-center gap-1 border-green-200 bg-green-100 text-xs text-green-800"
            variant="outline"
          >
            <Zap className="h-3 w-3" />
            Relay
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Gate relay healthy (last fire succeeded)
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          className="inline-flex items-center gap-1 border-red-200 bg-red-100 text-xs text-red-800"
          variant="outline"
        >
          <ZapOff className="h-3 w-3" />
          Relay fault
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        The gate relay failed on the last attempt — the barrier may not open for
        whitelisted vehicles. Check the relay IO device and its network path
        from the edge server.
      </TooltipContent>
    </Tooltip>
  );
}

/** Compact text form for the mobile card, e.g. "Running (2 minutes ago)". */
export function pipelineHealthText(camera: Camera): string | null {
  if (camera.status !== "Active" && (camera.detection_types ?? []).length > 0) {
    return "Paused (camera not Active)";
  }
  const health = pipelineHealth(camera);
  if (health === "none") return null;
  const beatAgo = formatDistanceToNow(new Date(camera.pipeline_heartbeat_at!), {
    addSuffix: true,
  });
  return `${HEALTH_LABELS[health]} (${beatAgo})`;
}
