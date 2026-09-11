import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@/api/alpr", () => ({
  alprApi: {
    getDetections: vi.fn(),
  },
  createAlprEventSource: vi.fn(
    () => new Promise<EventSource>(() => {}), // never resolves; SSE not under test
  ),
}));

vi.mock("@/api/cameras", () => ({
  camerasApi: {
    getCameras: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/contexts/TimezoneContext", () => ({
  useTimezone: () => ({
    timezone: "UTC",
    setTimezone: vi.fn(),
    deviceTimezone: "UTC",
  }),
}));

import { alprApi, createAlprEventSource } from "@/api/alpr";
import type { AlprDirectionStats, AlprListResponse } from "@/api/alpr";
import { useAlprDetectionsView } from "../useAlprDetectionsView";

const mockedGetDetections = vi.mocked(alprApi.getDetections);

const emptyDirectionStats: AlprDirectionStats = {
  total: 0,
  employees: 0,
  contractors: 0,
  others: 0,
};

function detectionsPage(totalCount: number): AlprListResponse {
  return {
    data: [],
    metadata: { total_count: totalCount, page: 1, page_size: 10 },
    aggregated_data: { entry: emptyDirectionStats, exit: emptyDirectionStats },
  };
}

describe("useAlprDetectionsView - handleDateChange page reset", () => {
  beforeEach(() => {
    mockedGetDetections.mockReset();
    mockedGetDetections.mockResolvedValue(detectionsPage(0));
  });

  it("resets page to 1 when the date range changes", async () => {
    const { result } = renderHook(() => useAlprDetectionsView());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Navigate to page 3, as if paginating through a large "last 30 days" range.
    act(() => {
      result.current.handlePageChange(3);
    });
    await waitFor(() => expect(result.current.page).toBe(3));

    // Now switch the date range preset (e.g. to "Today").
    act(() => {
      result.current.handleDateChange({
        from: new Date("2026-07-16T00:00:00.000Z"),
        to: new Date("2026-07-16T23:59:59.999Z"),
      });
    });

    expect(result.current.page).toBe(1);

    await waitFor(() => {
      const lastCallParams =
        mockedGetDetections.mock.calls[
          mockedGetDetections.mock.calls.length - 1
        ][0];
      expect(lastCallParams?.page).toBe(1);
    });
  });

  it("ignores an undefined date range without resetting page", async () => {
    const { result } = renderHook(() => useAlprDetectionsView());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.handlePageChange(3);
    });
    await waitFor(() => expect(result.current.page).toBe(3));

    act(() => {
      result.current.handleDateChange(undefined);
    });

    expect(result.current.page).toBe(3);
  });
});

/**
 * A live detection must refresh the list WITHOUT flipping `isLoading` — the
 * overview page unmounts the table whenever `isLoading` is true, so a busy
 * gate previously blanked the page into a spinner on every vehicle.
 */
describe("useAlprDetectionsView - SSE refresh is silent", () => {
  function fakeEventSource() {
    return {
      onopen: null,
      onmessage: null,
      onerror: null,
      close: vi.fn(),
    } as unknown as EventSource;
  }

  beforeEach(() => {
    mockedGetDetections.mockReset();
    mockedGetDetections.mockResolvedValue(detectionsPage(0));
    vi.mocked(createAlprEventSource).mockReset();
  });

  it("sets isRefreshing (not isLoading) when a detection arrives over SSE", async () => {
    const eventSource = fakeEventSource();
    vi.mocked(createAlprEventSource).mockResolvedValue(eventSource);

    const { result } = renderHook(() => useAlprDetectionsView());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(eventSource.onmessage).toBeTruthy());

    // Hold the refetch open so the in-flight state is observable.
    let resolveFetch: (value: AlprListResponse) => void = () => {};
    mockedGetDetections.mockImplementation(
      () =>
        new Promise<AlprListResponse>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    act(() => {
      eventSource.onmessage?.({
        data: JSON.stringify({ license_plate: "76482R", direction: "exit" }),
      } as MessageEvent);
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(true), {
      timeout: 2000,
    });
    // The regression this guards: the table must stay mounted meanwhile.
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      resolveFetch(detectionsPage(1));
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.metadata.total_count).toBe(1);
  });

  it("keeps the existing list and error state when a silent refresh fails", async () => {
    const eventSource = fakeEventSource();
    vi.mocked(createAlprEventSource).mockResolvedValue(eventSource);

    const { result } = renderHook(() => useAlprDetectionsView());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(eventSource.onmessage).toBeTruthy());

    mockedGetDetections.mockRejectedValue(new Error("network blip"));

    act(() => {
      eventSource.onmessage?.({
        data: JSON.stringify({ license_plate: "76482R", direction: "entry" }),
      } as MessageEvent);
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(false), {
      timeout: 2000,
    });
    // A transient background failure must not replace the rows the user is
    // reading with an error banner.
    expect(result.current.error).toBeNull();
  });
});
