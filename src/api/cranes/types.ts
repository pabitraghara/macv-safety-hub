/**
 * Types for the cranes (crane proximity) domain.
 *
 * Source of truth is the dashboard-API section of CRANES-MIGRATION-PLAN.md and
 * the cloud data model it describes (`cranes`, `crane_positions`,
 * `crane_proximity_alerts`, `crane_proximity_settings`). The edge box is
 * authoritative for the siren; the cloud stores history and serves this UI.
 *
 * Two conventions worth noting:
 * - Distances are metres, always suffixed `_m`; durations are seconds (`_s`)
 *   except relay pulse width, which the router API takes in ms.
 * - The router password is write-only. Reads never return it; `crane:manage`
 *   sees `has_router_password` instead so the dialog can show "set / not set"
 *   without ever holding the secret in the browser.
 */

/** Alert severity. Pair distances additionally use "none" (see {@link CranePairLevel}). */
export type CraneAlertLevel = "warning" | "critical";

/** Proximity level of a crane pair — "none" means the pair is clear. */
export type CranePairLevel = "none" | CraneAlertLevel;

export type CraneAlertStatus = "open" | "resolved";

/** Why an alert closed. `manual` is a dashboard resolve, the rest come from the edge. */
export type CraneAlertResolutionReason = "cleared" | "stale" | "manual";

/**
 * Teltonika router output the edge drives for the siren. `relay*` are dry
 * relay contacts, `dout*` digital outputs, `dio*` configurable I/O — which
 * ones exist depends on the router model, so all are offered.
 */
export type CraneAlarmPin =
  | "relay0"
  | "relay1"
  | "dout1"
  | "dout2"
  | "dio0"
  | "dio1"
  | "dio2";

export const CRANE_ALARM_PINS: CraneAlarmPin[] = [
  "relay0",
  "relay1",
  "dout1",
  "dout2",
  "dio0",
  "dio1",
  "dio2",
];

/**
 * A crane as returned by GET /cranes and GET /cranes/{id}.
 * `router_password` is never present — see the module docstring.
 */
