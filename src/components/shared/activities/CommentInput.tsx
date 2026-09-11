"use client";

import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";
import { Send, Loader2 } from "lucide-react";
import { useCurrentUser } from "@/contexts/UserContext";

interface CommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  isReply?: boolean;
  className?: string;
}

export function CommentInput({
  value,
  onChange,
  onSubmit,
  onKeyPress,
  placeholder = "Leave a comment...",
  disabled = false,
  loading = false,
  error = null,
  isReply = false,
  className = "",
}: CommentInputProps) {
  const { profile: currentUser } = useCurrentUser();

  if (isReply) {
    return (
      <div className="px-4 border-t bg-gray-50">
        <div className="ml-4 flex items-center gap-3">
          <UserAvatar user={currentUser} size="sm" className="flex-shrink-0" />
          <div className="flex-1 flex items-center py-3">
            <input
              type="text"
              placeholder="Leave a reply..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={onKeyPress}
              disabled={disabled || loading}
              className="flex-1 text-sm text-gray-700 bg-transparent border-none outline-none placeholder:text-gray-400 disabled:opacity-50"
            />
            <button
              onClick={onSubmit}
              disabled={!value.trim() || disabled || loading}
              className="text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`pt-4 mt-4 border-t -ml-4 -mr-4 ${className}`}>
      <div className="relative">
        <Textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          disabled={disabled || loading}
          className="min-h-[100px] resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500 focus-visible:outline-none focus-visible:ring-0 pr-12 disabled:opacity-50"
        />
        <button
          onClick={onSubmit}
          disabled={!value.trim() || disabled || loading}
          className="absolute bottom-3 right-3 text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
      {error && (
        <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
          <span>⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
}
