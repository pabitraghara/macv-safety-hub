"use client";

import { useCallback, useRef, useState } from "react";
import type { CalibrationPoint } from "@/api/cameras";

/**
 * Click-to-place / drag-to-adjust point editor drawn as an SVG overlay on a
 * camera snapshot. Three shapes:
 *
 * - "speed-quad": exactly 4 slots — P1→P2 entry line (green), P3→P4 exit
 *   line (red), zone polygon. Point order is load-bearing for the edge
 *   pipeline's speed calibration.
 * - "polygon" (ALPR ROI): open-ended — clicking APPENDS a vertex via
 *   `onAppend`; rendered as a closed polygon once 3+ points exist.
 * - "line" (ALPR crossing line): exactly 2 slots, single amber line.
 *
 * All coordinates are in NATIVE image pixels: the SVG's viewBox is the
 * image's natural size, so markers land correctly however the image is
 * scaled, and pointer positions are mapped display→native via
 * getBoundingClientRect (recomputed per event, so window resizes are safe).
 *
 * Fixed-slot shapes (speed-quad, line) pass `points` as a fixed-length array
 * with null = unplaced (clicks fill the first null); polygon passes only the
 * placed points (never null).
 */

export type PointsEditorShape = "speed-quad" | "polygon" | "line";

const ENTRY_COLOR = "#22c55e"; // green-500
const EXIT_COLOR = "#ef4444"; // red-500
const POLYGON_COLOR = "#3b82f6"; // blue-500
const LINE_COLOR = "#f59e0b"; // amber-500
const QUAD_LABELS = ["P1", "P2", "P3", "P4"] as const;

interface PointsEditorProps {
  imageUrl: string;
  points: (CalibrationPoint | null)[];
  shape: PointsEditorShape;
  onChange: (index: number, point: CalibrationPoint) => void;
  /** Polygon mode only: a background click appends a new vertex. */
  onAppend?: (point: CalibrationPoint) => void;
  disabled?: boolean;
}

export function PointsEditor({
  imageUrl,
  points,
  shape,
  onChange,
  onAppend,
  disabled = false,
}: PointsEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const toNative = useCallback(
    (clientX: number, clientY: number): CalibrationPoint | null => {
      const svg = svgRef.current;
      if (!svg || !natural) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const x = ((clientX - rect.left) / rect.width) * natural.w;
      const y = ((clientY - rect.top) / rect.height) * natural.h;
      // Clamp inside the frame (backend requires x,y >= 0). Round to whole
      // pixels — sub-pixel calibration precision is meaningless.
      return {
        x: Math.round(Math.min(Math.max(x, 0), natural.w)),
        y: Math.round(Math.min(Math.max(y, 0), natural.h)),
      };
    },
    [natural],
  );

  const canPlaceMore =
    shape === "polygon" ? true : points.some((p) => p == null);

  const handleBackgroundPointerDown = (e: React.PointerEvent) => {
    if (disabled || dragIndex !== null) return;
    const point = toNative(e.clientX, e.clientY);
    if (!point) return;
    if (shape === "polygon") {
      onAppend?.(point);
      return;
    }
    const nextIndex = points.findIndex((p) => p == null);
    if (nextIndex === -1) return; // all placed — adjust by dragging handles
    onChange(nextIndex, point);
  };

  const handleHandlePointerDown =
    (index: number) => (e: React.PointerEvent) => {
      if (disabled) return;
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      setDragIndex(index);
    };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (disabled || dragIndex === null) return;
    const point = toNative(e.clientX, e.clientY);
    if (point) onChange(dragIndex, point);
  };

  const endDrag = () => setDragIndex(null);

  // Marker sizing in viewBox (native-pixel) units so handles keep a sensible
  // on-screen size for any camera resolution (640px SD → 2688px 4MP).
  const r = natural ? Math.max(6, natural.w / 160) : 8;
  const strokeW = natural ? Math.max(2, natural.w / 640) : 2;
  const fontSize = r * 1.8;

  const placed = points.filter((p): p is CalibrationPoint => p != null);

  const handleColor = (i: number): string => {
    if (shape === "speed-quad") return i < 2 ? ENTRY_COLOR : EXIT_COLOR;
    if (shape === "line") return LINE_COLOR;
    return POLYGON_COLOR;
  };

  const label = (i: number): string => {
    if (shape === "speed-quad") return QUAD_LABELS[i] ?? `P${i + 1}`;
    if (shape === "line") return i === 0 ? "L1" : "L2";
    return String(i + 1);
  };

  const [p1, p2, p3, p4] = points;

  return (
    <div className="relative w-full select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Camera snapshot"
        className="block w-full rounded-md"
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;
          setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        }}
      />
      {natural && (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${natural.w} ${natural.h}`}
          preserveAspectRatio="none"
          className={`absolute inset-0 h-full w-full ${
            disabled ? "" : canPlaceMore ? "cursor-crosshair" : "cursor-default"
          }`}
          onPointerDown={handleBackgroundPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {shape === "speed-quad" && (
            <>
              {/* Measurement zone (P1-P2-P3-P4 traces the quadrilateral) */}
              {placed.length === 4 && (
                <polygon
                  points={placed.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill={ENTRY_COLOR}
                  fillOpacity={0.12}
                  stroke="none"
                />
              )}
              {p1 && p2 && (
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={ENTRY_COLOR}
                  strokeWidth={strokeW}
                />
              )}
              {p3 && p4 && (
                <line
                  x1={p3.x}
                  y1={p3.y}
                  x2={p4.x}
                  y2={p4.y}
                  stroke={EXIT_COLOR}
                  strokeWidth={strokeW}
                />
              )}
            </>
          )}

          {shape === "polygon" && placed.length >= 2 && (
            <polygon
              points={placed.map((p) => `${p.x},${p.y}`).join(" ")}
              fill={POLYGON_COLOR}
              fillOpacity={placed.length >= 3 ? 0.12 : 0}
              stroke={POLYGON_COLOR}
              strokeWidth={strokeW}
            />
          )}

          {shape === "line" && p1 && p2 && (
            <line
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={LINE_COLOR}
              strokeWidth={strokeW}
            />
          )}

          {/* Draggable handles */}
          {points.map((p, i) =>
            p ? (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={handleColor(i)}
                  fillOpacity={0.9}
                  stroke="#ffffff"
                  strokeWidth={strokeW}
                  className={disabled ? "" : "cursor-grab"}
                  onPointerDown={handleHandlePointerDown(i)}
                />
                <text
                  x={p.x + r * 1.4}
                  y={p.y - r * 0.8}
                  fill="#ffffff"
                  stroke="#000000"
                  strokeWidth={strokeW / 4}
                  fontSize={fontSize}
                  fontWeight="bold"
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {label(i)}
                </text>
              </g>
            ) : null,
          )}
        </svg>
      )}
    </div>
  );
}
