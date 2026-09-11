import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactBook } from "../ContactBook";

const createContact = vi.fn().mockResolvedValue({});

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
      createContact,
      updateContact: vi.fn(),
      deleteContact: vi.fn(),
    }),
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

vi.mock("@/api/team/api", () => ({
  teamApi: {
    getMembers: vi.fn().mockResolvedValue([]),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ContactBook - external contact email validation", () => {
  it("blocks saving an external contact with a malformed email", async () => {
    const user = userEvent.setup();
    render(<ContactBook canManage={true} />);

    await user.click(screen.getByRole("button", { name: /new contact/i }));
    await user.click(screen.getByRole("button", { name: /external contact/i }));

    await user.type(
      screen.getByPlaceholderText("alerts@example.com"),
      "not-an-email",
    );
    await user.click(screen.getByRole("button", { name: "Add contact" }));

    expect(
      screen.getByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(createContact).not.toHaveBeenCalled();
  });

  it("accepts a well-formed external email", async () => {
    const user = userEvent.setup();
    render(<ContactBook canManage={true} />);

    await user.click(screen.getByRole("button", { name: /new contact/i }));
    await user.click(screen.getByRole("button", { name: /external contact/i }));

    await user.type(
      screen.getByPlaceholderText("alerts@example.com"),
      "alerts@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Add contact" }));

    expect(createContact).toHaveBeenCalledWith({
      target_type: "external",
      label: undefined,
      email: "alerts@example.com",
      phone: undefined,
    });
  });
});
