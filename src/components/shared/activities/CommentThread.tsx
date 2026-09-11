"use client";

import { UserAvatar } from "@/components/UserAvatar";
import { Separator } from "@/components/ui/separator";
import { formatRelativeTime, getUserFullName } from "@/lib/observation-utils";
import { CommentReply } from "./CommentReply";
import { CommentInput } from "./CommentInput";
import type { Activity } from "@/components/shared/types";

interface CommentThreadProps {
  activity: Activity;
  replyText?: string;
  onReplyTextChange?: (parentCommentId: string, text: string) => void;
  onReplySubmit?: (parentCommentId: string) => void;
  onReplyKeyPress?: (e: React.KeyboardEvent, parentCommentId: string) => void;
  isSubmittingReply?: boolean;
}

export function CommentThread({
  activity,
  replyText,
  onReplyTextChange,
  onReplySubmit,
  onReplyKeyPress,
  isSubmittingReply = false,
}: CommentThreadProps) {
  const actorName = getUserFullName(activity.actor);
  const timeAgo = formatRelativeTime(activity.created_at);

  return (
    <div className="py-2 -ml-4 -mr-4">
      <div className="border rounded-md bg-gray-50">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <UserAvatar user={activity.actor} size="sm" className="flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700">{actorName}</span>
            <span className="text-xs text-gray-500">• {timeAgo}</span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap pl-8">
            {activity.activity_metadata?.full_comment}
          </p>
        </div>

        {activity.replies && activity.replies.length > 0 && (
          <div className="ml-4">
            {activity.replies.map((reply, index) => (
              <div key={reply.id}>
                <CommentReply activity={reply} />
                {index < activity.replies.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        )}

        {onReplyTextChange && onReplySubmit && onReplyKeyPress && (
          <CommentInput
            value={replyText || ""}
            onChange={(text) => onReplyTextChange(activity.id, text)}
            onSubmit={() => onReplySubmit(activity.id)}
            onKeyPress={(e) => onReplyKeyPress(e, activity.id)}
            disabled={isSubmittingReply}
            loading={isSubmittingReply}
            isReply={true}
          />
        )}
      </div>
    </div>
  );
}
