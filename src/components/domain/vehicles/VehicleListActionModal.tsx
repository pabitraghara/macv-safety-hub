"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { vehiclesApi } from "@/api/vehicles";
import { ApiError } from "@/api/base/errors";
import { useAuth } from "@/lib/auth-context";

interface VehicleListActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "whitelist" | "blacklist" | null;
  licensePlate: string | null;
  onSuccess?: () => void;
}

export default function VehicleListActionModal({
  isOpen,
  onClose,
  action,
  licensePlate,
  onSuccess,
}: VehicleListActionModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const updatedBy = user?.name ?? "Unknown";

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    if (!licensePlate || !action) {
      toast.error("Invalid action");
      return;
    }

    setIsLoading(true);
    try {
      if (action === "whitelist") {
        await vehiclesApi.addToWhitelist(
          licensePlate,
          updatedBy,
          reason.trim(),
        );
      } else {
        await vehiclesApi.addToBlacklist(
          licensePlate,
          updatedBy,
          reason.trim(),
        );
      }
      toast.success(
        `Vehicle ${action === "whitelist" ? "whitelisted" : "blacklisted"} successfully!`,
      );
      handleClose();
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : `Failed to ${action} vehicle`;
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setReason("");
  };

  const getTitle = () => {
    if (action === "whitelist") return "Add to Whitelist";
    if (action === "blacklist") return "Add to Blacklist";
    return "Update Vehicle Status";
  };

  const getDescription = () => {
    if (action === "whitelist")
      return `Please provide a reason for whitelisting ${licensePlate}`;
    if (action === "blacklist")
      return `Please provide a reason for blacklisting ${licensePlate}`;
    return "Please provide a reason for this action";
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            placeholder="Enter reason for this action..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
            rows={4}
            className="resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={action === "blacklist" ? "destructive" : "default"}
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
