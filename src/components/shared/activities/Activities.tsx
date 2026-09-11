"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "./LoadingState";
import { CommentInput } from "./CommentInput";
import { ActivityItem } from "./ActivityItem";
import { CommentThread } from "./CommentThread";
import type { Activity } from "@/components/shared/types";

interface ActivitiesProps {
  code: string;
  useActivitiesHook: (code: string) => {
    data: Activity[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
  };
  useAddCommentHook: (code: string) => {
    addComment: (comment: string, parentCommentId?: string) => Promise<unknown>;
    loading: boolean;
    error: string | null;
  };
  className?: string;
  refreshTrigger?: number;
}

export function Activities({
  code,
  useActivitiesHook,
  useAddCommentHook,
  className,
  refreshTrigger,
}: ActivitiesProps) {
  const { data: activities, loading, error, refetch } = useActivitiesHook(code);
  const { addComment, loading: addingComment, error: addCommentError } = useAddCommentHook(code);

  const [mainComment, setMainComment] = useState("");
  const [replyComments, setReplyComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  const handleMainCommentSubmit = async () => {
    if (!mainComment.trim()) return;
    try {
      await addComment(mainComment.trim());
      setMainComment("");
      refetch();
      toast.success("Comment added successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add comment";
      toast.error(errorMessage);
    }
  };

  const handleReplySubmit = async (parentCommentId: string) => {
    const replyText = replyComments[parentCommentId];
    if (!replyText?.trim()) return;
    try {
      await addComment(replyText.trim(), parentCommentId);
      setReplyComments(prev => {
        const newState = { ...prev };
        delete newState[parentCommentId];
        return newState;
      });
      refetch();
      toast.success("Reply added successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add reply";
      toast.error(errorMessage);
    }
  };

  const handleMainCommentKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleMainCommentSubmit();
    }
  };

  const handleReplyKeyPress = (e: React.KeyboardEvent, parentCommentId: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReplySubmit(parentCommentId);
    }
  };

  if (loading || error || activities.length === 0) {
    return (
      <LoadingState
        loading={loading}
        error={error}
        isEmpty={!loading && !error && activities.length === 0}
        onRetry={refetch}
        className={className}
      />
    );
  }

  return (
    <div>
      <h1 className="text-lg font-medium">Activity</h1>
      <div className="space-y-1 m-3">
        {activities.map((activity) => {
          if (
            activity.activity_type.toUpperCase() === "COMMENT_ADDED" &&
            activity.activity_metadata?.full_comment
          ) {
            return (
              <CommentThread
                key={activity.id}
                activity={activity}
                replyText={replyComments[activity.id]}
                onReplyTextChange={(parentCommentId, text) =>
                  setReplyComments(prev => ({ ...prev, [parentCommentId]: text }))
                }
                onReplySubmit={handleReplySubmit}
                onReplyKeyPress={handleReplyKeyPress}
                isSubmittingReply={addingComment}
              />
            );
          }

          return <ActivityItem key={activity.id} activity={activity} />;
        })}

        <CommentInput
          value={mainComment}
          onChange={setMainComment}
          onSubmit={handleMainCommentSubmit}
          onKeyPress={handleMainCommentKeyPress}
          disabled={addingComment}
          loading={addingComment}
          error={addCommentError}
        />
      </div>
    </div>
  );
}
