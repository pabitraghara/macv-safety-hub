import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@/api/base/http", () => ({
  request: vi.fn(),
}));

import { request } from "@/api/base/http";
import { ApiError } from "@/api/base/errors";
import { usePolicies, usePolicy, useContacts } from "../hooks";
import type { AlertPolicy, AlertTarget } from "../types";

const mockedRequest = vi.mocked(request);

const basePolicy: AlertPolicy = {
  id: "p1",
  org_id: "org1",
  site_id: null,
  name: "High severity alert",
  trigger_type: "safety",
  match: { min_severity: "High" },
  schedule: null,
  cooldown_seconds: null,
  is_active: true,
  created_by: null,
  recipients: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  is_deleted: false,
};

const otherPolicy: AlertPolicy = {
  ...basePolicy,
  id: "p2",
  name: "Speed alert",
  trigger_type: "speed_violation",
  match: { min_overspeed: 10 },
};

const baseContact: AlertTarget = {
  id: "t1",
  org_id: "org1",
  site_id: null,
  target_type: "external",
  target_ref: null,
  label: "Ext contact",
  email: "ext@example.com",
  phone: null,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  is_deleted: false,
};

describe("usePolicies", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it("transitions loading true -> false and exposes fetched policies", async () => {
    mockedRequest.mockResolvedValueOnce([basePolicy]);

    const { result } = renderHook(() => usePolicies());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.policies).toEqual([basePolicy]);
    expect(result.current.error).toBeNull();
    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });

  it("sets an error string when the list request rejects", async () => {
    mockedRequest.mockRejectedValueOnce(new ApiError("boom", 500));

    const { result } = renderHook(() => usePolicies());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("boom");
    expect(result.current.policies).toEqual([]);
  });

  it("createPolicy calls request then triggers a refetch", async () => {
    mockedRequest.mockResolvedValueOnce([]); // initial fetch
    const { result } = renderHook(() => usePolicies());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedRequest.mockResolvedValueOnce(otherPolicy); // create response
    mockedRequest.mockResolvedValueOnce([otherPolicy]); // refetch response

    await act(async () => {
      await result.current.createPolicy({
        name: "Speed alert",
        trigger_type: "speed_violation",
      });
    });

    expect(mockedRequest).toHaveBeenCalledTimes(3);
    expect(mockedRequest).toHaveBeenNthCalledWith(
      2,
      "POST",
      "/api/v1/alert-policies",
      { name: "Speed alert", trigger_type: "speed_violation" },
    );
    await waitFor(() => expect(result.current.policies).toEqual([otherPolicy]));
  });

  it("deletePolicy calls request then triggers a refetch", async () => {
    mockedRequest.mockResolvedValueOnce([basePolicy]); // initial fetch
    const { result } = renderHook(() => usePolicies());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedRequest.mockResolvedValueOnce(undefined); // delete response
    mockedRequest.mockResolvedValueOnce([]); // refetch response

    await act(async () => {
      await result.current.deletePolicy("p1");
    });

    expect(mockedRequest).toHaveBeenCalledTimes(3);
    expect(mockedRequest).toHaveBeenNthCalledWith(
      2,
      "DELETE",
      "/api/v1/alert-policies/p1",
    );
    await waitFor(() => expect(result.current.policies).toEqual([]));
  });

  it("refetches when the filters value changes", async () => {
    mockedRequest.mockResolvedValue([basePolicy]);

    const { result, rerender } = renderHook(
      ({ filters }) => usePolicies(filters),
      { initialProps: { filters: { site_id: "s1" } } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedRequest).toHaveBeenCalledTimes(1);

    rerender({ filters: { site_id: "s2" } });
    await waitFor(() => expect(mockedRequest).toHaveBeenCalledTimes(2));

    expect(mockedRequest).toHaveBeenNthCalledWith(
      2,
      "GET",
      "/api/v1/alert-policies",
      undefined,
      { params: { site_id: "s2" } },
    );
  });

  it("ignores a stale response that resolves after a newer request", async () => {
    // First (site s1) request is left pending; the second (site s2) request
    // resolves first. When the stale s1 response finally arrives it must not
    // clobber the fresher s2 state.
    let resolveStale: (value: AlertPolicy[]) => void = () => {};
    const stalePromise = new Promise<AlertPolicy[]>((resolve) => {
      resolveStale = resolve;
    });
    mockedRequest.mockReturnValueOnce(stalePromise);

    const { result, rerender } = renderHook(
      ({ filters }) => usePolicies(filters),
      { initialProps: { filters: { site_id: "s1" } } },
    );

    mockedRequest.mockResolvedValueOnce([otherPolicy]); // s2 resolves immediately
    rerender({ filters: { site_id: "s2" } });

    await waitFor(() => expect(result.current.policies).toEqual([otherPolicy]));

    // Now let the superseded s1 request resolve — it should be discarded.
    await act(async () => {
      resolveStale([basePolicy]);
      await stalePromise;
    });

    expect(result.current.policies).toEqual([otherPolicy]);
  });

  it("does not refetch when an equivalent filters object literal is passed again", async () => {
    mockedRequest.mockResolvedValue([basePolicy]);

    const { result, rerender } = renderHook(
      ({ filters }) => usePolicies(filters),
      { initialProps: { filters: { site_id: "s1" } } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedRequest).toHaveBeenCalledTimes(1);

    // New object literal, same contents -> stable serialization, no refetch.
    rerender({ filters: { site_id: "s1" } });

    // Give any errant effect a chance to fire.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });
});

describe("usePolicy", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it("derives a single policy from the list endpoint by id", async () => {
    mockedRequest.mockResolvedValueOnce([basePolicy, otherPolicy]);

    const { result } = renderHook(() => usePolicy("p2"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.policy).toEqual(otherPolicy);
    expect(mockedRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/alert-policies",
      undefined,
      { params: {} },
    );
  });

  it("resolves null when no policy matches the id", async () => {
    mockedRequest.mockResolvedValueOnce([basePolicy]);

    const { result } = renderHook(() => usePolicy("missing"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.policy).toBeNull();
  });
});

describe("useContacts", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it("transitions loading true -> false and exposes fetched contacts", async () => {
    mockedRequest.mockResolvedValueOnce([baseContact]);

    const { result } = renderHook(() => useContacts());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.contacts).toEqual([baseContact]);
    expect(result.current.error).toBeNull();
  });

  it("sets an error string when the list request rejects", async () => {
    mockedRequest.mockRejectedValueOnce(new ApiError("boom", 500));

    const { result } = renderHook(() => useContacts());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("boom");
    expect(result.current.contacts).toEqual([]);
  });

  it("createContact calls request then triggers a refetch", async () => {
    mockedRequest.mockResolvedValueOnce([]); // initial fetch
    const { result } = renderHook(() => useContacts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedRequest.mockResolvedValueOnce(baseContact); // create response
    mockedRequest.mockResolvedValueOnce([baseContact]); // refetch response

    await act(async () => {
      await result.current.createContact({
        target_type: "external",
        email: "ext@example.com",
      });
    });

    expect(mockedRequest).toHaveBeenCalledTimes(3);
    expect(mockedRequest).toHaveBeenNthCalledWith(
      2,
      "POST",
      "/api/v1/alert-targets",
      { target_type: "external", email: "ext@example.com" },
    );
    await waitFor(() => expect(result.current.contacts).toEqual([baseContact]));
  });

  it("deleteContact calls request then triggers a refetch", async () => {
    mockedRequest.mockResolvedValueOnce([baseContact]); // initial fetch
    const { result } = renderHook(() => useContacts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedRequest.mockResolvedValueOnce(undefined); // delete response
    mockedRequest.mockResolvedValueOnce([]); // refetch response

    await act(async () => {
      await result.current.deleteContact("t1");
    });

    expect(mockedRequest).toHaveBeenCalledTimes(3);
    expect(mockedRequest).toHaveBeenNthCalledWith(
      2,
      "DELETE",
      "/api/v1/alert-targets/t1",
    );
    await waitFor(() => expect(result.current.contacts).toEqual([]));
  });
});
