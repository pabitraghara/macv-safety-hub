import { toast } from "sonner";
import type {
  CraneProximityThresholds,
  UpdateCraneSettingsRequest,
} from "@/api/cranes";

/**
 * The proximity-threshold form, with every number held as a string.
 *
 * Numbers live as strings so a half-typed value ("1", on the way to "15") is
 * never coerced to something the user did not mean, and so clearing a field
 * shows an empty box rather than 0. Parsing and validation happen once, in
 * {@link buildCraneThresholds}, on submit.
 */
export interface CraneThresholdsForm {
  warning_m: string;
  critical_m: string;
  hysteresis_m: string;
  stale_after_s: string;
  /** Blank means "accept any accuracy" — the API's null. */
  max_accuracy_m: string;
  reminder_cooldown_s: string;
  poll_interval_s: string;
  use_crane_radius: boolean;
  require_fix: boolean;
  notify_relay: boolean;
}

/** Matches the per-field defaults in CRANES-MIGRATION-PLAN.md. */
export const CRANE_THRESHOLDS_FORM_DEFAULTS: CraneThresholdsForm = {
  warning_m: "30",
  critical_m: "15",
  hysteresis_m: "5",
  stale_after_s: "60",
  max_accuracy_m: "",
  reminder_cooldown_s: "300",
  poll_interval_s: "2",
  use_crane_radius: true,
  require_fix: true,
  notify_relay: true,
};

/**
 * Field bounds, mirroring `CraneProximitySettingsIn` in
 * `app/schemas/crane.py`. They are duplicated here rather than derived because
 * the API has no schema feed — so they are stated once, used for both the
 * input attributes and the submit-time check, and must be updated in step with
 * the backend. A value outside them is a 422 from the API, which reaches the
 * user as an opaque validation error; catching it here says which field.
 */
export const CRANE_THRESHOLD_BOUNDS = {
  warning_m: { min: 0, max: 10_000, exclusiveMin: true },
  critical_m: { min: 0, max: 10_000, exclusiveMin: true },
  hysteresis_m: { min: 0, max: 1_000, exclusiveMin: false },
  stale_after_s: { min: 5, max: 86_400, exclusiveMin: false },
  max_accuracy_m: { min: 0, max: 10_000, exclusiveMin: true },
  reminder_cooldown_s: { min: 0, max: 86_400, exclusiveMin: false },
  poll_interval_s: { min: 1, max: 3_600, exclusiveMin: false },
} as const;

export function craneThresholdsFormFromSettings(
  settings: CraneProximityThresholds,
): CraneThresholdsForm {
  return {
    warning_m: String(settings.warning_m),
    critical_m: String(settings.critical_m),
    hysteresis_m: String(settings.hysteresis_m),
    stale_after_s: String(settings.stale_after_s),
    max_accuracy_m:
      settings.max_accuracy_m == null ? "" : String(settings.max_accuracy_m),
    reminder_cooldown_s: String(settings.reminder_cooldown_s),
    poll_interval_s: String(settings.poll_interval_s),
    use_crane_radius: settings.use_crane_radius,
    require_fix: settings.require_fix,
    notify_relay: settings.notify_relay,
  };
}

/**
 * Validate the form, returning the first problem as a message or null when it
 * is sound. Pure and side-effect free so it can be tested directly;
 * {@link buildCraneThresholds} is the toasting wrapper the form calls.
 */
export function validateCraneThresholds(
  form: CraneThresholdsForm,
): string | null {
  const B = CRANE_THRESHOLD_BOUNDS;

  const warning_m = Number(form.warning_m);
  const critical_m = Number(form.critical_m);
  const hysteresis_m = Number(form.hysteresis_m);
  const stale_after_s = Number(form.stale_after_s);
  const reminder_cooldown_s = Number(form.reminder_cooldown_s);
  const poll_interval_s = Number(form.poll_interval_s);

  if (!Number.isFinite(warning_m) || warning_m <= B.warning_m.min) {
    return "Warning distance must be a positive number";
  }
  if (warning_m > B.warning_m.max) {
    return `Warning distance must be at most ${B.warning_m.max} m`;
  }
  if (!Number.isFinite(critical_m) || critical_m <= B.critical_m.min) {
    return "Critical distance must be a positive number";
  }
  if (critical_m > B.critical_m.max) {
    return `Critical distance must be at most ${B.critical_m.max} m`;
  }
  // The bands are nested, not adjacent: critical is the inner one, so a
  // critical wider than warning would make the warning band unreachable and
  // every breach would open straight at critical.
  if (critical_m > warning_m) {
    return "Critical distance must be less than or equal to the warning distance";
  }
  if (!Number.isFinite(hysteresis_m) || hysteresis_m < B.hysteresis_m.min) {
    return "Hysteresis must be zero or a positive number";
  }
  if (hysteresis_m > B.hysteresis_m.max) {
    return `Hysteresis must be at most ${B.hysteresis_m.max} m`;
  }
  if (
    !Number.isInteger(stale_after_s) ||
    stale_after_s < B.stale_after_s.min ||
    stale_after_s > B.stale_after_s.max
  ) {
    return `Stale after must be a whole number of seconds between ${B.stale_after_s.min} and ${B.stale_after_s.max}`;
  }
  if (
    !Number.isInteger(reminder_cooldown_s) ||
    reminder_cooldown_s < B.reminder_cooldown_s.min ||
    reminder_cooldown_s > B.reminder_cooldown_s.max
  ) {
    return `Reminder cooldown must be a whole number of seconds between ${B.reminder_cooldown_s.min} and ${B.reminder_cooldown_s.max}`;
  }
  if (
    !Number.isInteger(poll_interval_s) ||
    poll_interval_s < B.poll_interval_s.min ||
    poll_interval_s > B.poll_interval_s.max
  ) {
    return `Poll interval must be a whole number of seconds between ${B.poll_interval_s.min} and ${B.poll_interval_s.max}`;
  }

  const rawAccuracy = form.max_accuracy_m.trim();
  if (rawAccuracy !== "") {
    const max_accuracy_m = Number(rawAccuracy);
    if (
      !Number.isFinite(max_accuracy_m) ||
      max_accuracy_m <= B.max_accuracy_m.min
    ) {
      return "Max accuracy must be a positive number, or blank to accept any fix";
    }
    if (max_accuracy_m > B.max_accuracy_m.max) {
      return `Max accuracy must be at most ${B.max_accuracy_m.max} m`;
    }
  }

  return null;
}

/**
 * Parse and validate the thresholds form into the PUT body.
 * Returns null and raises a toast on the first problem, mirroring
 * `buildSpeedConfig` in cameras/components/speedConfig.ts.
 */
export function buildCraneThresholds(
  form: CraneThresholdsForm,
): UpdateCraneSettingsRequest | null {
  const problem = validateCraneThresholds(form);
  if (problem) {
    toast.error(problem);
    return null;
  }

  const rawAccuracy = form.max_accuracy_m.trim();

  return {
    warning_m: Number(form.warning_m),
    critical_m: Number(form.critical_m),
    hysteresis_m: Number(form.hysteresis_m),
    stale_after_s: Number(form.stale_after_s),
    max_accuracy_m: rawAccuracy === "" ? null : Number(rawAccuracy),
    reminder_cooldown_s: Number(form.reminder_cooldown_s),
    poll_interval_s: Number(form.poll_interval_s),
    use_crane_radius: form.use_crane_radius,
    require_fix: form.require_fix,
    notify_relay: form.notify_relay,
  };
}
