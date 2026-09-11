"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Fragment, useEffect, useMemo } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { CraneLiveCrane, CranePairDistance } from "@/api/cranes";
import {
  craneIndex,
  craneLatLng,
  locatedCranes,
  CRANE_DEFAULT_COLOUR,
  CRANE_LEVEL_COLOUR,
  pairKey,
  type CraneLatLng,
} from "../_hooks/craneFilters";

/**
 * The ONLY module in the app that imports leaflet. Everything else reaches it
 * through `next/dynamic(..., { ssr: false })` — Leaflet touches `window` at
 * import time, so pulling it into a server-rendered module breaks the build.
 *
 * Markers are `L.divIcon`s built from inline HTML rather than Leaflet's default
 * image marker, so the module ships no image assets and needs none of the
 * usual icon-path patching.
 *
 * Every icon is memoised on the values its HTML is built from, because the
 * page repolls every 3 seconds: a new `divIcon` makes react-leaflet replace
 * the marker's DOM node, so unmemoised icons would tear down and recreate
 * every marker on the map twenty times a minute.
 */

const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? DEFAULT_TILE_URL;

export interface CraneMapProps {
  cranes: CraneLiveCrane[];
  pairs: CranePairDistance[];
  /** Draw each crane's configured slew radius as a translucent circle. */
  showRadius: boolean;
}

/** Escape interpolated text — divIcon HTML is parsed, and crane names are user data. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function craneIcon(crane: CraneLiveCrane) {
  const colour = crane.colour || CRANE_DEFAULT_COLOUR;
  const dot = [
    "display:block;width:14px;height:14px;border-radius:9999px",
    "border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25)",
    `background:${escapeHtml(colour)}`,
    // A stale crane is dimmed rather than hidden: its last known position is
    // still the best guess of where the machine is, and hiding it would read
    // as "no crane there".
    crane.is_stale ? "opacity:.45" : "",
  ]
    .filter(Boolean)
    .join(";");

  const label = [
    "position:absolute;left:50%;top:16px;transform:translateX(-50%)",
    "white-space:nowrap;font-size:11px;font-weight:600;color:#0f172a",
    "background:rgba(255,255,255,.85);border-radius:3px;padding:0 3px",
    crane.is_stale ? "opacity:.6" : "",
  ]
    .filter(Boolean)
    .join(";");

  return L.divIcon({
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html:
      `<div style="position:relative"><span style="${dot}"></span>` +
      `<span style="${label}">${escapeHtml(crane.name)}</span></div>`,
  });
}

/** The distance as displayed — one decimal, the honest GPS precision. */
function pairLabelText(pair: CranePairDistance): string {
  return `${pair.effective_m.toFixed(1)} m`;
}

function pairLabelIcon(pair: CranePairDistance) {
  const colour = CRANE_LEVEL_COLOUR[pair.level];
  const style = [
    "display:inline-block;transform:translate(-50%,-50%)",
    "white-space:nowrap;font-size:11px;font-weight:700",
    "background:rgba(255,255,255,.9);border-radius:3px;padding:0 3px",
    `color:${colour}`,
  ].join(";");
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<span style="${style}">${pairLabelText(pair)}</span>`,
  });
}

/**
 * Fit the viewport to the cranes once they are known, then leave the user's
 * pan and zoom alone — refitting on every 3-second poll would yank the map
 * out from under anyone inspecting it.
 */
function FitToCranes({ points }: { points: CraneLatLng[] }) {
  const map = useMap();
  // Refit only when the SET of located cranes changes, not on every position
  // update, so a crane appearing or dropping off recentres but movement does not.
  const fitKey = points.length;

  useEffect(() => {
    // The container is sized by CSS after mount, so Leaflet's initial
    // measurement is wrong and half the tiles never load without this.
    const timer = setTimeout(() => map.invalidateSize(), 50);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 18);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 19 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return null;
}

export default function CraneMap({ cranes, pairs, showRadius }: CraneMapProps) {
  const located = useMemo(() => locatedCranes(cranes), [cranes]);

  const byId = useMemo(() => craneIndex(located), [located]);

  const points = useMemo<CraneLatLng[]>(
    () => located.map((crane) => craneLatLng(crane) as CraneLatLng),
    [located],
  );

  // A marker's HTML depends on exactly these three fields, so the icon cache is
  // rebuilt only when one of them changes — never on a mere position update.
  const craneIconKey = located
    .map((c) => `${c.crane_id}|${c.colour}|${c.name}|${c.is_stale}`)
    .join("~");
  const craneIcons = useMemo(
    () => new Map(located.map((crane) => [crane.crane_id, craneIcon(crane)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [craneIconKey],
  );

  // Likewise for the mid-line distance labels: their HTML is the level and the
  // rounded distance, so a sub-decimetre wobble must not rebuild them.
  const pairIconKey = pairs
    .map((pair) => `${pairKey(pair)}|${pair.level}|${pairLabelText(pair)}`)
    .join("~");
  const pairIcons = useMemo(
    () => new Map(pairs.map((pair) => [pairKey(pair), pairLabelIcon(pair)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pairIconKey],
  );

  return (
    <MapContainer
      center={points[0] ?? [0, 0]}
      zoom={points.length > 0 ? 18 : 2}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url={TILE_URL}
        maxZoom={19}
      />
      <FitToCranes points={points} />

      {/*
        Fragments, not <div>s: react-leaflet children attach themselves to the
        Leaflet map, so an element wrapped around them lands in the map
        container as a stray node instead of grouping anything.
      */}
      {pairs.map((pair) => {
        const a = byId.get(pair.crane_a_id);
        const b = byId.get(pair.crane_b_id);
        const from = a ? craneLatLng(a) : null;
        const to = b ? craneLatLng(b) : null;
        if (!from || !to) return null;

        const midpoint: CraneLatLng = [
          (from[0] + to[0]) / 2,
          (from[1] + to[1]) / 2,
        ];
        const isClear = pair.level === "none";
        const icon = pairIcons.get(pairKey(pair));

        return (
          <Fragment key={pairKey(pair)}>
            <Polyline
              positions={[from, to]}
              pathOptions={{
                color: CRANE_LEVEL_COLOUR[pair.level],
                // Clear pairs stay thin and dashed so a busy site does not read
                // as a web of solid lines; only breaches draw the eye.
                weight: isClear ? 2 : 4,
                dashArray: isClear ? "6 6" : undefined,
                opacity: 0.9,
              }}
            />
            {icon && (
              <Marker position={midpoint} icon={icon} interactive={false} />
            )}
          </Fragment>
        );
      })}

      {located.map((crane) => {
        const position = craneLatLng(crane) as CraneLatLng;
        const icon = craneIcons.get(crane.crane_id);
        return (
          <Fragment key={crane.crane_id}>
            {showRadius && crane.radius_m > 0 && (
              <Circle
                center={position}
                radius={crane.radius_m}
                pathOptions={{
                  color: crane.colour || CRANE_DEFAULT_COLOUR,
                  weight: 1,
                  fillOpacity: crane.is_stale ? 0.04 : 0.08,
                }}
              />
            )}
            {icon && <Marker position={position} icon={icon} />}
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
