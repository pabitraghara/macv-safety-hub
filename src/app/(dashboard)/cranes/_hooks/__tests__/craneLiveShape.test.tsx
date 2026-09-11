import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CraneLiveResponse } from "@/api/cranes";
import {
  craneIndex,
  craneLatLng,
  isLocated,
  locatedCranes,
  nearestPair,
  worstLevelForCrane,
} from "../craneFilters";
import { CraneLivePanel } from "../../_components/CraneLivePanel";

/**
 * One `LivePositionsResponse` exactly as `GET /cranes/positions/live` sends it
 * — flat cranes (`crane_id`, coordinates on the crane itself, no nested
 * position, no `id`), the settings block, and the pair distances.
 *
 * Typing it as `CraneLiveResponse` is the point of this file: the map and the
 * panel read these fields directly, so a type that drifts from the backend's
 * schema fails to compile here before it can render an empty map in
 * production. The assertions below then check that the shaping helpers and the
 * panel actually read the flat fields rather than a nested position.
 */
const LIVE: CraneLiveResponse = {
  server_time: "2026-09-07T10:00:30+00:00",
  settings: {
    warning_m: 30,
    critical_m: 15,
    hysteresis_m: 5,
    use_crane_radius: true,
    stale_after_s: 60,
    require_fix: true,
    max_accuracy_m: null,
    reminder_cooldown_s: 300,
    notify_relay: true,
    poll_interval_s: 2,
  },
  cranes: [
    {
      crane_id: "crane-a",
      code: "CR1",
      name: "Tower crane 1",
      colour: "#2563eb",
      radius_m: 40,
      site_id: "site-1",
      latitude: 23.5859,
      longitude: 58.4059,
      altitude: 12.5,
      speed: 0,
      angle: 90,
      accuracy: 2.5,
      satellites: 11,
      fix_status: 1,
      recorded_at: "2026-09-07T10:00:28+00:00",
      is_stale: false,
    },
    {
      crane_id: "crane-b",
      code: "CR2",
      name: "Tower crane 2",
      colour: "#dc2626",
      radius_m: 35,
      site_id: "site-1",
      latitude: 23.5861,
      longitude: 58.4062,
      altitude: 11,
      speed: 0.2,
      angle: 180,
      accuracy: 3,
      satellites: 9,
      fix_status: 1,
      recorded_at: "2026-09-07T09:55:00+00:00",
      is_stale: true,
    },
    {
      // Configured but never seen: present in the payload with null
      // coordinates rather than absent, which is why "located" is a check on
      // latitude/longitude and not on the crane's presence.
      crane_id: "crane-c",
      code: "CR3",
      name: "Mobile crane",
      colour: "#16a34a",
      radius_m: 0,
      site_id: null,
      latitude: null,
      longitude: null,
      altitude: null,
      speed: null,
      angle: null,
      accuracy: null,
      satellites: null,
      fix_status: null,
      recorded_at: null,
      is_stale: true,
    },
  ],
  pairs: [
    {
      crane_a_id: "crane-a",
      crane_b_id: "crane-b",
      center_m: 38.4,
      effective_m: 12.3,
      level: "critical",
    },
  ],
};

describe("live-view data shaping", () => {
  it("counts a crane as located only when it has both coordinates", () => {
    expect(LIVE.cranes.map(isLocated)).toEqual([true, true, false]);
  });

  it("drops the never-located crane from the map's crane list", () => {
    expect(locatedCranes(LIVE.cranes).map((c) => c.crane_id)).toEqual([
      "crane-a",
      "crane-b",
    ]);
  });

  it("reads coordinates off the crane itself, not a nested position", () => {
    expect(craneLatLng(LIVE.cranes[0])).toEqual([23.5859, 58.4059]);
    expect(craneLatLng(LIVE.cranes[2])).toBeNull();
  });

  it("indexes cranes by crane_id, which is the only id in the payload", () => {
    const index = craneIndex(LIVE.cranes);
    expect(index.get("crane-a")?.code).toBe("CR1");
    // A pair references cranes by the same id the index is keyed on — if these
    // ever disagree the map draws no lines at all.
    expect(index.has(LIVE.pairs[0].crane_a_id)).toBe(true);
    expect(index.has(LIVE.pairs[0].crane_b_id)).toBe(true);
  });

  it("resolves a crane's worst level and nearest pair from crane_id", () => {
    expect(worstLevelForCrane("crane-a", LIVE.pairs)).toBe("critical");
    expect(nearestPair("crane-a", LIVE.pairs)?.effective_m).toBe(12.3);
    expect(worstLevelForCrane("crane-c", LIVE.pairs)).toBe("none");
    expect(nearestPair("crane-c", LIVE.pairs)).toBeNull();
  });
});

describe("CraneLivePanel", () => {
  it("renders one card per crane, reading the flat fix fields", () => {
    render(<CraneLivePanel cranes={LIVE.cranes} pairs={LIVE.pairs} />);

    expect(screen.getByText("Tower crane 1")).toBeInTheDocument();
    expect(screen.getByText("CR1")).toBeInTheDocument();
    // Coordinates come from crane.latitude / crane.longitude.
    expect(screen.getByText("23.585900, 58.405900")).toBeInTheDocument();
    expect(screen.getByText(/11 \/ 2.5 m/)).toBeInTheDocument();
    // The nearest crane is resolved through crane_id.
    expect(screen.getByText("Tower crane 2 · 12.3 m")).toBeInTheDocument();
  });

  it("shows a crane that has never reported without inventing a position", () => {
    render(<CraneLivePanel cranes={LIVE.cranes} pairs={LIVE.pairs} />);

    expect(screen.getByText("Mobile crane")).toBeInTheDocument();
    expect(screen.getByText("never")).toBeInTheDocument();
  });

  it("marks a crane stale from the server-computed flag", () => {
    render(<CraneLivePanel cranes={LIVE.cranes} pairs={LIVE.pairs} />);

    expect(screen.getAllByText("stale")).toHaveLength(2);
    expect(screen.getAllByText("live")).toHaveLength(1);
  });
});
