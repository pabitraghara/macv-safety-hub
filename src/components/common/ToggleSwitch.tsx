"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ToggleSwitchProps {
  isEnabled: boolean;
  onToggle: (value: boolean) => void;
  enabledLabel?: string;
  disabledLabel?: string;
  enabledTitle?: string;
  disabledTitle?: string;
  enabledMessage?: string;
  disabledMessage?: string;
  className?: string;
}

export default function ToggleSwitch({
  isEnabled,
  onToggle,
  enabledLabel = "Strict mode enabled",
  disabledLabel = " Strict mode disabled",
  enabledTitle = " Strict mode enabled",
  disabledTitle = "Strict mode disabled",
  enabledMessage = " Strict mode enabled",
  disabledMessage = " Strict mode disabled",
  className = "",
}: ToggleSwitchProps) {
  const handleToggle = (newState: boolean) => {
    onToggle(newState);

    // Show toast notification
    const message = newState ? enabledMessage : disabledMessage;
    toast.success(message);
  };

  return (
    <label
      title={isEnabled ? enabledTitle : disabledTitle}
      className={cn(
        "flex cursor-pointer items-center gap-2 text-sm font-medium",
        className,
      )}
    >
      <Switch checked={isEnabled} onCheckedChange={handleToggle} />
      <span className={isEnabled ? "" : "text-muted-foreground"}>
        {isEnabled ? enabledLabel : disabledLabel}
      </span>
    </label>
  );
}
