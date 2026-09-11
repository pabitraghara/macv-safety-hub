"use client";

import { useState } from "react";
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
import { peopleApi } from "@/api/people";
import { ApiError } from "@/api/base/errors";

interface AddPeopleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PeopleFormData {
  name: string;
  employee_id: string;
  type: string;
  department: string;
  phone: string;
  email: string;
}

const EMPTY_FORM: PeopleFormData = {
  name: "",
  employee_id: "",
  type: "Employee",
  department: "",
  phone: "",
  email: "",
};

export default function AddPeopleModal({
  isOpen,
  onClose,
  onSuccess,
}: AddPeopleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<PeopleFormData>(EMPTY_FORM);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!formData.employee_id.trim()) {
      toast.error("Employee ID is required");
      return;
    }

    setIsLoading(true);
    try {
      await peopleApi.createPerson({
        name: formData.name.trim(),
        employee_id: formData.employee_id.trim(),
        type: formData.type,
        department: formData.department.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
      });
      toast.success("Person added successfully!");
      handleClose();
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to add person";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(EMPTY_FORM);
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
          <DialogTitle>Add New Person</DialogTitle>
          <DialogDescription>
            Enter the details for the new person.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                id="name"
                name="name"
                placeholder="e.g., John Doe"
                value={formData.name}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee_id">
                Employee ID <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                id="employee_id"
                name="employee_id"
                placeholder="e.g., EMP001"
                value={formData.employee_id}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
                disabled={isLoading}
              >
                <SelectTrigger id="type" className="w-full">
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
              <Label htmlFor="department">Department</Label>
              <Input
                type="text"
                id="department"
                name="department"
                placeholder="e.g., Engineering"
                value={formData.department}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                type="tel"
                id="phone"
                name="phone"
                placeholder="e.g., +1234567890"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                type="email"
                id="email"
                name="email"
                placeholder="e.g., john@example.com"
                value={formData.email}
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
            {isLoading ? "Adding..." : "Add Person"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
