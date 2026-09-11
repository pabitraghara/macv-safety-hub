"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { vehiclesApi } from "@/api/vehicles";
import { ApiError } from "@/api/base/errors";

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Employee ID of the owner this vehicle is being registered for. */
  employeeId: string;
  onSuccess?: () => void;
  ownerData?: {
    name: string;
    email: string;
    phone: string;
    type: string;
    department: string;
  };
}

interface VehicleFormData {
  license_plate: string;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  vehicle_year: string;
  registration_expiry_date: string;
  owner_name: string;
  owner_employee_id: string;
  owner_type: string;
  owner_department: string;
  owner_phone: string;
  owner_email: string;
}

export default function AddVehicleModal({
  isOpen,
  onClose,
  employeeId,
  onSuccess,
  ownerData,
}: AddVehicleModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const buildInitialForm = (): VehicleFormData => ({
    license_plate: "",
    vehicle_type: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_color: "",
    vehicle_year: new Date().getFullYear().toString(),
    registration_expiry_date: "",
    owner_name: ownerData?.name || "",
    owner_employee_id: employeeId || "",
    owner_type: ownerData?.type || "Employee",
    owner_department: ownerData?.department || "",
    owner_phone: ownerData?.phone || "",
    owner_email: ownerData?.email || "",
  });

  const [formData, setFormData] = useState<VehicleFormData>(buildInitialForm);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.license_plate.trim()) {
      toast.error("License plate is required");
      return;
    }
    if (!formData.vehicle_make.trim()) {
      toast.error("Vehicle make is required");
      return;
    }
    if (!formData.vehicle_model.trim()) {
      toast.error("Vehicle model is required");
      return;
    }
    if (!formData.registration_expiry_date) {
      toast.error("Registration expiry date is required");
      return;
    }
    if (!formData.owner_phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setIsLoading(true);
    try {
      await vehiclesApi.createVehicleRegistration({
        license_plate: formData.license_plate.trim().toUpperCase(),
        owner: {
          name: formData.owner_name.trim(),
          employee_id: formData.owner_employee_id.trim(),
          type: formData.owner_type,
          department: formData.owner_department.trim(),
          phone: formData.owner_phone.trim(),
          email: formData.owner_email.trim(),
        },
        vehicle_info: {
          type: formData.vehicle_type || "sedan",
          make: formData.vehicle_make.trim(),
          model: formData.vehicle_model.trim(),
          color: formData.vehicle_color.trim(),
          year: parseInt(formData.vehicle_year, 10) || new Date().getFullYear(),
        },
        registration: {
          expiry_date: formData.registration_expiry_date + "T00:00:00Z",
        },
      });

      toast.success("Vehicle added successfully!");
      handleClose();
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to add vehicle";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setFormData(buildInitialForm());
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>
            Register a new vehicle for this person.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Vehicle Details</h3>

          <div className="space-y-2">
            <Label htmlFor="license_plate">
              License Plate <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              id="license_plate"
              name="license_plate"
              placeholder="e.g., TEST123"
              value={formData.license_plate}
              onChange={handleInputChange}
              disabled={isLoading}
              className="font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle_type">Vehicle Type</Label>
              <Input
                type="text"
                id="vehicle_type"
                name="vehicle_type"
                placeholder="e.g., Car"
                value={formData.vehicle_type}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_make">
                Make <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                id="vehicle_make"
                name="vehicle_make"
                placeholder="e.g., Toyota"
                value={formData.vehicle_make}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle_model">
                Model <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                id="vehicle_model"
                name="vehicle_model"
                placeholder="e.g., Camry"
                value={formData.vehicle_model}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_color">Color</Label>
              <Input
                type="text"
                id="vehicle_color"
                name="vehicle_color"
                placeholder="e.g., Blue"
                value={formData.vehicle_color}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registration_expiry_date">
                Registration Expiry Date{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                id="registration_expiry_date"
                name="registration_expiry_date"
                value={formData.registration_expiry_date}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <Separator />

          <h3 className="text-sm font-semibold">Owner Information</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner_name">Name</Label>
              <Input
                type="text"
                id="owner_name"
                name="owner_name"
                placeholder="e.g., John Doe"
                value={formData.owner_name}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_employee_id">Employee ID</Label>
              <Input
                type="text"
                id="owner_employee_id"
                name="owner_employee_id"
                placeholder="e.g., EMP001"
                value={formData.owner_employee_id}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner_type">Type</Label>
              <Select
                value={formData.owner_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, owner_type: value }))
                }
                disabled={isLoading}
              >
                <SelectTrigger id="owner_type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="Contractor">Contractor</SelectItem>
                  <SelectItem value="Visitor">Visitor</SelectItem>
                  <SelectItem value="Tenant">Tenant</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_department">Department</Label>
              <Input
                type="text"
                id="owner_department"
                name="owner_department"
                placeholder="e.g., Engineering"
                value={formData.owner_department}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner_phone">Phone</Label>
              <Input
                type="tel"
                id="owner_phone"
                name="owner_phone"
                placeholder="e.g., +1234567890"
                value={formData.owner_phone}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_email">Email</Label>
              <Input
                type="email"
                id="owner_email"
                name="owner_email"
                placeholder="e.g., john@example.com"
                value={formData.owner_email}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Adding..." : "Add Vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
