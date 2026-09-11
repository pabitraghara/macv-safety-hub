import { describe, it, expect } from "vitest";
import type {
  AlertMatch,
  AlertPolicy,
  AlertRecipient,
  AlertSchedule,
  AlertTarget,
  CreatePolicyRequest,
} from "../types";

// Runtime conformance test: construct one literal of each key shape and
// assert field access compiles + a couple of runtime checks. Guards against
// drift in src/api/alert-policies/types.ts.

describe("alert-policies types conformance", () => {
  it("AlertSchedule accepts windows and quiet_hours", () => {
    const schedule: AlertSchedule = {
      timezone: "Australia/Sydney",
      windows: [{ days: ["mon", "tue"], start: "09:00", end: "17:00" }],
      quiet_hours: [{ start: "22:00", end: "06:00" }],
    };

    expect(schedule.timezone).toBe("Australia/Sydney");
    expect(schedule.windows[0].days).toEqual(["mon", "tue"]);
    expect(schedule.quiet_hours[0].start).toBe("22:00");
  });

  it("AlertMatch carries either per-trigger optional field", () => {
    const safetyMatch: AlertMatch = { min_severity: "High" };
    const speedMatch: AlertMatch = { min_overspeed: 15 };
    const alprMatch: AlertMatch = { list_status: "blacklist" };
    const allMatch: AlertMatch = {};

    expect(safetyMatch.min_severity).toBe("High");
    expect(speedMatch.min_overspeed).toBe(15);
    expect(alprMatch.list_status).toBe("blacklist");
    expect(allMatch.min_severity).toBeUndefined();
  });

  it("AlertTarget models a contact-book entry", () => {
    const target: AlertTarget = {
      id: "t1",
      org_id: "org1",
      site_id: null,
      target_type: "external",
      target_ref: null,
      label: "Ext",
      email: "ext@example.com",
      phone: null,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      is_deleted: false,
    };

    expect(target.target_type).toBe("external");
    expect(target.email).toBe("ext@example.com");
  });

  it("AlertRecipient nests a target and its own channels", () => {
    const recipient: AlertRecipient = {
      id: "r1",
      policy_id: "p1",
      target_id: "t1",
      channels: ["email", "whatsapp"],
      is_active: true,
      target: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      is_deleted: false,
    };

    expect(recipient.channels).toEqual(["email", "whatsapp"]);
    expect(recipient.target).toBeNull();
  });

  it("AlertPolicy carries recipients and a discriminated match", () => {
    const policy: AlertPolicy = {
      id: "p1",
      org_id: "org1",
      site_id: null,
      name: "High severity alert",
      trigger_type: "safety",
      match: { min_severity: "Critical" },
      schedule: null,
      cooldown_seconds: 300,
      is_active: true,
      created_by: null,
      recipients: [],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      is_deleted: false,
    };

    expect(policy.trigger_type).toBe("safety");
    expect(policy.match.min_severity).toBe("Critical");
    expect(policy.recipients).toHaveLength(0);
  });

  it("CreatePolicyRequest accepts nested recipient inputs including inline external and user", () => {
    const req: CreatePolicyRequest = {
      name: "New alert",
      site_id: null,
      trigger_type: "speed_violation",
      match: { min_overspeed: 20 },
      schedule: null,
      cooldown_seconds: null,
      is_active: true,
      recipients: [
        { target_id: "target-1", channels: ["email"] },
        {
          target_type: "external",
          email: "ext@example.com",
          label: "Ext",
          channels: ["email"],
        },
        {
          target_type: "user",
          target_ref: "logto-user-1",
          channels: ["whatsapp"],
        },
      ],
    };

    expect(req.recipients).toHaveLength(3);
    expect(req.recipients?.[1].target_type).toBe("external");
    expect(req.recipients?.[2].target_ref).toBe("logto-user-1");
  });
});
