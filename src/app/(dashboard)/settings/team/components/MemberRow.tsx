import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { OrgMember, OrgRole } from "@/api/team";
import { getInitials, getAvatarColor } from "../utils";

interface MemberRowProps {
  member: OrgMember;
  roles: OrgRole[];
  canManage: boolean;
  onUpdateRole: (id: string, role: string) => Promise<void>;
  onRemove: (id: string) => void;
}

export function MemberRow({
  member,
  roles,
  canManage,
  onUpdateRole,
  onRemove,
}: MemberRowProps) {
  const [updating, setUpdating] = useState(false);
  const initials = getInitials(member.name, member.email);
  const currentRole = member.roles[0] ?? "";
  const avatarColor =
    member.avatar_color || getAvatarColor(member.logto_user_id);

  const displayRoles =
    roles.length > 0
      ? roles
      : [
          { id: "admin", name: "admin" },
          { id: "member", name: "member" },
          { id: "viewer", name: "viewer" },
        ];

  async function handleRoleChange(newRole: string) {
    if (newRole === currentRole) return;
    try {
      setUpdating(true);
      await onUpdateRole(member.logto_user_id, newRole);
      toast.success(`Role updated to '${newRole}'`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <TableRow className={!member.is_active ? "opacity-60" : undefined}>
      <TableCell className="pl-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            {member.avatar_url && (
              <AvatarImage src={member.avatar_url} alt={initials} />
            )}
            <AvatarFallback
              className="text-xs text-white"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[180px] truncate text-sm font-medium">
            {member.name ?? member.email ?? "Unknown"}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {member.email ?? "—"}
      </TableCell>
      <TableCell>
        <Badge
          variant={member.is_active ? "default" : "secondary"}
          className="text-xs font-normal"
        >
          {member.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        {canManage ? (
          <Select
            value={currentRole}
            onValueChange={handleRoleChange}
            disabled={updating}
          >
            <SelectTrigger className="hover:bg-muted h-7 w-28 border-0 px-2 text-xs shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {displayRoles.map((r) => (
                <SelectItem key={r.id} value={r.name} className="text-xs">
                  <span className="capitalize">{r.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-muted-foreground text-sm capitalize">
            {currentRole || "—"}
          </span>
        )}
      </TableCell>
      <TableCell className="w-8">
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Change role</DropdownMenuLabel>
              {displayRoles
                .filter((r) => r.name !== currentRole)
                .map((r) => (
                  <DropdownMenuItem
                    key={r.id}
                    onClick={() => handleRoleChange(r.name)}
                  >
                    Make <span className="ml-1 capitalize">{r.name}</span>
                  </DropdownMenuItem>
                ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onRemove(member.logto_user_id)}
              >
                Remove from org
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}
