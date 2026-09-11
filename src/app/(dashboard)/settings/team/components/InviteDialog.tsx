import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { teamApi } from "@/api/team";
import type { OrgRole } from "@/api/team";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roles: OrgRole[];
  onSuccess: () => void;
}

export function InviteDialog({
  open,
  onOpenChange,
  roles,
  onSuccess,
}: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  const displayRoles =
    roles.length > 0
      ? roles
      : [
          { id: "admin", name: "admin" },
          { id: "member", name: "member" },
          { id: "viewer", name: "viewer" },
        ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !role) return;
    try {
      setLoading(true);
      await teamApi.inviteUser({ email, role });
      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      setRole("");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send invitation",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            Send an invitation email. The recipient will be prompted to sign in
            and join your organisation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={loading}>
              <SelectTrigger id="invite-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {displayRoles.map((r) => (
                  <SelectItem key={r.id} value={r.name}>
                    <span className="capitalize">{r.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={loading || !email || !role}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {loading ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
