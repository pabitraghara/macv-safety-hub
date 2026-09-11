"use client";

import { useEffect, useState } from "react";
import {
  Camera as CameraIcon,
  ImageOff,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SnapshotUiStatus } from "@/api/cameras";

/**
 * Snapshot chrome for the calibration editor: latest frame + "request a
 * fresh one" flow. The pending wait is real — the edge box polls the backend
 * every ~15s, connects to the camera over RTSP, uploads to GCS — so the
 * panel shows elapsed time and explains failures/expiry instead of spinning
 * silently. Rendering of the image itself (with the point overlay) is the
 * caller's job via `children`.
 */

interface SnapshotPanelProps {
  status: SnapshotUiStatus;
  errorMessage: string | null;
  /** Hook-level fetch error (network/permission), distinct from a failed capture. */
  fetchError: string | null;
  hasImage: boolean;
  canRequest: boolean;
  onRequest: () => void;
  /** The snapshot image + calibration overlay, when there is an image. */
  children?: React.ReactNode;
}

function PendingElapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tabular-nums">
      {seconds >= 60
        ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
        : `${seconds}s`}
    </span>
  );
}

const FAILURE_EXPLANATIONS: Partial<Record<SnapshotUiStatus, string>> = {
  failed:
    "The edge server could not capture a frame — the camera may be offline or its RTSP stream unreachable.",
  expired:
    "No edge server picked this request up within 10 minutes — the pipeline for this site may be down.",
  timeout:
    "Still no snapshot after 3 minutes. The edge server polls every ~15 seconds when healthy; check that its pipeline service is running.",
};

export function SnapshotPanel({
  status,
  errorMessage,
  fetchError,
  hasImage,
  canRequest,
  onRequest,
  children,
}: SnapshotPanelProps) {
  const pending = status === "pending";
  const failure = FAILURE_EXPLANATIONS[status];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-muted-foreground text-sm">
          {pending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for the edge server to capture a frame… <PendingElapsed />
            </span>
          ) : hasImage ? (
            "Click the image to place the 4 calibration points, drag to adjust."
          ) : (
            "Request a snapshot to place calibration points visually."
          )}
        </div>
        {canRequest && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRequest}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            {hasImage ? "Request new snapshot" : "Request snapshot"}
          </Button>
        )}
      </div>

      {failure && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm">
          {failure}
          {status === "failed" && errorMessage ? (
            <span className="text-muted-foreground block text-xs">
              Edge report: {errorMessage}
            </span>
          ) : null}
        </div>
      )}
      {fetchError && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm">
          {fetchError}
        </div>
      )}

      {hasImage ? (
        children
      ) : (
        <div className="text-muted-foreground flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm">
          {pending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : status === "none" ? (
            <CameraIcon className="h-6 w-6" />
          ) : (
            <ImageOff className="h-6 w-6" />
          )}
          {pending ? "Capturing…" : "No snapshot yet"}
        </div>
      )}
    </div>
  );
}
