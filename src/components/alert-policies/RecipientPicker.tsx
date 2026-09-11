"use client";

import { useMemo, useState } from "react";
import { Search, UserPlus, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type {
  AlertTarget,
  AlertTargetType,
  AlertChannel,
} from "@/api/alert-policies";
import type { OrgMember } from "@/api/team/types";
import {
  getInitials,
  getAvatarColor,
} from "@/app/(dashboard)/settings/team/utils";
import { isValidEmail } from "@/lib/email";
import { RecipientRow } from "./RecipientRow";

// ─── Shared draft type ──────────────────────────────────────────────────────
// Local, unsaved representation of a recipient while editing a policy. F4
// (PolicyDialog) owns the `value`/`onChange` state and maps drafts to
// `RecipientInput` on save; see the mapping rules below.
//
// Mapping to RecipientInput (used by PolicyDialog on save):
// - target_id present            -> { target_id, channels }
// - sourceType === "external"    -> { target_type: "external", email, label, phone, channels }
// - sourceType === "member"      -> { target_type: "user", target_ref, label, channels }
export interface RecipientDraft {
  key: string;
  target_id?: string;
  target_type?: AlertTargetType;
  target_ref?: string;
  label?: string;
  email?: string;
  phone?: string;
  channels: AlertChannel[];
  displayName: string;
  sourceType: "contact" | "member" | "external";
}

export interface RecipientPickerProps {
  contacts: AlertTarget[];
  members: OrgMember[];
  value: RecipientDraft[];
  onChange: (next: RecipientDraft[]) => void;
}

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

// Find the contact-book entry that already represents a given member. The
// backend canonicalizes a user-type AlertTarget's `target_ref` to the internal
// user UUID (not the Logto id), so it can't be compared against the member's
// `logto_user_id` directly. Email is the only stable join key available on the
// client, so match on that (case-insensitively) instead.
function findContactForMember(
  contacts: AlertTarget[],
  member: OrgMember,
): AlertTarget | undefined {
  const email = member.email?.trim().toLowerCase();
  if (!email) return undefined;
  return contacts.find(
    (c) => c.target_type === "user" && c.email?.trim().toLowerCase() === email,
  );
}

export function RecipientPicker({
  contacts,
  members,
  value,
  onChange,
}: RecipientPickerProps) {
  const [search, setSearch] = useState("");
  const [addingExternal, setAddingExternal] = useState(false);
  const [extLabel, setExtLabel] = useState("");
  const [extEmail, setExtEmail] = useState("");
  const [extPhone, setExtPhone] = useState("");
  const [extError, setExtError] = useState<string | null>(null);

  const selectedContactIds = useMemo(
    () => new Set(value.filter((r) => r.target_id).map((r) => r.target_id)),
    [value],
  );
  const selectedMemberRefs = useMemo(
    () =>
      new Set(
        value
          .filter((r) => r.sourceType === "member" && r.target_ref)
          .map((r) => r.target_ref),
      ),
    [value],
  );

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts
      .filter((c) => !selectedContactIds.has(c.id))
      .filter(
        (c) =>
          !q ||
          c.label?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [contacts, search, selectedContactIds]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => {
        // Dedupe against a contact already representing this member.
        const matchingContact = findContactForMember(contacts, m);
        if (matchingContact && selectedContactIds.has(matchingContact.id)) {
          return false;
        }
        if (!matchingContact && selectedMemberRefs.has(m.logto_user_id)) {
          return false;
        }
        return true;
      })
      .filter(
        (m) =>
          !q ||
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [members, contacts, search, selectedContactIds, selectedMemberRefs]);

  function addContact(contact: AlertTarget) {
    const displayName = contact.label ?? contact.email ?? "Contact";
    onChange([
      ...value,
      {
        key: newKey(),
        target_id: contact.id,
        label: contact.label ?? undefined,
        displayName,
        channels: ["email"],
        sourceType: "contact",
      },
    ]);
    setSearch("");
  }

  function addMember(member: OrgMember) {
    const displayName = member.name ?? member.email ?? "Member";
    const matchingContact = findContactForMember(contacts, member);
    if (matchingContact) {
      onChange([
        ...value,
        {
          key: newKey(),
          target_id: matchingContact.id,
          label: matchingContact.label ?? undefined,
          displayName: matchingContact.label ?? displayName,
          channels: ["email"],
          sourceType: "contact",
        },
      ]);
    } else {
      onChange([
        ...value,
        {
          key: newKey(),
          target_type: "user",
          target_ref: member.logto_user_id,
          label: member.name ?? undefined,
          displayName,
          channels: ["email"],
          sourceType: "member",
        },
      ]);
    }
    setSearch("");
  }

  function addExternal() {
    const email = extEmail.trim();
    if (!isValidEmail(email)) {
      setExtError("Enter a valid email address.");
      return;
    }
    const label = extLabel.trim() || undefined;
    onChange([
      ...value,
      {
        key: newKey(),
        target_type: "external",
        email,
        label,
        phone: extPhone.trim() || undefined,
        displayName: label ?? email,
        channels: ["email"],
        sourceType: "external",
      },
    ]);
    setExtLabel("");
    setExtEmail("");
    setExtPhone("");
    setExtError(null);
    setAddingExternal(false);
  }

  function updateRecipient(next: RecipientDraft) {
    onChange(value.map((r) => (r.key === next.key ? next : r)));
  }

  function removeRecipient(key: string) {
    onChange(value.filter((r) => r.key !== key));
  }

  const hasCandidates =
    filteredContacts.length > 0 || filteredMembers.length > 0;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs tracking-wide uppercase">
          Add recipients
        </Label>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            className="h-8 pl-8 text-sm"
            placeholder="Search contacts or team members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {search && (
          <div className="max-h-52 overflow-y-auto rounded-lg border">
            {!hasCandidates ? (
              <p className="text-muted-foreground p-3 text-center text-xs">
                No matches found.
              </p>
            ) : (
              <div className="space-y-0.5 p-1">
                {filteredContacts.map((c) => {
                  const displayName = c.label ?? c.email ?? "Contact";
                  return (
                    <button
                      key={`contact-${c.id}`}
                      type="button"
                      className="hover:bg-muted flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors"
                      onClick={() => addContact(c)}
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback
                          className="text-xs text-white"
                          style={{ backgroundColor: getAvatarColor(c.id) }}
                        >
                          {getInitials(c.label, c.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm leading-none font-medium">
                          {displayName}
                        </p>
                        {c.email && (
                          <p className="text-muted-foreground mt-0.5 truncate text-xs">
                            {c.email}
                          </p>
                        )}
                      </div>
                      <span className="text-muted-foreground shrink-0 text-[10px] tracking-wide uppercase">
                        Contact
                      </span>
                    </button>
                  );
                })}
                {filteredMembers.map((m) => (
                  <button
                    key={`member-${m.logto_user_id}`}
                    type="button"
                    className="hover:bg-muted flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors"
                    onClick={() => addMember(m)}
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback
                        className="text-xs text-white"
                        style={{
                          backgroundColor: getAvatarColor(m.logto_user_id),
                        }}
                      >
                        {getInitials(m.name, m.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm leading-none font-medium">
                        {m.name ?? m.email}
                      </p>
                      {m.name && m.email && (
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                          {m.email}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground shrink-0 text-[10px] tracking-wide uppercase">
                      Team
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!addingExternal ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setAddingExternal(true)}
        >
          <UserPlus className="h-3.5 w-3.5" />
          New external contact
        </Button>
      ) : (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Globe className="h-3.5 w-3.5" />
            New external contact
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              className="h-8 text-sm"
              placeholder="Name"
              value={extLabel}
              onChange={(e) => setExtLabel(e.target.value)}
            />
            <Input
              className="h-8 text-sm"
              placeholder="Email *"
              type="email"
              value={extEmail}
              onChange={(e) => {
                setExtEmail(e.target.value);
                setExtError(null);
              }}
            />
          </div>
          <Input
            className="h-8 text-sm"
            placeholder="Phone (WhatsApp)"
            value={extPhone}
            onChange={(e) => setExtPhone(e.target.value)}
          />
          {extError && <p className="text-destructive text-xs">{extError}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() => {
                setAddingExternal(false);
                setExtError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7"
              onClick={addExternal}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {value.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {value.map((recipient) => (
            <RecipientRow
              key={recipient.key}
              recipient={recipient}
              onChange={updateRecipient}
              onRemove={() => removeRecipient(recipient.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
