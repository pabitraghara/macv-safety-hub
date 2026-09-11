"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  User,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useContacts, usePolicies } from "@/api/alert-policies";
import type {
  AlertTarget,
  AlertTargetType,
  CreateContactRequest,
  UpdateContactRequest,
} from "@/api/alert-policies";
import { teamApi } from "@/api/team/api";
import type { OrgMember } from "@/api/team/types";
import {
  getInitials,
  getAvatarColor,
} from "@/app/(dashboard)/settings/team/utils";
import { isValidEmail } from "@/lib/email";

export interface ContactBookProps {
  canManage: boolean;
}

// ─── Create/Edit contact dialog ────────────────────────────────────────────

function ContactDialog({
  open,
  contact,
  onClose,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  contact: AlertTarget | null;
  onClose: () => void;
  onCreate: (data: CreateContactRequest) => Promise<AlertTarget>;
  onUpdate: (id: string, data: UpdateContactRequest) => Promise<AlertTarget>;
}) {
  const isEditing = !!contact;
  const [targetType, setTargetType] = useState<AlertTargetType>("user");
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || isEditing) return;
    setMembersLoading(true);
    teamApi
      .getMembers()
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, [open, isEditing]);

  useEffect(() => {
    if (!open) return;
    setEmailError(null);
    if (contact) {
      setTargetType(contact.target_type);
      setLabel(contact.label ?? "");
      setEmail(contact.email ?? "");
      setPhone(contact.phone ?? "");
    } else {
      setTargetType("user");
      setSelectedMember(null);
      setMemberSearch("");
      setLabel("");
      setEmail("");
      setPhone("");
    }
  }, [contact, open]);

  const filteredMembers = memberSearch
    ? members.filter((m) => {
        const q = memberSearch.toLowerCase();
        return (
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q)
        );
      })
    : members;

  function canSave(): boolean {
    if (isEditing) {
      if (contact?.target_type === "external") {
        return email.trim().length > 0;
      }
      return true;
    }
    if (targetType === "user") return selectedMember !== null;
    return email.trim().length > 0;
  }

  const isExternal =
    (isEditing && contact?.target_type === "external") ||
    (!isEditing && targetType === "external");

  async function handleSave() {
    if (!canSave()) return;
    // The backend's AlertTarget email field has no format validation, so guard
    // malformed external emails here (a non-empty check alone would persist an
    // undeliverable address). Mirrors RecipientPicker's inline external form.
    if (isExternal && !isValidEmail(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setSaving(true);
    try {
      if (isEditing && contact) {
        if (contact.target_type === "external") {
          await onUpdate(contact.id, {
            label: label.trim() || undefined,
            email: email.trim(),
            phone: phone.trim() || undefined,
          });
        } else {
          // User contacts resolve email/phone live from the profile; sending
          // them 400s, so only label can change.
          await onUpdate(contact.id, { label: label.trim() || undefined });
        }
        toast.success("Contact updated");
      } else if (targetType === "user" && selectedMember) {
        await onCreate({
          target_type: "user",
          target_ref: selectedMember.logto_user_id,
          label: selectedMember.name ?? undefined,
        });
        toast.success("Contact added");
      } else {
        await onCreate({
          target_type: "external",
          label: label.trim() || undefined,
          email: email.trim(),
          phone: phone.trim() || undefined,
        });
        toast.success("Contact added");
      }
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save contact",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit contact" : "New contact"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this contact's details."
              : "Add a team member or an external contact to the org's contact book."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {!isEditing && (
            <div className="bg-muted flex rounded-lg p-1">
              {(["user", "external"] as AlertTargetType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTargetType(t)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                    targetType === t
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "user" ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Globe className="h-3.5 w-3.5" />
                  )}
                  {t === "user" ? "Team member" : "External contact"}
                </button>
              ))}
            </div>
          )}

          {((isEditing && contact?.target_type === "user") ||
            (!isEditing && targetType === "user")) && (
            <>
              {isEditing ? (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs tracking-wide uppercase">
                    User
                  </Label>
                  <div className="bg-muted/40 flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback
                        className="text-xs text-white"
                        style={{
                          backgroundColor: getAvatarColor(
                            contact?.target_ref ?? "",
                          ),
                        }}
                      >
                        {getInitials(
                          contact?.label ?? null,
                          contact?.email ?? null,
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {contact?.label ?? "—"}
                      </p>
                      {contact?.email && (
                        <p className="text-muted-foreground truncate text-xs">
                          {contact.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Resolved from the member&apos;s profile.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs tracking-wide uppercase">
                    Select member
                  </Label>
                  <Input
                    placeholder="Search by name or email…"
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setSelectedMember(null);
                    }}
                  />
                  <div className="max-h-52 overflow-y-auto rounded-lg border">
                    {membersLoading ? (
                      <div className="space-y-1 p-1">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 px-2 py-1.5"
                          >
                            <Skeleton className="h-7 w-7 rounded-full" />
                            <div className="flex-1 space-y-1">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-2.5 w-32" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <p className="text-muted-foreground p-3 text-center text-xs">
                        No members found.
                      </p>
                    ) : (
                      <div className="p-1">
                        {filteredMembers.map((m) => {
                          const isSelected =
                            selectedMember?.logto_user_id === m.logto_user_id;
                          return (
                            <button
                              key={m.logto_user_id}
                              type="button"
                              className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                                isSelected
                                  ? "bg-primary/10 text-primary"
                                  : "hover:bg-muted"
                              }`}
                              onClick={() => {
                                setSelectedMember(m);
                                setMemberSearch(
                                  m.name || m.email || m.logto_user_id,
                                );
                              }}
                            >
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarFallback
                                  className="text-xs text-white"
                                  style={{
                                    backgroundColor: getAvatarColor(
                                      m.logto_user_id,
                                    ),
                                  }}
                                >
                                  {getInitials(m.name, m.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm leading-none font-medium">
                                  {m.name ?? m.email}
                                </p>
                                {m.name && m.email && (
                                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                                    {m.email}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {((isEditing && contact?.target_type === "external") ||
            (!isEditing && targetType === "external")) && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="contact-email"
                  className="text-muted-foreground text-xs tracking-wide uppercase"
                >
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="alerts@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(null);
                  }}
                />
                {emailError && (
                  <p className="text-destructive text-xs">{emailError}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="contact-label"
                  className="text-muted-foreground text-xs tracking-wide uppercase"
                >
                  Name
                </Label>
                <Input
                  id="contact-label"
                  placeholder="e.g. Safety Team"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="contact-phone"
                  className="text-muted-foreground text-xs tracking-wide uppercase"
                >
                  Phone{" "}
                  <span className="text-muted-foreground font-normal normal-case">
                    (WhatsApp)
                  </span>
                </Label>
                <Input
                  id="contact-phone"
                  placeholder="+1 555 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave() || saving}>
            {saving ? "Saving…" : isEditing ? "Save changes" : "Add contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Contact table row ──────────────────────────────────────────────────────

function ContactTableRow({
  contact,
  usageCount,
  canManage,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  contact: AlertTarget;
  usageCount: number;
  canManage: boolean;
  onEdit: (contact: AlertTarget) => void;
  onDelete: (contact: AlertTarget) => void;
  onToggleActive: (contact: AlertTarget, next: boolean) => void;
}) {
  const isUser = contact.target_type === "user";
  const displayName = contact.label ?? contact.email ?? "Unknown";

  return (
    <TableRow>
      <TableCell className="pl-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback
              className="text-xs text-white"
              style={{
                backgroundColor: getAvatarColor(
                  contact.target_ref ?? contact.id,
                ),
              }}
            >
              {getInitials(contact.label, contact.email)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium">{displayName}</span>
        </div>
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center gap-1 text-xs ${
            isUser ? "text-blue-600" : "text-muted-foreground"
          }`}
        >
          {isUser ? (
            <User className="h-3 w-3" />
          ) : (
            <Globe className="h-3 w-3" />
          )}
          {isUser ? "Team member" : "External"}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {contact.email ?? "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {contact.phone ?? "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {usageCount > 0 ? usageCount : "—"}
      </TableCell>
      <TableCell>
        <Switch
          checked={contact.is_active}
          onCheckedChange={(v) => onToggleActive(contact, v)}
          disabled={!canManage}
        />
      </TableCell>
      <TableCell className="w-8">
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(contact)}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(contact)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}

// ─── ContactBook ────────────────────────────────────────────────────────────

export function ContactBook({ canManage }: ContactBookProps) {
  const {
    contacts,
    loading,
    error,
    createContact,
    updateContact,
    deleteContact,
  } = useContacts();
  const { policies } = usePolicies();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<AlertTarget | null>(
    null,
  );
  const [deletingContact, setDeletingContact] = useState<AlertTarget | null>(
    null,
  );

  function usageCount(contact: AlertTarget): number {
    return policies.filter((p) =>
      p.recipients.some((r) => r.target_id === contact.id),
    ).length;
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.label?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q),
    );
  }, [contacts, search]);

  function openCreate() {
    setEditingContact(null);
    setDialogOpen(true);
  }

  function openEdit(contact: AlertTarget) {
    setEditingContact(contact);
    setDialogOpen(true);
  }

  async function handleToggleActive(contact: AlertTarget, next: boolean) {
    try {
      await updateContact(contact.id, { is_active: next });
      toast.success("Contact updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update contact",
      );
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingContact) return;
    try {
      await deleteContact(deletingContact.id);
      toast.success("Contact removed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove contact",
      );
    } finally {
      setDeletingContact(null);
    }
  }

  const deletingUsage = deletingContact ? usageCount(deletingContact) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            className="h-8 pl-8 text-sm"
            placeholder="Search contacts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canManage && (
          <Button size="sm" className="ml-auto h-8" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New contact
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px] pl-6">Name</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-36">Phone</TableHead>
                  <TableHead className="w-20">Used in</TableHead>
                  <TableHead className="w-16">Active</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-destructive py-8 text-center text-sm"
                    >
                      {error}
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-muted-foreground py-12 text-center text-sm"
                    >
                      {search
                        ? "No contacts match your search."
                        : "No contacts yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((contact) => (
                    <ContactTableRow
                      key={contact.id}
                      contact={contact}
                      usageCount={usageCount(contact)}
                      canManage={canManage}
                      onEdit={openEdit}
                      onDelete={setDeletingContact}
                      onToggleActive={handleToggleActive}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ContactDialog
        open={dialogOpen}
        contact={editingContact}
        onClose={() => {
          setDialogOpen(false);
          setEditingContact(null);
        }}
        onCreate={createContact}
        onUpdate={updateContact}
      />

      <AlertDialog
        open={!!deletingContact}
        onOpenChange={(open) => !open && setDeletingContact(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove contact?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUsage > 0
                ? `This contact is used in ${deletingUsage} alert${
                    deletingUsage === 1 ? "" : "s"
                  } and will be removed from them.`
                : "This contact isn't used in any alert."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
