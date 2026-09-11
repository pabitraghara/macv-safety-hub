import { describe, it, expect } from "vitest";
import type { CranePairDistance } from "@/api/cranes";
import {
  buildCraneAlertListParams,
  formatMetres,
  nearestPair,
  otherCraneId,
  pairKey,
  pairsForCrane,
  worstLevelForCrane,
  type BuildCraneAlertListParamsInput,
} from "../craneFilters";

function baseInput(
  overrides: Partial<BuildCraneAlertListParamsInput> = {},
): BuildCraneAlertListParamsInput {
  return {
    page: 1,
    pageSize: 20,
    status: "all",
    level: "all",
    siteIds: [],
    startDate: "2026-09-01T00:00:00.000Z",
    endDate: "2026-09-07T23:59:59.999Z",
    ...overrides,
  };
}

function pair(
  a: string,
  b: string,
  effective_m: number,
  level: CranePairDistance["level"] = "none",
): CranePairDistance {
  return {
    crane_a_id: a,
    crane_b_id: b,
    center_m: effective_m + 10,
    effective_m,
    level,
  };
}

describe("buildCraneAlertListParams", () => {
  it("carries paging and the date range through", () => {
    const result = buildCraneAlertListParams(baseInput());
    expect(result.page).toBe(1);
    expect(result.page_size).toBe(20);
    expect(result.start_date).toBe("2026-09-01T00:00:00.000Z");
    expect(result.end_date).toBe("2026-09-07T23:59:59.999Z");
  });

  it("omits the 'all' sentinels rather than sending them", () => {
    const result = buildCraneAlertListParams(baseInput());
    expect("status" in result).toBe(false);
    expect("level" in result).toBe(false);
  });

  it("sends status and level once they are narrowed", () => {
    const result = buildCraneAlertListParams(
      baseInput({ status: "open", level: "critical" }),
    );
    expect(result.status).toBe("open");
    expect(result.level).toBe("critical");
  });

  it("omits crane_id when unset or empty", () => {
    expect("crane_id" in buildCraneAlertListParams(baseInput())).toBe(false);
    expect(
      "crane_id" in buildCraneAlertListParams(baseInput({ craneId: "" })),
    ).toBe(false);
  });

  it("sends crane_id when a crane is picked", () => {
    const result = buildCraneAlertListParams(baseInput({ craneId: "crane-1" }));
    expect(result.crane_id).toBe("crane-1");
  });

  it("sends site_id only when exactly one site is selected", () => {
    // The endpoint takes a single site_id but SiteFilter is a multi-select,
    // so a multi-pick must widen to "no filter" instead of quietly using the
    // first id and showing a narrower list than the chips claim.
    expect(
      buildCraneAlertListParams(baseInput({ siteIds: ["site-a"] })).site_id,
    ).toBe("site-a");
    expect(
      "site_id" in
        buildCraneAlertListParams(baseInput({ siteIds: ["site-a", "site-b"] })),
    ).toBe(false);
    expect("site_id" in buildCraneAlertListParams(baseInput())).toBe(false);
  });

  it("omits an undefined date range", () => {
    const result = buildCraneAlertListParams(
      baseInput({ startDate: undefined, endDate: undefined }),
    );
    expect("start_date" in result).toBe(false);
    expect("end_date" in result).toBe(false);
  });
});

describe("pairKey", () => {
  it("is independent of the order the two cranes arrive in", () => {
    expect(pairKey(pair("b", "a", 5))).toBe(pairKey(pair("a", "b", 5)));
  });
});

describe("otherCraneId", () => {
  it("returns the opposite side of the pair", () => {
    expect(otherCraneId(pair("a", "b", 5), "a")).toBe("b");
    expect(otherCraneId(pair("a", "b", 5), "b")).toBe("a");
  });

  it("returns null for a crane that is not in the pair", () => {
    expect(otherCraneId(pair("a", "b", 5), "c")).toBeNull();
  });
});

describe("pairsForCrane", () => {
  it("keeps every pair the crane appears in, on either side", () => {
    const pairs = [pair("a", "b", 5), pair("c", "a", 9), pair("b", "c", 2)];
    expect(pairsForCrane("a", pairs)).toHaveLength(2);
    expect(pairsForCrane("d", pairs)).toHaveLength(0);
  });
});

describe("nearestPair", () => {
  it("returns null when the crane has no pairs", () => {
    expect(nearestPair("a", [])).toBeNull();
    expect(nearestPair("z", [pair("a", "b", 5)])).toBeNull();
  });

  it("picks the smallest effective_m, not centre-to-centre", () => {
    // effective_m is radius-adjusted, so a pair can be nearest by effective
    // distance while being further apart centre to centre.
    const far = { ...pair("a", "b", 4), center_m: 40 };
    const near = { ...pair("a", "c", 9), center_m: 12 };
    expect(nearestPair("a", [near, far])?.crane_b_id).toBe("b");
  });

  it("finds the crane on either side of the pair", () => {
    const pairs = [pair("x", "a", 30), pair("a", "y", 12)];
    expect(nearestPair("a", pairs)?.effective_m).toBe(12);
  });
});

describe("worstLevelForCrane", () => {
  it("is 'none' with no pairs", () => {
    expect(worstLevelForCrane("a", [])).toBe("none");
  });

  it("reports the worst level across all of the crane's pairs", () => {
    const pairs = [
      pair("a", "b", 40, "none"),
      pair("a", "c", 20, "warning"),
      pair("d", "a", 8, "critical"),
    ];
    expect(worstLevelForCrane("a", pairs)).toBe("critical");
  });

  it("ignores other cranes' pairs", () => {
    const pairs = [pair("a", "b", 40, "none"), pair("c", "d", 5, "critical")];
    expect(worstLevelForCrane("a", pairs)).toBe("none");
  });

  it("escalates warning over none regardless of pair order", () => {
    expect(
      worstLevelForCrane("a", [
        pair("a", "c", 20, "warning"),
        pair("a", "b", 40, "none"),
      ]),
    ).toBe("warning");
  });
});

describe("formatMetres", () => {
  it("renders one decimal place", () => {
    expect(formatMetres(12.34)).toBe("12.3 m");
    expect(formatMetres(0)).toBe("0.0 m");
  });

  it("renders an em dash for a missing distance", () => {
    expect(formatMetres(null)).toBe("—");
    expect(formatMetres(undefined)).toBe("—");
  });
});
