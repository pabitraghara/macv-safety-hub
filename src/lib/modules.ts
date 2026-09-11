/**
 * Module entitlement + homepage-routing helpers.
 *
 * A "module" is a licensable bundle of features entitled EXPLICITLY by the org:
 * the backend returns `enabled_modules` (lowercase: "safety", "vehicles") on
 * GET /organisations/my, and the AuthProvider exposes it as `enabledModules:
 * Set<string>`. This is GATE 1 (module/entitlement, org axis) and is
 * independent of per-item scope gating (GATE 2, the role/level axis) which
 * still keys off the token's permission scopes.
 *
 * See MERGE-PLAN.md "Target architecture → Modules & entitlement / Homepage rule".
 */
import { Permission } from "@/lib/permissions";

export type ModuleId = "safety" | "vehicles" | "cranes";

export const LAST_MODULE_KEY = "last_module";

/** Every recognised module id, used to validate the stored last-module value. */
const MODULE_IDS: ModuleId[] = ["safety", "vehicles", "cranes"];

const DEFAULT_MODULE: ModuleId = "safety";

export function hasSafetyModule(enabledModules: Set<string>): boolean {
  return enabledModules.has("safety");
}

export function hasVehiclesModule(enabledModules: Set<string>): boolean {
  return enabledModules.has("vehicles");
}

export function hasCranesModule(enabledModules: Set<string>): boolean {
  return enabledModules.has("cranes");
}

// Route prefixes that belong to each module, used to track the last-visited
// module for multi-module clients.
const VEHICLES_PREFIXES = ["/vehicles", "/alpr", "/people"];
const SAFETY_PREFIXES = ["/observations", "/incidents", "/videos"];
const CRANES_PREFIXES = ["/cranes"];

/**
 * Map a dashboard pathname to the module it belongs to, or null for shared
 * core routes (home, cameras, settings) that should not change last-visited.
 */
export function moduleFromPathname(pathname: string): ModuleId | null {
  if (VEHICLES_PREFIXES.some((p) => pathname.startsWith(p))) return "vehicles";
  if (SAFETY_PREFIXES.some((p) => pathname.startsWith(p))) return "safety";
  if (CRANES_PREFIXES.some((p) => pathname.startsWith(p))) return "cranes";
  return null;
}

export function readLastModule(): ModuleId {
  if (typeof window === "undefined") return DEFAULT_MODULE;
  const stored = localStorage.getItem(LAST_MODULE_KEY);
  return MODULE_IDS.includes(stored as ModuleId)
    ? (stored as ModuleId)
    : DEFAULT_MODULE;
}

export function writeLastModule(module: ModuleId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_MODULE_KEY, module);
}

/**
 * Pick the vehicles-module landing route based on which scope the user
 * actually holds, mirroring `buildVehiclesItems` in `app-sidebar.tsx`: the
 * first matching scope wins so we never send a user to a page they can't
 * view ("/vehicles/overview" requires vehicle:view).
 */
function resolveVehiclesTarget(permissions: Set<string>): string {
  if (permissions.has(Permission.vehicleView)) return "/vehicles/overview";
  return "/people";
}

/**
 * The cranes-module landing route. The section has a single entry point (the
 * live map), so unlike vehicles there is nothing to resolve per-scope — but a
 * user without `crane:view` must not be sent there, which the caller checks.
 */
function resolveCranesTarget(): string {
  return "/cranes/live";
}

/**
 * Decide where the dashboard homepage ("/") should send the user.
 *
 * Which modules exist comes from `enabledModules` (GATE 1, explicit org
 * entitlement); the vehicles landing route still resolves per-item from
 * `permissions` (GATE 2, scope axis) via `resolveVehiclesTarget`.
 *
 * - Safety present → null (render the safety dashboard) unless the
 *   last-visited module is another entitled one.
 * - No safety → the last-visited entitled module's route, else the first
 *   entitled module's route in declaration order.
 * - No module at all → null; the safety dashboard is the fallback surface.
 *
 * Cranes joins as a redirect-only module: it has one landing route and no
 * home dashboard of its own, so it only ever wins via last-visited or by
 * being the sole entitlement. A user entitled to cranes but lacking
 * `crane:view` is not sent there — the section would refuse to render.
 *
 * Callers MUST wait until entitlement has resolved (enabledModules non-empty)
 * before acting on the result — an empty set is indistinguishable from "still
 * loading".
 */
export function resolveHomeTarget(
  enabledModules: Set<string>,
  permissions: Set<string>,
): string | null {
  const safety = hasSafetyModule(enabledModules);

  // Declaration order is the fallback priority when nothing was last visited.
  const redirectTargets: { module: ModuleId; target: string }[] = [];
  if (hasVehiclesModule(enabledModules)) {
    redirectTargets.push({
      module: "vehicles",
      target: resolveVehiclesTarget(permissions),
    });
  }
  if (
    hasCranesModule(enabledModules) &&
    permissions.has(Permission.craneView)
  ) {
    redirectTargets.push({ module: "cranes", target: resolveCranesTarget() });
  }

  if (redirectTargets.length === 0) return null;

  const last = readLastModule();
  const lastTarget = redirectTargets.find((t) => t.module === last);
  if (lastTarget) return lastTarget.target;

  // Safety was either last-visited or is the default — it owns the homepage.
  return safety ? null : redirectTargets[0].target;
}
