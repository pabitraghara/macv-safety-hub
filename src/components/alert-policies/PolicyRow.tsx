"use client";

import { Clock, Globe, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AlertPolicy } from "@/api/alert-policies";

export interface PolicyRowProps {
  policy: AlertPolicy;
  siteName: string | null;
  canManage: boolean;
  onEdit: (policy: AlertPolicy) => void;
  onDelete: (policy: AlertPolicy) => void;
  onToggleActive: (policy: AlertPolicy, next: boolean) => void;
}

const ALPR_STATUS_SUMMARIES: Record<string, string> = {
  blacklist: "Blacklisted vehicles",
  whitelist: "Whitelisted vehicles",
  none: "Registered, not listed",
};

function conditionSummary(policy: AlertPolicy): string {
  if (policy.trigger_type === "safety") {
    return policy.match.min_severity
      ? `≥ ${policy.match.min_severity}`
      : "All severities";
  }
  if (policy.trigger_type === "alpr") {
    return policy.match.list_status
      ? (ALPR_STATUS_SUMMARIES[policy.match.list_status] ??
          policy.match.list_status)
      : "All detections";
  }
  return policy.match.min_overspeed != null
    ? `≥ +${policy.match.min_overspeed} km/h`
    : "All violations";
}

export function PolicyRow({
  policy,
  siteName,
  canManage,
  onEdit,
  onDelete,
  onToggleActive,
}: PolicyRowProps) {
  const recipientCount = policy.recipients.length;

  return (
    <TableRow>
      <TableCell className="pl-6 font-medium">{policy.name}</TableCell>
      <TableCell>
        {policy.trigger_type === "safety" ? (
          <Badge variant="secondary">Safety</Badge>
        ) : policy.trigger_type === "alpr" ? (
          <Badge variant="outline">ALPR</Badge>
        ) : (
          <Badge variant="outline">Speed</Badge>
        )}
      </TableCell>
      <TableCell>
        {siteName ? (
          siteName
        ) : (
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            All sites
          </span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {conditionSummary(policy)}
      </TableCell>
      <TableCell>
        {recipientCount === 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                No recipients
              </Badge>
            </TooltipTrigger>
            <TooltipContent>No one will be notified</TooltipContent>
          </Tooltip>
        ) : (
          recipientCount
        )}
      </TableCell>
      <TableCell>
        {policy.schedule ? (
          <Badge variant="outline">
            <Clock className="h-3 w-3" />
            Scheduled
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Always</span>
        )}
      </TableCell>
      <TableCell>
        <Switch
          checked={policy.is_active}
          onCheckedChange={(next) => onToggleActive(policy, next)}
          disabled={!canManage}
        />
      </TableCell>
      <TableCell>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(policy)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(policy)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}
