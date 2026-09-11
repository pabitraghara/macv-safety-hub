import { describe, it, expect } from "vitest";
import {
  buildAlprListParams,
  sortFieldForDirection,
  sseEventMatchesFilters,
  type BuildAlprListParamsInput,
} from "../alprFilters";

function baseInput(
  overrides: Partial<BuildAlprListParamsInput> = {},
): BuildAlprListParamsInput {
  return {
    page: 1,
    pageSize: 10,
    searchType: "search",
    licensePlateSearch: "",
    ownerNameSearch: "",
    startDate: "2026-07-01T00:00:00.000Z",
    endDate: "2026-07-01T23:59:59.999Z",
    direction: "all",
    selectedCameraIds: [],
    sortBy: "entry_time",
    sortOrder: "desc",
    ...overrides,
  };
}

describe("sortFieldForDirection", () => {
  it("sorts the combined list by timestamp, not entry_time", () => {
    // Regression, 2026-07-29: exit-only rows have entry_time = null, so
    // sorting the mixed list by entry_time ranked 504 unpaired exits above
    // that day's 219 real entries and the table looked empty.
    expect(sortFieldForDirection("all")).toBe("timestamp");
  });

  it("sorts a single-direction list by that direction's own column", () => {
    expect(sortFieldForDirection("entry")).toBe("entry_time");
    expect(sortFieldForDirection("exit")).toBe("exit_time");
  });
});

describe("buildAlprListParams", () => {
  it("defaults omit direction, camera_id, search, and name", () => {
    const result = buildAlprListParams(baseInput());

    expect(result.page).toBe(1);
    expect(result.page_size).toBe(10);
    expect(result.start_date).toBe("2026-07-01T00:00:00.000Z");
    expect(result.end_date).toBe("2026-07-01T23:59:59.999Z");
    expect(result.sort_by).toBe("entry_time");
    expect(result.sort_order).toBe("desc");
    expect("direction" in result).toBe(false);
    expect("camera_id" in result).toBe(false);
    expect("search" in result).toBe(false);
    expect("name" in result).toBe(false);
  });

  it("includes direction 'entry' when set", () => {
    const result = buildAlprListParams(baseInput({ direction: "entry" }));
    expect(result.direction).toBe("entry");
  });

  it("includes direction 'exit' with sort_by exit_time", () => {
    const result = buildAlprListParams(
      baseInput({ direction: "exit", sortBy: "exit_time" }),
    );
    expect(result.direction).toBe("exit");
    expect(result.sort_by).toBe("exit_time");
  });

  it("joins selectedCameraIds with commas", () => {
    const result = buildAlprListParams(
      baseInput({ selectedCameraIds: ["a", "b"] }),
    );
    expect(result.camera_id).toBe("a,b");
  });

  it("trims a license plate search value", () => {
    const result = buildAlprListParams(
      baseInput({ searchType: "search", licensePlateSearch: " abc " }),
    );
    expect(result.search).toBe("abc");
    expect("name" in result).toBe(false);
  });

  it("uses owner name search when searchType is name", () => {
    const result = buildAlprListParams(
      baseInput({ searchType: "name", ownerNameSearch: "Jane" }),
    );
    expect(result.name).toBe("Jane");
    expect("search" in result).toBe(false);
  });

  it("omits search when the trimmed value is empty", () => {
    const result = buildAlprListParams(
      baseInput({ searchType: "search", licensePlateSearch: "   " }),
    );
    expect("search" in result).toBe(false);
  });

  it("omits start_date/end_date when undefined", () => {
    const result = buildAlprListParams(
      baseInput({ startDate: undefined, endDate: undefined }),
    );
    expect("start_date" in result).toBe(false);
    expect("end_date" in result).toBe(false);
  });
});

describe("sseEventMatchesFilters", () => {
  const permissive = { direction: "all" as const, selectedCameraNames: [] };

  it("returns false when the event has no license plate", () => {
    expect(sseEventMatchesFilters({ license_plate: null }, permissive)).toBe(
      false,
    );
    expect(
      sseEventMatchesFilters({ license_plate: undefined }, permissive),
    ).toBe(false);
  });

  it("matches under permissive filters", () => {
    expect(sseEventMatchesFilters({ license_plate: "X" }, permissive)).toBe(
      true,
    );
  });

  it("matches direction filter against event direction", () => {
    const filters = { direction: "entry" as const, selectedCameraNames: [] };
    expect(
      sseEventMatchesFilters(
        { license_plate: "X", direction: "entry" },
        filters,
      ),
    ).toBe(true);
    expect(
      sseEventMatchesFilters(
        { license_plate: "X", direction: "exit" },
        filters,
      ),
    ).toBe(false);
    expect(
      sseEventMatchesFilters({ license_plate: "X", direction: null }, filters),
    ).toBe(false);
  });

  it("matches camera filter on entry_stream_name", () => {
    const filters = {
      direction: "all" as const,
      selectedCameraNames: ["Gate A"],
    };
    expect(
      sseEventMatchesFilters(
        {
          license_plate: "X",
          entry_stream_name: "Gate A",
          exit_stream_name: null,
        },
        filters,
      ),
    ).toBe(true);
  });

  it("rejects camera filter when both stream names are null", () => {
    const filters = {
      direction: "all" as const,
      selectedCameraNames: ["Gate A"],
    };
    expect(
      sseEventMatchesFilters(
        { license_plate: "X", entry_stream_name: null, exit_stream_name: null },
        filters,
      ),
    ).toBe(false);
  });

  it("matches camera filter on exit_stream_name", () => {
    const filters = {
      direction: "all" as const,
      selectedCameraNames: ["Gate A"],
    };
    expect(
      sseEventMatchesFilters(
        { license_plate: "X", exit_stream_name: "Gate A" },
        filters,
      ),
    ).toBe(true);
  });

  it("rejects camera filter when stream names don't match selection", () => {
    const filters = {
      direction: "all" as const,
      selectedCameraNames: ["Gate A"],
    };
    expect(
      sseEventMatchesFilters(
        {
          license_plate: "X",
          entry_stream_name: "Gate B",
          exit_stream_name: "Gate B",
        },
        filters,
      ),
    ).toBe(false);
  });

  it("combines direction and camera filters", () => {
    const filters = {
      direction: "exit" as const,
      selectedCameraNames: ["Gate A"],
    };
    expect(
      sseEventMatchesFilters(
        { license_plate: "X", direction: "exit", exit_stream_name: "Gate A" },
        filters,
      ),
    ).toBe(true);
    expect(
      sseEventMatchesFilters(
        { license_plate: "X", direction: "entry", exit_stream_name: "Gate A" },
        filters,
      ),
    ).toBe(false);
    expect(
      sseEventMatchesFilters(
        { license_plate: "X", direction: "exit", exit_stream_name: "Gate B" },
        filters,
      ),
    ).toBe(false);
  });
});
