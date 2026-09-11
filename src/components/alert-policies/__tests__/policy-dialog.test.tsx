import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PolicyDialog } from "../PolicyDialog";
import type { AlertPolicy } from "@/api/alert-policies";
import type { Site } from "@/api/sites/types";

vi.mock("@/api/alert-policies", async () => {
  const actual = await vi.importActual<typeof import("@/api/alert-policies")>(
    "@/api/alert-policies",
  );
  return {
    ...actual,
    useContacts: () => ({
      contacts: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      deleteContact: vi.fn(),
    }),
    alertPoliciesApi: {
      createPolicy: vi.fn().mockResolvedValue({}),
      updatePolicy: vi.fn().mockResolvedValue({}),
      addRecipients: vi.fn().mockResolvedValue([]),
      updateRecipient: vi.fn().mockResolvedValue({}),
      deleteRecipient: vi.fn().mockResolvedValue(undefined),
      deletePolicy: vi.fn().mockResolvedValue(undefined),
      listPolicies: vi.fn().mockResolvedValue([]),
      listContacts: vi.fn().mockResolvedValue([]),
      createContact: vi.fn().mockResolvedValue({}),
      updateContact: vi.fn().mockResolvedValue({}),
      deleteContact: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock("@/api/team/api", () => ({
  teamApi: {
    getMembers: vi.fn().mockResolvedValue([]),
  },
}));

beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const sites: Site[] = [
  {
    id: "site-1",
    code: "S1",
    name: "Site One",
    city: "City",
    timezone: "UTC",
    is_active: true,
    org_id: "org-1",
  } as Site,
];

const basePolicy: AlertPolicy = {
  id: "p1",
  org_id: "org-1",
  site_id: null,
  name: "Existing policy",
  trigger_type: "safety",
  match: {},
  schedule: null,
  cooldown_seconds: null,
  is_active: true,
  created_by: null,
  recipients: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  is_deleted: false,
};

describe("PolicyDialog - create mode step flow", () => {
  it("shows Name + trigger fields on step 1", async () => {
    render(
      <PolicyDialog
        open={true}
        policy={null}
        sites={sites}
        availableTriggers={["safety", "speed_violation"]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByText("Trigger")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Next: recipients" }),
    ).toBeInTheDocument();
    // Flush the pending teamApi.getMembers() promise so React state settles
    // before the test ends (avoids an act() warning from the async effect).
    await act(async () => {});
  });

  it("advances to the recipients step after entering a name and clicking Next", async () => {
    const user = userEvent.setup();
    render(
      <PolicyDialog
        open={true}
        policy={null}
        sites={sites}
        availableTriggers={["safety", "speed_violation"]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Name"), "My new alert");
    await user.click(screen.getByRole("button", { name: "Next: recipients" }));

    expect(
      await screen.findByText("Choose who gets notified."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create alert" }),
    ).toBeInTheDocument();
  });

  it("does not advance when name is empty", async () => {
    const user = userEvent.setup();
    render(
      <PolicyDialog
        open={true}
        policy={null}
        sites={sites}
        availableTriggers={["safety", "speed_violation"]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Next: recipients" }));

    expect(
      screen.getByText("Define the condition that triggers this alert."),
    ).toBeInTheDocument();
    expect(screen.getByText("Name is required.")).toBeInTheDocument();
  });

  it("blocks advancing when a schedule window has no days selected", async () => {
    const user = userEvent.setup();
    render(
      <PolicyDialog
        open={true}
        policy={null}
        sites={sites}
        availableTriggers={["safety", "speed_violation"]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Name"), "Scheduled alert");
    // Enable the schedule, then add a window (defaults to days: []).
    await user.click(screen.getByLabelText("Restrict to a schedule"));
    await user.click(screen.getByRole("button", { name: /add window/i }));

    await user.click(screen.getByRole("button", { name: "Next: recipients" }));

    // Still on the rule step, with the blocking error surfaced.
    expect(
      screen.getByText("Define the condition that triggers this alert."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Every schedule window needs at least one day selected.",
      ),
    ).toBeInTheDocument();
  });

  it("'Back' returns from recipients step to rule step", async () => {
    const user = userEvent.setup();
    render(
      <PolicyDialog
        open={true}
        policy={null}
        sites={sites}
        availableTriggers={["safety", "speed_violation"]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Name"), "My new alert");
    await user.click(screen.getByRole("button", { name: "Next: recipients" }));
    await screen.findByText("Choose who gets notified.");

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(
      screen.getByText("Define the condition that triggers this alert."),
    ).toBeInTheDocument();
  });
});

describe("PolicyDialog - edit mode", () => {
  it("disables the trigger Select when policy is non-null", async () => {
    render(
      <PolicyDialog
        open={true}
        policy={basePolicy}
        sites={sites}
        availableTriggers={["safety", "speed_violation"]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    const comboboxes = screen.getAllByRole("combobox");
    // Trigger select is the first combobox rendered in step 1 (Trigger field
    // follows Name; Site select follows Trigger).
    const triggerSelect = comboboxes[0];
    expect(triggerSelect).toHaveAttribute("data-disabled");
    await act(async () => {});
  });
});
