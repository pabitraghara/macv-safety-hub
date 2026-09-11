"use client";

import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  canManage: boolean;
  onCreate?: () => void;
}

export function EmptyState({ canManage, onCreate }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Bell className="text-muted-foreground h-8 w-8" />
      <p className="text-sm font-medium">No alert policies yet</p>
      <p className="text-muted-foreground text-sm">
        Create an alert to start notifying people.
      </p>
      {canManage && (
        <Button size="sm" className="mt-2 h-8" onClick={onCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New alert
        </Button>
      )}
    </div>
  );
}
