import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PolicyDialog } from "../PolicyDialog";
import { alertPoliciesApi } from "@/api/alert-policies";
import type { AlertPolicy, AlertTarget } from "@/api/alert-policies";
import type { Site } from "@/api/sites/types";

const janeContact: AlertTarget = {
  id: "contact-jane",
  org_id: "org-1",
  site_id: null,
  target_type: "user",
  target_ref: "internal-uuid-jane",
  label: "Jane Doe",
  email: "jane@example.com",
  phone: null,
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  is_deleted: false,
};

vi.mock("@/api/alert-policies", async () => {
  const actual = await vi.importActual<typeof import("@/api/alert-policies")>(
    "@/api/alert-policies",
  );
  return {
    ...actual,
    useContacts: () => ({
      contacts: [
        {
          id: "contact-jane",
          org_id: "org-1",
          site_id: null,
          target_type: "user",
          target_ref: "internal-uuid-jane",
          label: "Jane Doe",
          email: "jane@example.com",
          phone: null,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          is_deleted: false,
        },
      ],
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
  vi.clearAllMocks();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const sites: Site[] = [];

const emptyPolicy: AlertPolicy = {
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

describe("PolicyDialog - reconcileRecipients", () => {
  it("adds an existing contact picked while editing a policy with no prior recipients", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <PolicyDialog
        open={true}
        policy={emptyPolicy}
        sites={sites}
        availableTriggers={["safety", "speed_violation"]}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Next: recipients" }));
    await screen.findByText("Choose who gets notified.");

    await user.type(
      screen.getByPlaceholderText("Search contacts or team members…"),
      "jane",
    );
    await user.click(await screen.findByText("Jane Doe"));

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(alertPoliciesApi.addRecipients).toHaveBeenCalledWith("p1", [
        { target_id: janeContact.id, channels: ["email"] },
      ]),
    );
    expect(onSaved).toHaveBeenCalled();
  });
});
