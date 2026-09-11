"use client";

import { useEffect, useState } from "react";
import { Video } from "lucide-react";
import { camerasApi, type Camera } from "@/api/cameras";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CameraMultiSelect from "../_components/CameraMultiSelect";

const STORAGE_KEY = "alpr:liveStreams:selectedCameraIds";

// Gate sites usually run 1-2 ALPR cameras, so keep the tiles large: one camera
// fills the row, two split it in half, and only denser setups drop to 3 columns.
function gridLayoutClass(count: number): string {
  // A lone camera would stretch to an unwatchable height at full width, so cap
  // it to roughly the same tile size two cameras get.
  if (count <= 1) return "grid-cols-1 max-w-[900px]";
  if (count <= 4) return "grid-cols-1 lg:grid-cols-2";
  return "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3";
}

function readStoredSelection(cameraIds: string[]): string[] {
  if (typeof window === "undefined") return cameraIds;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cameraIds;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return cameraIds;
    const intersected = parsed.filter(
      (id): id is string => typeof id === "string" && cameraIds.includes(id),
    );
    return intersected.length > 0 ? intersected : cameraIds;
  } catch {
    return cameraIds;
  }
}

export default function Page() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    camerasApi
      .getCameras()
      .then((data) => {
        if (cancelled) return;
        // ONLY cameras with the ALPR module assigned — no fallback to the
        // full camera list (speed/safety cameras have no gate stream here).
        const alprOnly = data.filter((c) =>
          c.detection_types?.includes("alpr"),
        );
        setCameras(alprOnly);
        setSelectedIds((prev) =>
          prev !== null ? prev : readStoredSelection(alprOnly.map((c) => c.id)),
        );
      })
      .catch(() => {
        if (!cancelled) setCameras([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedIds === null) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
  }, [selectedIds]);

  const cameraOptions = cameras.map((c) => ({ id: c.id, name: c.name }));
  const effectiveSelectedIds = selectedIds ?? [];
  const selectedCameras = cameras.filter((c) =>
    effectiveSelectedIds.includes(c.id),
  );

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8">
      <PageHeader title="Live Streams" />

      {cameras.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <CameraMultiSelect
            options={cameraOptions}
            selectedIds={effectiveSelectedIds}
            onChange={setSelectedIds}
          />
        </div>
      )}

      {cameras.length === 0 && (
        <EmptyState
          title="No cameras configured"
          message="No ALPR cameras are configured for this organisation."
        />
      )}

      {cameras.length > 0 && selectedCameras.length === 0 && (
        <EmptyState
          title="No cameras selected"
          message="Select cameras to view live streams."
        />
      )}

      {selectedCameras.length > 0 && (
        <div
          className={`grid gap-4 ${gridLayoutClass(selectedCameras.length)}`}
        >
          {selectedCameras.map((camera) => (
            <Card key={camera.id} className="gap-2 overflow-hidden py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-lg">{camera.name}</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <div className="bg-muted relative aspect-video overflow-hidden rounded-lg">
                  {!videoErrors[camera.id] ? (
                    <iframe
                      src={
                        camera.http_url && camera.http_url.trim()
                          ? camera.http_url
                          : `${process.env.NEXT_PUBLIC_BACKEND_STREAMS_URL}/${camera.id}/`
                      }
                      className="h-full w-full"
                      allowFullScreen
                      onError={() =>
                        setVideoErrors((prev) => ({
                          ...prev,
                          [camera.id]: true,
                        }))
                      }
                    ></iframe>
                  ) : (
                    <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                      <div className="p-4 text-center">
                        <Video className="mx-auto mb-2 h-12 w-12 opacity-50" />
                        <p className="text-sm">Video unavailable</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Live detection continues to work
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Live view is served from the site network and is only viewable
                  on-site.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
