"use client";

import { Mail, MessageSquare, Trash2, User, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AlertChannel } from "@/api/alert-policies";
import {
  getInitials,
  getAvatarColor,
} from "@/app/(dashboard)/settings/team/utils";
import type { RecipientDraft } from "./RecipientPicker";

export interface RecipientRowProps {
  recipient: RecipientDraft;
  onChange: (next: RecipientDraft) => void;
  onRemove: () => void;
}

function toggleChannel(
  channels: AlertChannel[],
  channel: AlertChannel,
): AlertChannel[] {
  return channels.includes(channel)
    ? channels.filter((c) => c !== channel)
    : [...channels, channel];
}

export function RecipientRow({
  recipient,
  onChange,
  onRemove,
}: RecipientRowProps) {
  const isExternal = recipient.sourceType === "external";
  const avatarSeed =
    recipient.target_id ??
    recipient.target_ref ??
    recipient.email ??
    recipient.key;
  // getInitials prefers a name over an email; displayName is a name unless it
  // literally is the email (i.e. no separate label was set).
  const nameForInitials =
    recipient.displayName !== recipient.email ? recipient.displayName : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className="text-xs text-white"
          style={{ backgroundColor: getAvatarColor(avatarSeed) }}
        >
          {getInitials(nameForInitials, recipient.email ?? null)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm leading-none font-medium">
            {recipient.displayName}
          </p>
          <span
            className={`inline-flex shrink-0 items-center gap-0.5 text-[10px] tracking-wide uppercase ${
              isExternal ? "text-muted-foreground" : "text-blue-600"
            }`}
          >
            {isExternal ? (
              <Globe className="h-2.5 w-2.5" />
            ) : (
              <User className="h-2.5 w-2.5" />
            )}
            {isExternal ? "External" : "Team"}
          </span>
        </div>
        {recipient.channels.length === 0 && (
          <p className="text-destructive mt-0.5 text-xs">
            Select at least one channel.
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <label className="flex cursor-pointer items-center gap-1.5">
          <Checkbox
            checked={recipient.channels.includes("email")}
            onCheckedChange={() =>
              onChange({
                ...recipient,
                channels: toggleChannel(recipient.channels, "email"),
              })
            }
          />
          <Mail className="text-muted-foreground h-3.5 w-3.5" />
        </label>
        <label className="flex cursor-pointer items-center gap-1.5">
          <Checkbox
            checked={recipient.channels.includes("whatsapp")}
            onCheckedChange={() =>
              onChange({
                ...recipient,
                channels: toggleChannel(recipient.channels, "whatsapp"),
              })
            }
          />
          <MessageSquare className="text-muted-foreground h-3.5 w-3.5" />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive h-7 w-7"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
