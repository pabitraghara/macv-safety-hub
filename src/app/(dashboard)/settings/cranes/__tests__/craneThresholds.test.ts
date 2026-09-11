import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CRANE_THRESHOLDS_FORM_DEFAULTS,
  buildCraneThresholds,
  craneThresholdsFormFromSettings,
  validateCraneThresholds,
  type CraneThresholdsForm,
} from "../craneThresholds";
import type { CraneProximitySettings } from "@/api/cranes";

const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
  },
}));

beforeEach(() => {
  toastError.mockClear();
});

function form(
  overrides: Partial<CraneThresholdsForm> = {},
): CraneThresholdsForm {
  return { ...CRANE_THRESHOLDS_FORM_DEFAULTS, ...overrides };
}

describe("craneThresholdsFormFromSettings", () => {
  const settings: CraneProximitySettings = {
    site_id: "site-1",
    warning_m: 25,
    critical_m: 10,
    hysteresis_m: 4,
    use_crane_radius: false,
    stale_after_s: 90,
    require_fix: false,
    max_accuracy_m: 3.5,
    reminder_cooldown_s: 120,
    notify_relay: false,
    poll_interval_s: 5,
    is_configured: true,
  };

  it("stringifies every numeric field", () => {
    const result = craneThresholdsFormFromSettings(settings);
    expect(result.warning_m).toBe("25");
    expect(result.critical_m).toBe("10");
    expect(result.max_accuracy_m).toBe("3.5");
    expect(result.poll_interval_s).toBe("5");
  });

  it("carries the switches through unchanged", () => {
    const result = craneThresholdsFormFromSettings(settings);
    expect(result.use_crane_radius).toBe(false);
    expect(result.require_fix).toBe(false);
    expect(result.notify_relay).toBe(false);
  });

  it("renders a null max accuracy as an empty field, not '0' or 'null'", () => {
    const result = craneThresholdsFormFromSettings({
      ...settings,
      max_accuracy_m: null,
    });
    expect(result.max_accuracy_m).toBe("");
  });
});

describe("validateCraneThresholds", () => {
  it("accepts the defaults", () => {
    expect(validateCraneThresholds(form())).toBeNull();
  });

  it("rejects a critical distance wider than the warning distance", () => {
    // The bands nest, so critical > warning would make the warning band
    // unreachable and every breach would open straight at critical.
    expect(
      validateCraneThresholds(form({ warning_m: "10", critical_m: "20" })),
    ).toMatch(/critical distance must be less than or equal/i);
  });

  it("accepts critical exactly equal to warning", () => {
    expect(
      validateCraneThresholds(form({ warning_m: "15", critical_m: "15" })),
    ).toBeNull();
  });

  it("rejects non-positive or non-numeric distances", () => {
    expect(validateCraneThresholds(form({ warning_m: "0" }))).not.toBeNull();
    expect(validateCraneThresholds(form({ warning_m: "-1" }))).not.toBeNull();
    expect(validateCraneThresholds(form({ warning_m: "abc" }))).not.toBeNull();
    expect(validateCraneThresholds(form({ warning_m: "" }))).not.toBeNull();
    expect(validateCraneThresholds(form({ critical_m: "0" }))).not.toBeNull();
  });

  it("allows zero hysteresis but not a negative one", () => {
    expect(validateCraneThresholds(form({ hysteresis_m: "0" }))).toBeNull();
    expect(
      validateCraneThresholds(form({ hysteresis_m: "-2" })),
    ).not.toBeNull();
  });

  it("requires whole seconds for the interval fields", () => {
    expect(
      validateCraneThresholds(form({ stale_after_s: "1.5" })),
    ).not.toBeNull();
    expect(
      validateCraneThresholds(form({ poll_interval_s: "0" })),
    ).not.toBeNull();
    expect(
      validateCraneThresholds(form({ reminder_cooldown_s: "-1" })),
    ).not.toBeNull();
    expect(
      validateCraneThresholds(form({ reminder_cooldown_s: "0" })),
    ).toBeNull();
  });

  // Every bound below mirrors CraneProximitySettingsIn in
  // app/schemas/crane.py. A value the backend rejects must be caught here, or
  // the user gets an opaque 422 instead of a message naming the field.
  it("rejects a stale_after_s below the backend's 5 s floor", () => {
    expect(
      validateCraneThresholds(form({ stale_after_s: "4" })),
    ).not.toBeNull();
    expect(validateCraneThresholds(form({ stale_after_s: "5" }))).toBeNull();
  });

  it("rejects distances beyond the backend's 10 km ceiling", () => {
    expect(
      validateCraneThresholds(
        form({ warning_m: "10001", critical_m: "10001" }),
      ),
    ).not.toBeNull();
    expect(
      validateCraneThresholds(form({ warning_m: "10000", critical_m: "9000" })),
    ).toBeNull();
    expect(
      validateCraneThresholds(form({ max_accuracy_m: "10001" })),
    ).not.toBeNull();
  });

  it("caps hysteresis at 1000 m", () => {
    expect(validateCraneThresholds(form({ hysteresis_m: "1000" }))).toBeNull();
    expect(
      validateCraneThresholds(form({ hysteresis_m: "1001" })),
    ).not.toBeNull();
  });

  it("caps the reminder cooldown at a day and the poll interval at an hour", () => {
    expect(
      validateCraneThresholds(form({ reminder_cooldown_s: "86400" })),
    ).toBeNull();
    expect(
      validateCraneThresholds(form({ reminder_cooldown_s: "86401" })),
    ).not.toBeNull();
    expect(
      validateCraneThresholds(form({ poll_interval_s: "3600" })),
    ).toBeNull();
    expect(
      validateCraneThresholds(form({ poll_interval_s: "3601" })),
    ).not.toBeNull();
  });

  it("treats a blank max accuracy as valid but rejects a bad one", () => {
    expect(validateCraneThresholds(form({ max_accuracy_m: "  " }))).toBeNull();
    expect(
      validateCraneThresholds(form({ max_accuracy_m: "0" })),
    ).not.toBeNull();
    expect(
      validateCraneThresholds(form({ max_accuracy_m: "nope" })),
    ).not.toBeNull();
  });
});

describe("buildCraneThresholds", () => {
  it("parses a valid form into the request body", () => {
    const result = buildCraneThresholds(
      form({ warning_m: "40", critical_m: "20", max_accuracy_m: "2.5" }),
    );
    expect(result).toEqual({
      warning_m: 40,
      critical_m: 20,
      hysteresis_m: 5,
      stale_after_s: 60,
      max_accuracy_m: 2.5,
      reminder_cooldown_s: 300,
      poll_interval_s: 2,
      use_crane_radius: true,
      require_fix: true,
      notify_relay: true,
    });
    expect(toastError).not.toHaveBeenCalled();
  });

  it("sends null, not 0, for a blank max accuracy", () => {
    // 0 would mean "reject every fix"; null means "accept any accuracy".
    expect(
      buildCraneThresholds(form({ max_accuracy_m: "" }))?.max_accuracy_m,
    ).toBeNull();
  });

  it("returns null and toasts on the first problem", () => {
    const result = buildCraneThresholds(
      form({ warning_m: "10", critical_m: "20" }),
    );
    expect(result).toBeNull();
    expect(toastError).toHaveBeenCalledTimes(1);
  });
});
