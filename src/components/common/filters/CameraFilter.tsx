"use client";

import { useMemo } from "react";
import SelectFilter from "@/components/common/filters/SelectFilter";
import { useCameras } from "@/api/cameras";

/**
 * Multi-select camera filter backed by GET /api/v1/cameras.
 *
 * SelectFilter works in labels, so we map camera name → UUID on the way out.
 * Names are not guaranteed unique, so a duplicated name selects every camera
 * carrying it — which is what an operator picking that label means anyway.
 */

interface CameraFilterProps {
  onCameraChange: (selectedCameraIds: string[]) => void;
}

export default function CameraFilter({ onCameraChange }: CameraFilterProps) {
  const { data: cameras } = useCameras();

  const options = useMemo(
    () => Array.from(new Set(cameras.map((camera) => camera.name))).sort(),
    [cameras],
  );

  const handleChange = (cameraNames: string[]) => {
    const selected = new Set(cameraNames);
    onCameraChange(
      cameras
        .filter((camera) => selected.has(camera.name))
        .map((camera) => camera.id),
    );
  };

  return (
    <SelectFilter
      placeholder="Camera"
      options={options}
      onValueChange={handleChange}
    />
  );
}