export interface Crane {
  id: string;
  site_id: string | null;
  code: string;
  name: string;
  /** CSS colour used for the map marker, radius circle, and status dot. */
  colour: string | null;
  /** Physical slew/jib radius in metres. 0 = treat the crane as a point. */
  radius_m: number;
  router_url: string | null;
  router_username: string | null;
  /** True when a router password is stored. The value itself is never returned. */
  has_router_password: boolean;
  router_verify_tls: boolean;
  alarm_pin: CraneAlarmPin | null;
  /** Logic level written to the pin to assert the alarm. */
  alarm_active_value: "0" | "1";
  /** Pulse width in milliseconds; 0 latches the output until cleared. */
  alarm_pulse_ms: number;
  /** Fire the relay on warning too, not only on critical. */
  alarm_on_warning: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** Body for POST /cranes. PUT takes the same shape with every field optional. */
export interface CraneInput {
  code: string;
  name: string;
  site_id?: string | null;
  colour?: string | null;
  radius_m?: number;
  router_url?: string | null;
  router_username?: string | null;
  /** Write-only. Omit to leave the stored password untouched, "" to clear it. */
  router_password?: string | null;
  router_verify_tls?: boolean;
  alarm_pin?: CraneAlarmPin | null;
  alarm_active_value?: "0" | "1";
  alarm_pulse_ms?: number;
  alarm_on_warning?: boolean;
  is_active?: boolean;
}

export type UpdateCraneRequest = Partial<CraneInput>;

/**
 * One crane on the live view, exactly as the backend's `LivePosition` puts it
 * on the wire: the crane's identity and its freshest fix flattened into one
 * object, with no nested position and no `id` — the crane's id is `crane_id`.
 *
 * Every fix field is nullable because a configured crane that has never
 * reported still appears here. `latitude`/`longitude` null means "not located
 * yet", which is why the map filters on those two rather than on a position
 * object.
 *
 * `is_stale` is computed server-side from `stale_after_s`, so the UI never has
 * to know the threshold.
 */
export interface CraneLiveCrane {
  crane_id: string;
  code: string;
  name: string;
  /** CSS colour for the marker, radius circle and status dot. Always set. */
  colour: string;
  /** Physical slew/jib radius in metres. 0 = treat the crane as a point. */
  radius_m: number;
  site_id: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  speed: number | null;
  angle: number | null;
  /** Horizontal accuracy in metres, as reported by the modem. */
  accuracy: number | null;
  satellites: number | null;
  /** Modem fix status; 0 means no fix. */
  fix_status: number | null;
  recorded_at: string | null;
  is_stale: boolean;
}

/**
 * Distance between one pair of cranes, recomputed server-side with the site's
 * settings so the UI needs no geodesy.
 *
 * `center_m` is centre-to-centre; `effective_m` has both cranes' radii
 * subtracted when `use_crane_radius` is on, and is the value the level is
 * derived from — always display `effective_m`.
 */
export interface CranePairDistance {
  crane_a_id: string;
  crane_b_id: string;
  center_m: number;
  effective_m: number;
  level: CranePairLevel;
}

/** GET /cranes/positions/live — the whole live view in one payload. */
export interface CraneLiveResponse {
  server_time: string;
  /**
   * The thresholds the pair levels above were computed with. The live endpoint
   * serves the raw threshold block (the backend's `CraneProximitySettingsIn`),
   * without the `site_id` / `is_configured` envelope the settings endpoint adds.
   */
  settings: CraneProximityThresholds;
  cranes: CraneLiveCrane[];
  pairs: CranePairDistance[];
}

export interface CraneLiveParams {
  site_id?: string;
}

/**
 * A proximity alert (row of `crane_proximity_alerts`), enriched with the crane
 * and site names the list view renders. Name fields are nullable because the
 * referenced crane may since have been soft-deleted.
 */
export interface CraneProximityAlert {
  id: string;
  site_id: string | null;
  site_name: string | null;
  crane_a_id: string;
  crane_b_id: string;
  crane_a_name: string | null;
  crane_b_name: string | null;
  /** Idempotency key minted by the edge; stable across retries. */
  edge_alert_id: string | null;
  level: CraneAlertLevel;
  /** Worst level the alert ever reached — a de-escalated alert keeps this. */
  peak_level: CraneAlertLevel;
  status: CraneAlertStatus;
  opened_distance_m: number | null;
  min_distance_m: number | null;
  last_distance_m: number | null;
  opened_at: string;
  updated_at: string | null;
  resolved_at: string | null;
  resolution_reason: CraneAlertResolutionReason | null;
  acknowledged_at: string | null;
  acknowledged_by_user_id: string | null;
  acknowledged_by: string | null;
  device_id: string | null;
}

export interface CraneAlertListParams {
  status?: CraneAlertStatus;
  level?: CraneAlertLevel;
  crane_id?: string;
  site_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface CraneAlertListResponse {
  metadata: {
    total_count: number;
    page: number;
    page_size: number;
  };
  data: CraneProximityAlert[];
}

/**
 * The threshold block itself — the shape both the settings endpoint and the
 * live endpoint carry, and the exact body of a settings PUT.
 */
export interface CraneProximityThresholds {
  /** Amber below this separation. */
  warning_m: number;
  /** Red below this separation. Must be <= warning_m. */
  critical_m: number;
  /** Extra clearance required before an alert closes, to stop it flapping. */
  hysteresis_m: number;
  /** Subtract each crane's radius_m from the centre-to-centre distance. */
  use_crane_radius: boolean;
  /** A crane with no fix newer than this is stale and excluded from pairing. */
  stale_after_s: number;
  /** Ignore positions with fix_status 0. */
  require_fix: boolean;
  /** Ignore positions less accurate than this. null = accept any. */
  max_accuracy_m: number | null;
  /** Minimum gap between repeat notifications for the same pair. */
  reminder_cooldown_s: number;
  /** Let the edge drive the router relay outputs. */
  notify_relay: boolean;
  /** How often the edge polls each router, in seconds. */
  poll_interval_s: number;
}

/**
 * Proximity thresholds for one (org, site) pair, as GET/PUT /cranes/settings
 * returns them. A row with `site_id: null` is the org-wide default used by
 * sites that have no row of their own.
 */
export interface CraneProximitySettings extends CraneProximityThresholds {
  site_id: string | null;
  /**
   * False when no row exists yet and the served values are inherited defaults.
   * Read-only — it describes where the values came from, so it is never sent
   * back on a PUT.
   */
  is_configured: boolean;
}

/** Body for PUT /cranes/settings — the thresholds only. */
export type UpdateCraneSettingsRequest = CraneProximityThresholds;

export interface CraneSettingsParams {
  site_id?: string;
}
