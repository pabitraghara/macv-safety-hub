import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecipientPicker, type RecipientDraft } from "../RecipientPicker";
import type { AlertTarget } from "@/api/alert-policies";
import type { OrgMember } from "@/api/team/types";

function ControlledRecipientPicker({
  contacts,
  members,
  initial,
  onChange,
}: {
  contacts: AlertTarget[];
  members: OrgMember[];
  initial: RecipientDraft[];
  onChange: (next: RecipientDraft[]) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <RecipientPicker
      contacts={contacts}
      members={members}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("RecipientPicker / RecipientRow - channel validation", () => {
  it("renders 'Select at least one channel.' for a recipient with channels: []", () => {
    const draft: RecipientDraft = {
      key: "k1",
      target_id: "t1",
      displayName: "Jane Doe",
      channels: [],
      sourceType: "contact",
    };
    render(
      <ControlledRecipientPicker
        contacts={[]}
        members={[]}
        initial={[draft]}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Select at least one channel."),
    ).toBeInTheDocument();
  });

  it("toggling a channel checkbox emits an updated draft with channels: ['email']", () => {
    const draft: RecipientDraft = {
      key: "k1",
      target_id: "t1",
      displayName: "Jane Doe",
      channels: [],
      sourceType: "contact",
    };
    const onChange = vi.fn();
    render(
      <ControlledRecipientPicker
        contacts={[]}
        members={[]}
        initial={[draft]}
        onChange={onChange}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    // First checkbox is email (per RecipientRow markup order).
    fireEvent.click(checkboxes[0]);

    expect(onChange).toHaveBeenLastCalledWith([
      { ...draft, channels: ["email"] },
    ]);
  });
});

describe("RecipientPicker - member/contact de-duplication", () => {
  const userContact: AlertTarget = {
    id: "contact-jane",
    org_id: "org1",
    site_id: null,
    target_type: "user",
    // Backend canonicalizes target_ref to the internal user UUID, NOT the
    // Logto id — so it will never equal the member's logto_user_id.
    target_ref: "internal-uuid-jane",
    label: "Jane Doe",
    email: "jane@example.com",
    phone: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    is_deleted: false,
  };

  const janeMember: OrgMember = {
    logto_user_id: "logto-jane",
    email: "jane@example.com",
    name: "Jane Doe",
    avatar_url: null,
    avatar_color: null,
    is_active: true,
    roles: [],
  };

  it("does not surface a member as a Team result once its matching contact is selected", async () => {
    const user = userEvent.setup();
    const draft: RecipientDraft = {
      key: "k1",
      target_id: userContact.id,
      displayName: "Jane Doe",
      channels: ["email"],
      sourceType: "contact",
    };

    render(
      <ControlledRecipientPicker
        contacts={[userContact]}
        members={[janeMember]}
        initial={[draft]}
        onChange={vi.fn()}
      />,
    );

    await user.type(
      screen.getByPlaceholderText("Search contacts or team members…"),
      "jane",
    );

    // The contact is already selected, so the member must dedupe against it
    // (by email, since target_ref is the internal UUID) and NOT reappear as a
    // separate Team search result — leaving the dropdown empty.
    expect(screen.getByText("No matches found.")).toBeInTheDocument();
  });
});

describe("RecipientPicker - new external contact", () => {
  it("appends a draft { sourceType: 'external', channels: ['email'] } via the mini-form", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ControlledRecipientPicker
        contacts={[]}
        members={[]}
        initial={[]}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /new external contact/i }),
    );

    await user.type(screen.getByPlaceholderText("Name"), "Sam External");
    await user.type(screen.getByPlaceholderText("Email *"), "sam@example.com");

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const [added] = onChange.mock.calls[0][0];
    expect(added).toMatchObject({
      sourceType: "external",
      channels: ["email"],
      email: "sam@example.com",
      label: "Sam External",
      displayName: "Sam External",
    });
  });

  it("rejects an invalid email and does not add a recipient", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ControlledRecipientPicker
        contacts={[]}
        members={[]}
        initial={[]}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /new external contact/i }),
    );
    await user.type(screen.getByPlaceholderText("Email *"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByText("Enter a valid email address."),
    ).toBeInTheDocument();
  });
});
