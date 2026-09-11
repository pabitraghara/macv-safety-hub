import { describe, it, expect, beforeEach } from "vitest";
import {
  LAST_MODULE_KEY,
  hasCranesModule,
  moduleFromPathname,
  readLastModule,
  resolveHomeTarget,
} from "../modules";
import { Permission } from "../permissions";

const CRANE_VIEW = new Set<string>([Permission.craneView]);
const VEHICLE_VIEW = new Set<string>([Permission.vehicleView]);

beforeEach(() => {
  localStorage.clear();
});

describe("hasCranesModule", () => {
  it("keys off the lowercase module id the backend returns", () => {
    expect(hasCranesModule(new Set(["cranes"]))).toBe(true);
    expect(hasCranesModule(new Set(["safety"]))).toBe(false);
  });
});

describe("moduleFromPathname", () => {
  it("maps the cranes section to the cranes module", () => {
    expect(moduleFromPathname("/cranes/live")).toBe("cranes");
    expect(moduleFromPathname("/cranes/alerts")).toBe("cranes");
  });

  it("leaves the existing module mappings alone", () => {
    expect(moduleFromPathname("/alpr/overview")).toBe("vehicles");
    expect(moduleFromPathname("/incidents")).toBe("safety");
  });

  it("treats /settings/cranes as a shared core route, not the module", () => {
    // Settings lives under Platform in the nav, so visiting a module's
    // settings page must not change which module the user lands on next.
    expect(moduleFromPathname("/settings/cranes")).toBeNull();
  });
});

describe("readLastModule", () => {
  it("accepts cranes as a stored value", () => {
    localStorage.setItem(LAST_MODULE_KEY, "cranes");
    expect(readLastModule()).toBe("cranes");
  });

  it("falls back to safety for an unknown value", () => {
    localStorage.setItem(LAST_MODULE_KEY, "nonsense");
    expect(readLastModule()).toBe("safety");
  });
});

describe("resolveHomeTarget", () => {
  it("sends a cranes-only org to the live map", () => {
    expect(resolveHomeTarget(new Set(["cranes"]), CRANE_VIEW)).toBe(
      "/cranes/live",
    );
  });

  it("does not redirect a cranes-entitled user who lacks crane:view", () => {
    // The section would render its access-denied card, so bouncing the
    // homepage there would strand the user on a dead end.
    expect(resolveHomeTarget(new Set(["cranes"]), new Set())).toBeNull();
  });

  it("lets safety keep the homepage when cranes is not last-visited", () => {
    expect(
      resolveHomeTarget(new Set(["safety", "cranes"]), CRANE_VIEW),
    ).toBeNull();
  });

  it("honours cranes as the last-visited module alongside safety", () => {
    localStorage.setItem(LAST_MODULE_KEY, "cranes");
    expect(resolveHomeTarget(new Set(["safety", "cranes"]), CRANE_VIEW)).toBe(
      "/cranes/live",
    );
  });

  it("preserves the pre-existing vehicles behaviour", () => {
    expect(resolveHomeTarget(new Set(["vehicles"]), VEHICLE_VIEW)).toBe(
      "/vehicles/overview",
    );
    expect(
      resolveHomeTarget(new Set(["safety", "vehicles"]), VEHICLE_VIEW),
    ).toBeNull();
    localStorage.setItem(LAST_MODULE_KEY, "vehicles");
    expect(
      resolveHomeTarget(new Set(["safety", "vehicles"]), VEHICLE_VIEW),
    ).toBe("/vehicles/overview");
  });

  it("returns null when no redirect-owning module is entitled", () => {
    expect(resolveHomeTarget(new Set(["safety"]), new Set())).toBeNull();
    expect(resolveHomeTarget(new Set(), new Set())).toBeNull();
  });
});
