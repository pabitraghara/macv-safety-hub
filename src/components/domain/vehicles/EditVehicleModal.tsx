"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { vehiclesApi } from "@/api/vehicles";
import type { Vehicle } from "@/api/vehicles";
import { ApiError } from "@/api/base/errors";

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onSuccess?: () => void;
}

export default function EditVehicleModal({
  isOpen,
  onClose,
  vehicle,
  onSuccess,
}: EditVehicleModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    license_plate: "",
    vehicle_type: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_color: "",
    vehicle_year: "",
    owner_name: "",
    owner_employee_id: "",
    owner_type: "",
    owner_department: "",
    owner_phone: "",
    owner_email: "",
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        license_plate: vehicle.license_plate || "",
        vehicle_type: vehicle.vehicle_type || "",
        vehicle_make: vehicle.vehicle_make || "",
        vehicle_model: vehicle.vehicle_model || "",
        vehicle_color: vehicle.vehicle_color || "",
        vehicle_year: vehicle.vehicle_year?.toString() || "",
        owner_name: vehicle.owner?.name || "",
        owner_employee_id: vehicle.owner?.employee_id || "",
        owner_type: vehicle.owner?.type || "",
        owner_department: vehicle.owner?.department || "",
        owner_phone: vehicle.owner?.phone || "",
        owner_email: vehicle.owner?.email || "",
      });
    }
  }, [vehicle]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!vehicle) return;

    setIsLoading(true);
    try {
      await vehiclesApi.updateVehicleRegistration(vehicle.license_plate, {
        license_plate: formData.license_plate,
        vehicle_info: {
          type: formData.vehicle_type,
          make: formData.vehicle_make || null,
          model: formData.vehicle_model || null,
          color: formData.vehicle_color || null,
          year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
        },
        owner: {
          name: formData.owner_name,
          employee_id: formData.owner_employee_id,
          type: formData.owner_type,
          department: formData.owner_department,
          phone: formData.owner_phone,
          email: formData.owner_email,
        },
      });

      toast.success("Vehicle updated successfully!");
      onSuccess?.();
      handleClose();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to update vehicle";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const vehicleFields: {
    id: keyof typeof formData;
    label: string;
    type?: string;
  }[] = [
    { id: "license_plate", label: "License Plate" },
    { id: "vehicle_type", label: "Vehicle Type" },
    { id: "vehicle_make", label: "Make" },
    { id: "vehicle_model", label: "Model" },
    { id: "vehicle_color", label: "Color" },
    { id: "vehicle_year", label: "Year" },
  ];

  const ownerFields: {
    id: keyof typeof formData;
    label: string;
    type?: string;
  }[] = [
    { id: "owner_name", label: "Owner Name" },
    { id: "owner_employee_id", label: "Employee ID" },
    { id: "owner_type", label: "Type" },
    { id: "owner_department", label: "Department" },
    { id: "owner_phone", label: "Phone" },
    { id: "owner_email", label: "Email", type: "email" },
  ];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-1">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Vehicle Information</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {vehicleFields.map((field) => (
                <div key={field.id} className="grid gap-1.5">
                  <Label htmlFor={field.id}>{field.label}</Label>
                  <Input
                    type={field.type ?? "text"}
                    id={field.id}
                    name={field.id}
                    value={formData[field.id]}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Owner Information</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {ownerFields.map((field) => (
                <div key={field.id} className="grid gap-1.5">
                  <Label htmlFor={field.id}>{field.label}</Label>
                  <Input
                    type={field.type ?? "text"}
                    id={field.id}
                    name={field.id}
                    value={formData[field.id]}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
