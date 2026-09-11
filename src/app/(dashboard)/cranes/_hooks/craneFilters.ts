import type {
  CraneAlertListParams,
  CraneAlertLevel,
  CraneAlertStatus,
  CraneLiveCrane,
  CranePairDistance,
  CranePairLevel,
} from "@/api/cranes";

/** "all" is the UI's no-filter sentinel; the API omits the param instead. */
export type CraneStatusFilter = "all" | CraneAlertStatus;
export type CraneLevelFilter = "all" | CraneAlertLevel;

export interface BuildCraneAlertListParamsInput {
  page: number;
  pageSize: number;
  status: CraneStatusFilter;
  level: CraneLevelFilter;
  /** Matches alerts where this crane is either side of the pair. */
  craneId?: string;
  siteIds: string[];
  startDate?: string; // ISO
  endDate?: string; // ISO
}

/**
 * Build the query for GET /cranes/proximity-alerts, dropping every filter the
 * user has not set. "all" sentinels and empty strings are omitted rather than
 * sent, so the backend applies its own defaults instead of receiving a literal
 * "all" it would have to special-case.
 */
export function buildCraneAlertListParams(
  input: BuildCraneAlertListParamsInput,
): CraneAlertListParams {
  const raw = {
    page: input.page,
    page_size: input.pageSize,
    status: input.status === "all" ? undefined : input.status,
    level: input.level === "all" ? undefined : input.level,
    crane_id: input.craneId || undefined,
    // The endpoint takes a single site_id; the shared SiteFilter is a
    // multi-select, so only the first pick narrows the query. Selecting
    // several is treated as "no site filter" rather than silently applying
    // one of them.
    site_id: input.siteIds.length === 1 ? input.siteIds[0] : undefined,
    start_date: input.startDate,
    end_date: input.endDate,
  };

  return Object.fromEntries(
    Object.entries(raw).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  ) as CraneAlertListParams;
}

/** Leaflet's [lat, lng] tuple. */
export type CraneLatLng = [number, number];

/**
 * Whether a crane can be drawn.
 *
 * The live payload is flat (`LivePosition`): a configured crane that has never
 * reported is present with `latitude`/`longitude` null rather than absent, so
 * "has a position" is a check on those two fields and nothing else.
 */
export function isLocated(crane: CraneLiveCrane): boolean {
  return crane.latitude != null && crane.longitude != null;
}

/** Only the cranes that have a fix — everything the map draws comes from here. */
export function locatedCranes(cranes: CraneLiveCrane[]): CraneLiveCrane[] {
  return cranes.filter(isLocated);
}

/** The crane's coordinates, or null when it has never reported. */
export function craneLatLng(crane: CraneLiveCrane): CraneLatLng | null {
  return isLocated(crane)
    ? [crane.latitude as number, crane.longitude as number]
    : null;
}

/** Lookup by `crane_id` — the live payload's identifier, not `id`. */
export function craneIndex(
  cranes: CraneLiveCrane[],
): Map<string, CraneLiveCrane> {
  return new Map(cranes.map((crane) => [crane.crane_id, crane]));
}

/** Order-independent identity for a pair, so A↔B and B↔A share one key. */
export function pairKey(pair: CranePairDistance): string {
  return [pair.crane_a_id, pair.crane_b_id].sort().join("::");
}

/** The other crane in the pair, or null when `craneId` is not in it. */
export function otherCraneId(
  pair: CranePairDistance,
  craneId: string,
): string | null {
  if (pair.crane_a_id === craneId) return pair.crane_b_id;
  if (pair.crane_b_id === craneId) return pair.crane_a_id;
  return null;
}

export function pairsForCrane(
  craneId: string,
  pairs: CranePairDistance[],
): CranePairDistance[] {
  return pairs.filter((p) => otherCraneId(p, craneId) !== null);
}

/**
 * The closest crane to `craneId`, by `effective_m` — the radius-adjusted
 * separation the levels are derived from, not centre-to-centre.
 */
export function nearestPair(
  craneId: string,
  pairs: CranePairDistance[],
): CranePairDistance | null {
  const mine = pairsForCrane(craneId, pairs);
  if (mine.length === 0) return null;
  return mine.reduce((best, p) =>
    p.effective_m < best.effective_m ? p : best,
  );
}

const LEVEL_RANK: Record<CranePairLevel, number> = {
  none: 0,
  warning: 1,
  critical: 2,
};

/** The worst level any of this crane's pairs is at — what its status shows. */
export function worstLevelForCrane(
  craneId: string,
  pairs: CranePairDistance[],
): CranePairLevel {
  return pairsForCrane(craneId, pairs).reduce<CranePairLevel>(
    (worst, p) => (LEVEL_RANK[p.level] > LEVEL_RANK[worst] ? p.level : worst),
    "none",
  );
}

/**
 * Map colours, as literal hex rather than Tailwind tokens: Leaflet paths are
 * SVG attributes set from JS, so they cannot read a CSS class. Kept in step
 * with the emerald-600 / amber-500 / red-600 used by the badges below.
 */
export const CRANE_LEVEL_COLOUR: Record<CranePairLevel, string> = {
  none: "#16a34a",
  warning: "#f59e0b",
  critical: "#dc2626",
};

/** Badge colour map, in the `<Badge variant="outline">` house style. */
export const CRANE_LEVEL_STYLE: Record<string, string> = {
  none: "border-emerald-200 bg-emerald-100 text-emerald-800",
  warning: "border-amber-200 bg-amber-100 text-amber-900",
  critical: "border-red-200 bg-red-100 text-red-800",
};

export const CRANE_STATUS_STYLE: Record<string, string> = {
  open: "border-amber-200 bg-amber-100 text-amber-900",
  resolved: "border-gray-200 bg-gray-100 text-gray-600",
};

/** Default marker colour for a crane that has none configured. */
export const CRANE_DEFAULT_COLOUR = "#2563eb";

/** One decimal place is the honest precision for a metre-scale GPS distance. */
export function formatMetres(value: number | null | undefined): string {
  return value == null ? "—" : `${value.toFixed(1)} m`;
}
