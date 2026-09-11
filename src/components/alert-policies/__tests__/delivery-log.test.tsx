import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeliveryLog } from "../DeliveryLog";
import type { DeliveryLogEntry } from "@/api/notification-logs";

const useDeliveryLog = vi.fn();
const useDeliverySummary = vi.fn();

vi.mock("@/api/notification-logs", async () => {
  const actual = await vi.importActual<
    typeof import("@/api/notification-logs")
  >("@/api/notification-logs");
  return {
    ...actual,
    useDeliveryLog: (f: unknown) => useDeliveryLog(f),
    useDeliverySummary: (f: unknown) => useDeliverySummary(f),
  };
});

vi.mock("@/api/alert-policies", async () => {
  const actual = await vi.importActual<typeof import("@/api/alert-policies")>(
    "@/api/alert-policies",
  );
  return {
    ...actual,
    usePolicies: () => ({
      policies: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      createPolicy: vi.fn(),
      updatePolicy: vi.fn(),
      deletePolicy: vi.fn(),
      addRecipients: vi.fn(),
      updateRecipient: vi.fn(),
      deleteRecipient: vi.fn(),
    }),
  };
});

const ROW: DeliveryLogEntry = {
  id: "log-1",
  source: "alert_policy",
  trigger_type: "speed_violation",
  trigger_id: "violation-1",
  channel: "whatsapp",
  sent_to: "+96890000000",
  status: "suppressed",
  failed_reason: null,
  sent_at: null,
  policy_id: "policy-1",
  policy_name: "Gate overspeed",
  recipient_id: "recipient-1",
  recipient_label: "Site Ops",
  trigger_summary: "D 12345 — 68 km/h",
  created_at: "2026-08-29T10:00:00Z",
  updated_at: "2026-08-29T10:00:00Z",
  is_deleted: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom has no pointer capture; Radix Select needs these to open.
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  useDeliveryLog.mockReturnValue({
    items: [ROW],
    pagination: {
      total_items: 1,
      page_size: 25,
      current_page: 1,
      total_pages: 1,
      has_next: false,
      has_previous: false,
    },
    loading: false,
    error: null,
    initialized: true,
    refetch: vi.fn(),
  });
  useDeliverySummary.mockReturnValue({
    summary: { sent: 12, failed: 3, suppressed: 4, queued: 0 },
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
});

describe("DeliveryLog", () => {
  it("renders the status tallies for the range", () => {
    render(<DeliveryLog />);

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Suppressed")).toBeInTheDocument();
  });

  it("shows the recipient, trigger and human channel label of a delivery", () => {
    render(<DeliveryLog />);

    expect(screen.getByText("Site Ops")).toBeInTheDocument();
    expect(screen.getByText("+96890000000")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("D 12345 — 68 km/h")).toBeInTheDocument();
    expect(screen.getByText("suppressed")).toBeInTheDocument();
  });

  it("defaults to the last 7 days and sends the same range to the summary", () => {
    render(<DeliveryLog />);

    const filters = useDeliveryLog.mock.calls.at(-1)?.[0];
    expect(filters.page).toBe(1);
    expect(filters.page_size).toBe(25);
    expect(filters.start_date).toBeTruthy();
    expect(useDeliverySummary.mock.calls.at(-1)?.[0].start_date).toBe(
      filters.start_date,
    );
  });

  it("drops the start date when the range is set to all time", async () => {
    const user = userEvent.setup();
    render(<DeliveryLog />);

    const rangeTrigger = screen
      .getAllByRole("combobox")
      .find((el) => el.textContent === "Last 7 days")!;
    await user.click(rangeTrigger);
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("All time"));

    await waitFor(() => {
      expect(useDeliveryLog.mock.calls.at(-1)?.[0].start_date).toBeUndefined();
    });
  });

  it("passes the chosen status through as a filter", async () => {
    const user = userEvent.setup();
    render(<DeliveryLog />);

    const statusTrigger = screen
      .getAllByRole("combobox")
      .find((el) => el.textContent === "Any status")!;
    await user.click(statusTrigger);
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Failed"));

    await waitFor(() => {
      expect(useDeliveryLog.mock.calls.at(-1)?.[0].status).toBe("failed");
    });
  });

  it("tells the user where to look when the range has no deliveries", () => {
    useDeliveryLog.mockReturnValue({
      items: [],
      pagination: {
        total_items: 0,
        page_size: 25,
        current_page: 1,
        total_pages: 0,
        has_next: false,
        has_previous: false,
      },
      loading: false,
      error: null,
      initialized: true,
      refetch: vi.fn(),
    });
    render(<DeliveryLog />);

    expect(screen.getByText("No deliveries")).toBeInTheDocument();
  });
});
