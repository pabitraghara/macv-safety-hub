import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { MailX, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { PendingInvitation } from "@/api/team";
import { getInitials, getAvatarColor } from "../utils";

interface InvitationRowProps {
  invitation: PendingInvitation;
  canManage: boolean;
  onRevoke: (id: string) => void;
}

export function InvitationRow({
  invitation,
  canManage,
  onRevoke,
}: InvitationRowProps) {
  const initials = getInitials(null, invitation.email);
  const expiresAt = new Date(invitation.expires_at);
  const isExpired = expiresAt < new Date();
  const roleLabel = invitation.roles[0] ?? "member";
  const avatarColor = getAvatarColor(invitation.id);

  return (
    <TableRow className="opacity-70">
      <TableCell className="pl-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback
              className="text-xs text-white"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="text-muted-foreground text-sm">
              {invitation.email}
            </span>
            <p className="text-muted-foreground/60 text-xs">
              {isExpired
                ? "Expired"
                : `Expires ${formatDistanceToNow(expiresAt, { addSuffix: true })}`}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {invitation.email}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs font-normal">
          Invited
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground text-sm capitalize">
          {roleLabel}
        </span>
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
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onRevoke(invitation.id)}
              >
                <MailX className="mr-2 h-3.5 w-3.5" />
                Revoke invitation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}
