"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { Observation, Violation } from "@/api/observations/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ViolationTagsDisplay } from "./ViolationTags";

interface ObservationMainContentProps {
  observation: Observation;
  code: string;
  violations?: Violation[];
}

export function ObservationMainContent({
  observation,
  code,
  violations,
}: ObservationMainContentProps) {
  const [isImageOpen, setIsImageOpen] = useState(false);

  return (
    <div className="min-w-0 flex-1">
      <div className="mt-6 mb-4">
        <p className="font-mono text-sm text-gray-500">{code}</p>
        {observation.description && (
          <p className="mt-3 text-lg font-semibold text-gray-900">
            {observation.description}
          </p>
        )}
        {observation.timestamp && (
          <div className="mt-2 flex items-center gap-1.5 text-gray-800">
            <span className="text-sm font-medium">
              {format(new Date(observation.timestamp), "MMM dd, yyyy · HH:mm")}
            </span>
          </div>
        )}
        {violations && violations.length > 0 && (
          <div className="mt-3">
            <ViolationTagsDisplay
              violations={violations}
              max={violations.length}
            />
          </div>
        )}
      </div>

      {(observation.thumbnail_url || observation.video_url) && (
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-medium">Media</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {observation.thumbnail_url && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Thumbnail</p>
                <button
                  type="button"
                  onClick={() => setIsImageOpen(true)}
                  className="block w-full cursor-zoom-in overflow-hidden rounded-lg border border-gray-200 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div className="space-y-2">
                    <div className="aspect-video overflow-hidden rounded-lg border border-gray-200 bg-black">
                      <video
                        src={`${observation.thumbnail_url}#t=0.1`}
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </button>
              </div>
            )}
            {observation.video_url && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Video</p>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <video
                    src={observation.video_url}
                    controls
                    className="h-auto w-full"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {observation.thumbnail_url && (
        <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
          <DialogContent className="max-w-5xl border-0 bg-transparent p-0 shadow-none">
            <DialogTitle className="sr-only">
              {`Observation ${code} thumbnail`}
            </DialogTitle>
            <img
              src={observation.thumbnail_url}
              alt={`Observation ${code} thumbnail`}
              className="h-auto max-h-[85vh] w-full rounded-lg object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
