"use client";

import { UserAvatar } from "@/components/UserAvatar";
import { formatRelativeTime, getUserFullName, formatActivityDescription } from "@/lib/observation-utils";
import { PRIORITY_OPTIONS } from "@/lib/utils";
import type { Activity } from "@/components/shared/types";

interface ActivityItemProps {
  activity: Activity;
  isReply?: boolean;
}

export function ActivityItem({ activity, isReply = false }: ActivityItemProps) {
  const actorName = getUserFullName(activity.actor);
  const description = formatActivityDescription(activity);
  const timeAgo = formatRelativeTime(activity.created_at);

  const actionDescription = description.replace(actorName, "").trim();

  const isPriorityChange = activity.activity_type.toUpperCase() === "PRIORITY_CHANGED";
  const isStatusChange = activity.activity_type.toUpperCase() === "STATUS_CHANGED";
  const isSeverityChange = activity.activity_type.toUpperCase() === "SEVERITY_CHANGED";

  const priorityIcon = isPriorityChange && activity.new_value
    ? PRIORITY_OPTIONS.find(opt => opt.value === activity.new_value)?.icon
    : null;

  const statusOptions = [
    { value: "Open", label: "Open", icon: "/icons/todo.svg" },
    { value: "InProgress", label: "In Progress", icon: "/icons/inprogress.svg" },
    { value: "Escalated", label: "Escalated", icon: "/icons/inreview.svg" },
    { value: "Resolved", label: "Resolved", icon: "/icons/done.svg" },
    { value: "Closed", label: "Closed", icon: "/icons/x.svg" }
  ];

  const statusIcon = isStatusChange && activity.new_value
    ? statusOptions.find(opt => opt.value === activity.new_value)?.icon
    : null;

  const severityOptions = [
    { value: "Low", color: "#10b981" },
    { value: "Medium", color: "#f59e0b" },
    { value: "High", color: "#f97316" },
    { value: "Critical", color: "#ef4444" }
  ];

  const severityColor = isSeverityChange && activity.new_value
    ? severityOptions.find(opt => opt.value === activity.new_value)?.color
    : null;

  return (
    <div className={`py-1 flex items-center gap-2 ${isReply ? "ml-8" : ""}`}>
      {isPriorityChange && priorityIcon ? (
        <div className="h-4 w-4 flex-shrink-0 flex items-center justify-center">
          <img src={priorityIcon} alt="Priority" width={12} height={12} className="flex-shrink-0" />
        </div>
      ) : isStatusChange && statusIcon ? (
        <div className="h-4 w-4 flex-shrink-0 flex items-center justify-center">
          <img src={statusIcon} alt="Status" width={12} height={12} className="flex-shrink-0" />
        </div>
      ) : isSeverityChange && severityColor ? (
        <div className="h-4 w-4 flex-shrink-0 flex items-center justify-center">
          <div
            className="w-[6px] h-[6px] rounded-full flex-shrink-0"
            style={{ backgroundColor: severityColor }}
            aria-hidden="true"
          />
        </div>
      ) : (
        <UserAvatar user={activity.actor} size="xs" className="flex-shrink-0" />
      )}
      <p className="text-xs text-gray-700">
        <span className="font-medium">{actorName}</span> {actionDescription} •{" "}
        <span className="text-gray-500">{timeAgo}</span>
      </p>
    </div>
  );
}
