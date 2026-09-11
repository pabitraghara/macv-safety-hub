import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlertsSentPanel } from "../AlertsSentPanel";
import type { DeliveryLogEntry } from "@/api/notification-logs";

/** Reveal the collapsed detail list by clicking the header. */
async function expand() {
  await userEvent.click(screen.getByRole("button", { name: /alerts sent/i }));
}

const useDeliveryLog = vi.fn();

vi.mock("@/api/notification-logs", async () => {
  const actual = await vi.importActual<
    typeof import("@/api/notification-logs")
  >("@/api/notification-logs");
  return { ...actual, useDeliveryLog: (f: unknown) => useDeliveryLog(f) };
});

function entry(overrides: Partial<DeliveryLogEntry> = {}): DeliveryLogEntry {
  return {
    id: "log-1",
    source: "alert_policy",
    trigger_type: "speed_violation",
    trigger_id: "violation-1",
    channel: "email",
    sent_to: "ops@example.com",
    status: "sent",
    failed_reason: null,
    sent_at: "2026-08-29T10:00:00Z",
    policy_id: "policy-1",
    policy_name: "Gate overspeed",
    recipient_id: "recipient-1",
    recipient_label: "Site Ops",
    trigger_summary: null,
    created_at: "2026-08-29T10:00:00Z",
    updated_at: "2026-08-29T10:00:00Z",
    is_deleted: false,
    ...overrides,
  };
}

function mockResult(items: DeliveryLogEntry[], overrides = {}) {
  useDeliveryLog.mockReturnValue({
    items,
    pagination: {
      total_items: items.length,
      page_size: 50,
      current_page: 1,
      total_pages: 1,
      has_next: false,
      has_previous: false,
    },
    loading: false,
    error: null,
    initialized: true,
    refetch: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AlertsSentPanel", () => {
  it("asks the delivery log for one entity only", () => {
    mockResult([]);
    render(<AlertsSentPanel triggerId="violation-1" />);

    expect(useDeliveryLog).toHaveBeenCalledWith(
      expect.objectContaining({ trigger_id: "violation-1" }),
    );
  });

  it("says nobody was alerted rather than rendering nothing", () => {
    mockResult([]);
    render(<AlertsSentPanel triggerId="violation-1" />);

    expect(screen.getByText("No alerts sent")).toBeInTheDocument();
  });

  it("summarises the delivery count on the collapsed header", () => {
    mockResult([entry(), entry({ id: "log-2" })]);
    render(<AlertsSentPanel triggerId="violation-1" />);

    expect(screen.getByText("2 deliveries")).toBeInTheDocument();
    // Detail rows stay hidden until expanded.
    expect(screen.queryByText("Site Ops")).not.toBeInTheDocument();
  });

  it("flags failed deliveries in the collapsed summary", () => {
    mockResult([entry({ status: "failed" }), entry({ id: "log-2" })]);
    render(<AlertsSentPanel triggerId="violation-1" />);

    expect(screen.getByText(/1 failed/)).toBeInTheDocument();
  });

  it("shows the recipient, channel, policy and status of each delivery", async () => {
    mockResult([entry()]);
    render(<AlertsSentPanel triggerId="violation-1" />);
    await expand();

    expect(screen.getByText("Site Ops")).toBeInTheDocument();
    expect(screen.getByText(/Email · Gate overspeed/)).toBeInTheDocument();
    expect(screen.getByText("sent")).toBeInTheDocument();
  });

  it("surfaces why a delivery failed", async () => {
    mockResult([
      entry({
        status: "failed",
        failed_reason: "SMTP 550 mailbox unavailable",
        sent_at: null,
      }),
    ]);
    render(<AlertsSentPanel triggerId="violation-1" />);
    await expand();

    expect(screen.getByText("failed")).toBeInTheDocument();
    expect(
      screen.getByText("SMTP 550 mailbox unavailable"),
    ).toBeInTheDocument();
  });

  it("falls back to the raw address when the contact has no label", async () => {
    mockResult([entry({ recipient_label: null })]);
    render(<AlertsSentPanel triggerId="violation-1" />);
    await expand();

    expect(screen.getByText("ops@example.com")).toBeInTheDocument();
  });
});
