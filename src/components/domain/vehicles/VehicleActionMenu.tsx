"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Vehicle } from "@/api/vehicles";

interface VehicleActionMenuProps {
  vehicle: Vehicle;
  onWhitelistClick: (vehicle: Vehicle) => void;
  onBlacklistClick: (vehicle: Vehicle) => void;
  onViewDetailsClick: (vehicle: Vehicle) => void;
  onEditClick: (vehicle: Vehicle) => void;
}

export default function VehicleActionMenu({
  vehicle,
  onWhitelistClick,
  onBlacklistClick,
  onViewDetailsClick,
  onEditClick,
}: VehicleActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onViewDetailsClick(vehicle);
          }}
        >
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onEditClick(vehicle);
          }}
        >
          Edit Vehicle
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onWhitelistClick(vehicle);
          }}
        >
          Add to Whitelist
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onBlacklistClick(vehicle);
          }}
        >
          Add to Blacklist
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
