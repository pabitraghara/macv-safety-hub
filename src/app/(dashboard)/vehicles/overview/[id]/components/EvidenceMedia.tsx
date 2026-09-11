"use client";

import { useState } from "react";
import { ImageOff, RefreshCw, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SpeedViolation } from "@/api/speed-violations";

/**
 * Evidence media for one violation — three artifacts from the edge pipeline:
 * the clip (native <video>, GCS serves ranges so seeking works), the
 * ANNOTATED vehicle frame (`thumbnail_url` — the pipeline draws the
 * detection box onto it, so it's evidence in its own right, not just a
 * poster), and the plate crop. Media URLs are 1-hour signed GCS URLs — when
 * the browser fails to load one (expired link), an overlay offers a refresh,
 * which re-fetches the violation and re-signs every URL. Each media element
 * is keyed by its URL, so a refetch remounts it with a clean error state.
 *
 * Evidence stills are click-to-zoom: the thumbnail is deliberately small so
 * the page stays scannable, and a full-size lightbox carries the detail an
 * operator actually needs to read a plate or check the detection box.
 */

interface RefreshHandle {
  refreshing: boolean;
  onRefresh: () => void;
}

interface EvidenceMediaProps extends RefreshHandle {
  violation: SpeedViolation;
}

function ExpiredOverlay({ refreshing, onRefresh }: RefreshHandle) {
  return (
    <div className="bg-background/80 absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg backdrop-blur-sm">
      <ImageOff className="text-muted-foreground h-6 w-6" />
      <p className="text-muted-foreground text-sm">
        Evidence link expired — refresh to renew it
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={onRefresh}
        disabled={refreshing}
      >
        <RefreshCw
          className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
        />
        Refresh
      </Button>
    </div>
  );
}

/** Keyed by URL from the parent — remount = clean error state. */
function EvidenceVideo({
  src,
  poster,
  refreshing,
  onRefresh,
}: { src: string; poster: string | null } & RefreshHandle) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative">
      <video
        controls
        className="aspect-video w-full rounded-lg bg-black"
        src={src}
        poster={poster ?? undefined}
        onError={() => setFailed(true)}
      />
      {failed && (
        <ExpiredOverlay refreshing={refreshing} onRefresh={onRefresh} />
      )}
    </div>
  );
}

/**
 * Keyed by URL from the parent — remount = clean error state. Clicking the
 * image opens it full size via `onZoom`; a failed (expired) image is not
 * zoomable, since there is nothing to show.
 */
function EvidenceImage({
  src,
  alt,
  maxHeightClass = "max-h-40",
  refreshing,
  onRefresh,
  onZoom,
}: {
  src: string;
  alt: string;
  maxHeightClass?: string;
  onZoom: (image: { src: string; alt: string }) => void;
} & RefreshHandle) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="bg-muted relative flex items-center justify-center rounded-lg p-2">
      <button
        type="button"
        className="group focus-visible:ring-ring relative w-full cursor-zoom-in rounded focus-visible:ring-2 focus-visible:outline-none"
        onClick={() => !failed && onZoom({ src, alt })}
        disabled={failed}
        aria-label={`View ${alt} full size`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={`${maxHeightClass} w-full rounded object-contain`}
          onError={() => setFailed(true)}
        />
        {!failed && (
          <span className="bg-background/80 absolute right-1.5 bottom-1.5 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <ZoomIn className="h-4 w-4" />
          </span>
        )}
      </button>
      {failed && (
        <ExpiredOverlay refreshing={refreshing} onRefresh={onRefresh} />
      )}
    </div>
  );
}

/** Full-size view of one evidence still. */
function ImageLightbox({
  image,
  onClose,
}: {
  image: { src: string; alt: string } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={image !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold tracking-wide uppercase">
            {image?.alt}
          </DialogTitle>
        </DialogHeader>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.src}
            alt={image.alt}
            className="max-h-[75vh] w-full rounded object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EvidenceMedia({
  violation,
  refreshing,
  onRefresh,
}: EvidenceMediaProps) {
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(
    null,
  );

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
          Violation Clip
        </h2>
        {violation.video_url ? (
          <EvidenceVideo
            key={violation.video_url}
            src={violation.video_url}
            poster={violation.thumbnail_url}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        ) : (
          <div className="text-muted-foreground flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm">
            <ImageOff className="h-6 w-6" />
            No clip recorded
          </div>
        )}
      </Card>

      {(violation.thumbnail_url || violation.plate_image_url) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {violation.thumbnail_url && (
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
                Vehicle (annotated)
              </h2>
              <EvidenceImage
                key={violation.thumbnail_url}
                src={violation.thumbnail_url}
                alt="Annotated vehicle frame"
                maxHeightClass="max-h-56"
                refreshing={refreshing}
                onRefresh={onRefresh}
                onZoom={setZoomed}
              />
            </Card>
          )}
          {violation.plate_image_url && (
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
                License Plate
              </h2>
              <EvidenceImage
                key={violation.plate_image_url}
                src={violation.plate_image_url}
                alt="License plate capture"
                maxHeightClass="max-h-56"
                refreshing={refreshing}
                onRefresh={onRefresh}
                onZoom={setZoomed}
              />
            </Card>
          )}
        </div>
      )}

      <ImageLightbox image={zoomed} onClose={() => setZoomed(null)} />
    </div>
  );
}
