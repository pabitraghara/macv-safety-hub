"use client";

import { useState, useMemo, useEffect } from "react";
import { UserPlus, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  useTeamMembers,
  usePendingInvitations,
  useOrgRoles,
  teamApi,
} from "@/api/team";

// ─── Components ───────────────────────────────────────────────────────────────
import { InviteDialog } from "./components/InviteDialog";
import { MemberRow } from "./components/MemberRow";
import { InvitationRow } from "./components/InvitationRow";
import { GroupRow } from "./components/GroupRow";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const {
    members,
    loading: membersLoading,
    updateRole,
    remove,
    refetch: refetchMembers,
  } = useTeamMembers();
  const {
    invitations,
    loading: invitationsLoading,
    revoke,
    refetch: refetchInvitations,
  } = usePendingInvitations();
  const { roles } = useOrgRoles();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(true);

  useEffect(() => {
    teamApi.getInvitations().catch((err) => {
      if (
        err instanceof Error &&
        "status" in err &&
        (err as { status: number }).status === 403
      ) {
        setCanManage(false);
      }
    });
  }, []);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        !search ||
        m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || m.roles.includes(roleFilter);
      return matchesSearch && matchesRole;
    });
  }, [members, search, roleFilter]);

  const filteredInvitations = useMemo(() => {
    return invitations.filter(
      (inv) =>
        !search || inv.email.toLowerCase().includes(search.toLowerCase()),
    );
  }, [invitations, search]);

  const activeMembers = filtered.filter((m) => m.is_active);
  const inactiveMembers = filtered.filter((m) => !m.is_active);
  const loading = membersLoading || invitationsLoading;

  async function handleRemoveConfirm() {
    if (!removingId) return;
    try {
      await remove(removingId);
      toast.success("Member removed from organisation");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove member",
      );
    } finally {
      setRemovingId(null);
    }
  }

  async function handleRevokeConfirm() {
    if (!revokingId) return;
    try {
      await revoke(revokingId);
      toast.success("Invitation revoked");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke invitation",
      );
    } finally {
      setRevokingId(null);
    }
  }

  const displayRoles =
    roles.length > 0
      ? roles
      : [
          { id: "admin", name: "admin" },
          { id: "member", name: "member" },
          { id: "viewer", name: "viewer" },
        ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Team</h1>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            className="h-8 pl-8 text-sm"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 w-28 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {displayRoles.map((r) => (
              <SelectItem key={r.id} value={r.name} className="capitalize">
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              refetchMembers();
              refetchInvitations();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {canManage && (
            <Button
              size="sm"
              className="h-8"
              onClick={() => setInviteOpen(true)}
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Invite
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px] pl-6">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-32">Role</TableHead>
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
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                ) : (
                  <>
                    {/* Active members */}
                    {activeMembers.length > 0 && (
                      <>
                        <GroupRow label="Active" count={activeMembers.length} />
                        {activeMembers.map((member) => (
                          <MemberRow
                            key={member.logto_user_id}
                            member={member}
                            roles={displayRoles}
                            canManage={canManage}
                            onUpdateRole={updateRole}
                            onRemove={setRemovingId}
                          />
                        ))}
                      </>
                    )}

                    {/* Inactive members */}
                    {inactiveMembers.length > 0 && (
                      <>
                        <GroupRow
                          label="Inactive"
                          count={inactiveMembers.length}
                        />
                        {inactiveMembers.map((member) => (
                          <MemberRow
                            key={member.logto_user_id}
                            member={member}
                            roles={displayRoles}
                            canManage={canManage}
                            onUpdateRole={updateRole}
                            onRemove={setRemovingId}
                          />
                        ))}
                      </>
                    )}

                    {/* Pending invitations */}
                    {filteredInvitations.length > 0 && (
                      <>
                        <GroupRow
                          label="Invited"
                          count={filteredInvitations.length}
                        />
                        {filteredInvitations.map((inv) => (
                          <InvitationRow
                            key={inv.id}
                            invitation={inv}
                            canManage={canManage}
                            onRevoke={setRevokingId}
                          />
                        ))}
                      </>
                    )}

                    {/* Empty state */}
                    {filtered.length === 0 &&
                      filteredInvitations.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-muted-foreground py-12 text-center text-sm"
                          >
                            {search
                              ? "No members match your search."
                              : "No members yet."}
                          </TableCell>
                        </TableRow>
                      )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        roles={displayRoles}
        onSuccess={() => {
          refetchInvitations();
          refetchMembers();
        }}
      />

      {/* Remove member confirmation */}
      <AlertDialog
        open={!!removingId}
        onOpenChange={(open) => !open && setRemovingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the member from the organisation. They will lose
              access to all resources immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveConfirm}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke invitation confirmation */}
      <AlertDialog
        open={!!revokingId}
        onOpenChange={(open) => !open && setRevokingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              The invitation link sent to this person will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRevokeConfirm}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
