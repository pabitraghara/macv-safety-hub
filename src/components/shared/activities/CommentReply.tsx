"use client";

import { UserAvatar } from "@/components/UserAvatar";
import { formatRelativeTime, getUserFullName } from "@/lib/observation-utils";
import type { Activity } from "@/components/shared/types";

interface CommentReplyProps {
  activity: Activity;
}

export function CommentReply({ activity }: CommentReplyProps) {
  const actorName = getUserFullName(activity.actor);
  const timeAgo = formatRelativeTime(activity.created_at);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <UserAvatar user={activity.actor} size="sm" className="flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700">{actorName}</span>
        <span className="text-xs text-gray-500">• {timeAgo}</span>
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap pl-8">
        {activity.activity_metadata?.full_comment}
      </p>
    </div>
  );
}
