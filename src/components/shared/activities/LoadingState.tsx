"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Activity as ActivityIcon, Clock } from "lucide-react";

interface LoadingStateProps {
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function LoadingState({
  loading = false,
  error = null,
  isEmpty = false,
  onRetry,
  className,
}: LoadingStateProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 mb-2">Failed to load activities</p>
            <p className="text-xs text-gray-500 mb-4">{error}</p>
            {onRetry && (
              <button onClick={onRetry} className="text-sm text-blue-600 hover:text-blue-800">
                Try again
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <div className="text-center py-8 m-3">
        <ActivityIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No activities found</p>
      </div>
    );
  }

  return null;
}
