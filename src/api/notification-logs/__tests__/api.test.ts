import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/base/http", () => ({
  request: vi.fn(),
}));

import { request } from "@/api/base/http";
import { notificationLogsApi } from "../api";

const mockedRequest = vi.mocked(request);

describe("notificationLogsApi", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined as never);
  });

  it("lists with every filter passed through as a query param", async () => {
    await notificationLogsApi.list({
      page: 2,
      page_size: 25,
      status: "failed",
      channel: "email",
      trigger_type: "speed_violation",
      recipient_search: "ops@",
      start_date: "2026-08-01T00:00:00.000Z",
    });

    expect(mockedRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/notification-logs",
      undefined,
      {
        params: {
          page: 2,
          page_size: 25,
          status: "failed",
          channel: "email",
          trigger_type: "speed_violation",
          recipient_search: "ops@",
          start_date: "2026-08-01T00:00:00.000Z",
        },
      },
    );
  });

  it("scopes the list to one entity when given a trigger_id", async () => {
    await notificationLogsApi.list({ trigger_id: "violation-1" });

    expect(mockedRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/notification-logs",
      undefined,
      { params: { trigger_id: "violation-1" } },
    );
  });

  it("requests the summary on its own path", async () => {
    await notificationLogsApi.summary({ start_date: "2026-08-01T00:00:00Z" });

    expect(mockedRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/notification-logs/summary",
      undefined,
      { params: { start_date: "2026-08-01T00:00:00Z" } },
    );
  });

  it("sends an empty params object when unfiltered", async () => {
    await notificationLogsApi.list();

    expect(mockedRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/notification-logs",
      undefined,
      { params: {} },
    );
  });
});
