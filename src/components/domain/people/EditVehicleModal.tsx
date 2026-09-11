"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { peopleApi } from "@/api/people";
import { ApiError } from "@/api/base/errors";

/** Flat vehicle shape as returned by the people/vehicle-registration endpoints. */
export interface EditVehicleTarget {
  license_plate: string;
  vehicle_type: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_year: number | null;
  expiry_date: string | null;
}

export interface EditOwnerTarget {
  name: string;
  employee_id: string | null;
  type: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
}

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editMode?: "owner" | "vehicle";
  /** Person UUID — required for editMode "owner" (PATCH /people/{personId}). */
  personId?: string;
  vehicle?: EditVehicleTarget | null;
  owner?: EditOwnerTarget | null;
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

const EMPTY_FORM: VehicleFormData = {
  license_plate: "",
  vehicle_type: "",
  vehicle_make: "",
  vehicle_model: "",
  vehicle_color: "",
  vehicle_year: "",
  registration_expiry_date: "",
  owner_name: "",
  owner_employee_id: "",
  owner_type: "",
  owner_department: "",
  owner_phone: "",
  owner_email: "",
};

export default function EditVehicleModal({
  isOpen,
  onClose,
  onSuccess,
  editMode = "vehicle",
  personId,
  vehicle,
  owner,
}: EditVehicleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [originalLicensePlate, setOriginalLicensePlate] = useState("");
  const [formData, setFormData] = useState<VehicleFormData>(EMPTY_FORM);

  useEffect(() => {
    if (!isOpen) return;

    let expiry = "";
    if (vehicle?.expiry_date) {
      const raw = vehicle.expiry_date;
      expiry = raw.includes("T") ? raw.split("T")[0] : raw.split(" ")[0];
    }
    setOriginalLicensePlate(vehicle?.license_plate ?? "");
    setFormData({
      license_plate: vehicle?.license_plate ?? "",
      vehicle_type: vehicle?.vehicle_type ?? "",
      vehicle_make: vehicle?.vehicle_make ?? "",
      vehicle_model: vehicle?.vehicle_model ?? "",
      vehicle_color: vehicle?.vehicle_color ?? "",
      vehicle_year: vehicle?.vehicle_year?.toString() ?? "",
      registration_expiry_date: expiry,
      owner_name: owner?.name ?? "",
      owner_employee_id: owner?.employee_id ?? "",
      owner_type: owner?.type ?? "",
      owner_department: owner?.department ?? "",
      owner_phone: owner?.phone ?? "",
      owner_email: owner?.email ?? "",
    });
  }, [isOpen, vehicle, owner]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (editMode === "vehicle") {
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
    } else {
      if (!formData.owner_name.trim()) {
        toast.error("Owner's name is required");
        return;
      }
      if (!formData.owner_type) {
        toast.error("Owner type is required");
        return;
      }
      if (!formData.owner_department) {
        toast.error("Owner department is required");
        return;
      }
      if (!formData.owner_phone) {
        toast.error("Owner phone number is required");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (editMode === "vehicle") {
        await vehiclesApi.updateVehicleRegistration(originalLicensePlate, {
          license_plate: formData.license_plate.trim().toUpperCase(),
          vehicle_info: {
            type: formData.vehicle_type || "sedan",
            make: formData.vehicle_make.trim(),
            model: formData.vehicle_model.trim(),
            color: formData.vehicle_color.trim(),
            year:
              parseInt(formData.vehicle_year, 10) || new Date().getFullYear(),
          },
          registration: {
            expiry_date: formData.registration_expiry_date + "T00:00:00Z",
          },
        });
        toast.success("Vehicle updated successfully");
      } else {
        if (!personId) {
          throw new Error("personId is required to edit owner details");
        }
        await peopleApi.updatePerson(personId, {
          name: formData.owner_name.trim(),
          type: formData.owner_type,
          department: formData.owner_department.trim(),
          phone: formData.owner_phone.trim(),
          email: formData.owner_email.trim() || null,
        });
        toast.success("Owner information updated successfully");
      }
      handleClose();
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : editMode === "vehicle"
            ? "Failed to update vehicle"
            : "Failed to update owner";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
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
          <DialogTitle>
            {editMode === "owner"
              ? "Edit Owner Information"
              : "Edit Vehicle Information"}
          </DialogTitle>
          <DialogDescription>
            {editMode === "owner"
              ? "Update the owner details for this person."
              : "Update the vehicle registration details."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {editMode === "vehicle" && (
            <>
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
                  <Label htmlFor="vehicle_year">Year</Label>
                  <Input
                    type="number"
                    id="vehicle_year"
                    name="vehicle_year"
                    placeholder="e.g., 2020"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={formData.vehicle_year}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>

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
            </>
          )}
          {editMode === "owner" && (
            <>
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
                    disabled={true}
                    className="font-mono"
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
            </>
          )}
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
