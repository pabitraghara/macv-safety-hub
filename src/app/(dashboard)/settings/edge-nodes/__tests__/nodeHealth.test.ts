import { describe, it, expect } from "vitest";
import type { PipelineNode } from "@/api/pipeline-nodes";
import {
  camerasHealth,
  formatMb,
  formatPercent,
  formatUptime,
  nodeFreshestAt,
  nodeLiveness,
  usedRatio,
} from "../nodeHealth";

const NOW = new Date("2026-08-28T12:00:00Z").getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;

function makeNode(overrides: Partial<PipelineNode> = {}): PipelineNode {
  return {
    id: "n1",
    code: "jetty-speed-jetson",
    name: null,
    site_id: null,
    platform: "jetson",
    stream_base_url: null,
    notes: null,
    last_seen_at: null,
    running_version: "1.2.1",
    license_id: null,
    checkin_at: null,
    uptime_seconds: null,
    shm_total_mb: null,
    shm_used_mb: null,
    cpu_percent: null,
    mem_percent: null,
    disk_free_mb: null,
    gpu_temp_c: null,
    cameras_assigned: 0,
    cameras_streaming: 0,
    created_at: ago(0),
    updated_at: ago(0),
    ...overrides,
  };
}

describe("nodeFreshestAt", () => {
  it("returns null when the node has never reported", () => {
    expect(nodeFreshestAt(makeNode())).toBeNull();
  });

  it("picks the newer of last_seen_at and checkin_at", () => {
    const node = makeNode({
      last_seen_at: ago(20 * MIN),
      checkin_at: ago(2 * MIN),
    });
    expect(nodeFreshestAt(node)).toBe(ago(2 * MIN));
  });

  it("works when only the check-in is present (a node with no cameras)", () => {
    const node = makeNode({ checkin_at: ago(3 * MIN) });
    expect(nodeFreshestAt(node)).toBe(ago(3 * MIN));
  });
});

describe("nodeLiveness", () => {
  it("is 'never' with no signal", () => {
    expect(nodeLiveness(makeNode(), NOW)).toBe("never");
  });

  it("is 'online' within 10 minutes", () => {
    expect(nodeLiveness(makeNode({ checkin_at: ago(4 * MIN) }), NOW)).toBe(
      "online",
    );
  });

  it("is 'stale' between 10 and 30 minutes", () => {
    expect(nodeLiveness(makeNode({ checkin_at: ago(15 * MIN) }), NOW)).toBe(
      "stale",
    );
  });

  it("is 'offline' past 30 minutes", () => {
    expect(nodeLiveness(makeNode({ last_seen_at: ago(60 * MIN) }), NOW)).toBe(
      "offline",
    );
  });
});

describe("camerasHealth", () => {
  it("is 'idle' with nothing assigned", () => {
    expect(
      camerasHealth(makeNode({ cameras_assigned: 0, cameras_streaming: 0 })),
    ).toBe("idle");
  });

  it("is 'ok' when every assigned camera streams", () => {
    expect(
      camerasHealth(makeNode({ cameras_assigned: 8, cameras_streaming: 8 })),
    ).toBe("ok");
  });

  it("is 'degraded' when some are not streaming", () => {
    expect(
      camerasHealth(makeNode({ cameras_assigned: 8, cameras_streaming: 6 })),
    ).toBe("degraded");
  });
});

describe("formatters", () => {
  it("formatUptime", () => {
    expect(formatUptime(null)).toBe("—");
    expect(formatUptime(90)).toBe("1m");
    expect(formatUptime(3 * 3600 + 5 * 60)).toBe("3h 5m");
    expect(formatUptime(2 * 86400 + 4 * 3600)).toBe("2d 4h");
  });

  it("formatMb", () => {
    expect(formatMb(null)).toBe("—");
    expect(formatMb(512)).toBe("512 MB");
    expect(formatMb(24576)).toBe("24.0 GB");
  });

  it("formatPercent", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(41.6)).toBe("42%");
  });

  it("usedRatio clamps and guards null/zero total", () => {
    expect(usedRatio(null, 100)).toBeNull();
    expect(usedRatio(50, null)).toBeNull();
    expect(usedRatio(10, 0)).toBeNull();
    expect(usedRatio(12288, 24576)).toBe(50);
    expect(usedRatio(300, 100)).toBe(100);
  });
});
