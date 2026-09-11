"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import ErrorAlert from "@/components/common/ErrorAlert";
import DeleteConfirmationModal from "@/components/common/DeleteConfirmationModal";
import {
  ArrowLeft,
  Phone,
  Building2,
  Truck,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import AddVehicleModal from "@/components/domain/people/AddVehicleModal";
import EditVehicleModal from "@/components/domain/people/EditVehicleModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { peopleApi } from "@/api/people";
import { vehiclesApi } from "@/api/vehicles";
import type { PersonWithVehicles, PersonVehicleSummary } from "@/api/people";
import { ApiError } from "@/api/base/errors";

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

function getInitials(name?: string | null) {
  return (
    (name || "")
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function formatExpiryDate(dateString: string | null) {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [person, setPerson] = useState<PersonWithVehicles | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] =
    useState<PersonVehicleSummary | null>(null);
  const [editMode, setEditMode] = useState<"owner" | "vehicle">("vehicle");
  const [showDeletePersonModal, setShowDeletePersonModal] = useState(false);
  const [showDeleteVehicleModal, setShowDeleteVehicleModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] =
    useState<PersonVehicleSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    params.then((resolved) => setUserId(resolved.id));
  }, [params]);

  const fetchPerson = useCallback(
    async (showLoader = true) => {
      if (!userId) return;
      if (showLoader) setIsLoading(true);
      try {
        const response = await peopleApi.getPerson(userId);
        setPerson(response);
        setError(null);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Failed to fetch person details. Please try again.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    fetchPerson();
  }, [fetchPerson]);

  const vehicles = (person?.vehicles ?? []).filter((v) => v?.license_plate);

  const handleEditVehicle = (
    e: React.MouseEvent,
    vehicle: PersonVehicleSummary,
  ) => {
    e.stopPropagation();
    setSelectedVehicle(vehicle);
    setEditMode("vehicle");
    setShowEditVehicleModal(true);
  };

  const handleEditOwner = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVehicle(null);
    setEditMode("owner");
    setShowEditVehicleModal(true);
  };

  const handleDeleteVehicle = (
    e: React.MouseEvent,
    vehicle: PersonVehicleSummary,
  ) => {
    e.stopPropagation();
    setVehicleToDelete(vehicle);
    setShowDeleteVehicleModal(true);
  };

  const confirmDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    setIsDeleting(true);
    try {
      await vehiclesApi.deleteVehicleRegistration(
        vehicleToDelete.license_plate,
      );
      toast.success("Vehicle removed successfully!");
      setShowDeleteVehicleModal(false);
      setVehicleToDelete(null);
      await fetchPerson(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to remove vehicle.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeletePerson = async () => {
    if (!person) return;
    setIsDeleting(true);
    try {
      await peopleApi.deletePerson(userId);
      toast.success("Person removed successfully!");
      setShowDeletePersonModal(false);
      router.push("/people");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to remove person.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Loading person..." />;
  }

  if (error || !person) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <ErrorAlert message={error || "Person not found"} />
        <Button
          variant="outline"
          size="sm"
          className="mt-4 h-8"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {getInitials(person.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {person.name}
                </h1>
                <p className="text-muted-foreground font-mono text-xs">
                  {person.employee_id ?? "-"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-semibold tabular-nums">
                  {vehicles.length}
                </div>
                <div className="text-muted-foreground text-xs">Vehicles</div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={handleEditOwner}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-8"
                onClick={() => setShowDeletePersonModal(true)}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <Phone className="text-muted-foreground h-4 w-4" />
              <div>
                <div className="text-muted-foreground text-xs">Phone</div>
                <div className="text-sm">{person.phone || "-"}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="text-muted-foreground h-4 w-4" />
              <div>
                <div className="text-muted-foreground text-xs">Type</div>
                <div className="text-sm">{person.type ?? "-"}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Truck className="text-muted-foreground h-4 w-4" />
              <div>
                <div className="text-muted-foreground text-xs">Department</div>
                <div className="text-sm">{person.department || "-"}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Linked Vehicles ({vehicles.length})</CardTitle>
          <Button
            size="sm"
            className="h-8"
            onClick={() => setShowAddVehicleModal(true)}
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() =>
                  router.push(
                    `/vehicles/${encodeURIComponent(vehicle.license_plate)}`,
                  )
                }
                className="hover:bg-accent/50 cursor-pointer rounded-lg border p-4 transition-colors"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="bg-muted rounded-md border px-2 py-1 font-mono text-xs font-medium">
                    {vehicle.license_plate}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => handleEditVehicle(e, vehicle)}
                      title="Edit vehicle"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      onClick={(e) => handleDeleteVehicle(e, vehicle)}
                      title="Remove vehicle"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">
                      {vehicle.vehicle_type ?? "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Make:</span>
                    <span className="font-medium">
                      {vehicle.vehicle_make ?? "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model:</span>
                    <span className="font-medium">
                      {vehicle.vehicle_model ?? "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Year:</span>
                    <span className="font-medium tabular-nums">
                      {vehicle.vehicle_year ?? "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Registration Expiry Date:
                    </span>
                    <span className="font-medium">
                      {formatExpiryDate(vehicle.expiry_date)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {vehicles.length === 0 && (
            <EmptyState
              title="No vehicles"
              message="No vehicles linked to this person."
            />
          )}
        </CardContent>
      </Card>

      <AddVehicleModal
        isOpen={showAddVehicleModal}
        onClose={() => setShowAddVehicleModal(false)}
        employeeId={person.employee_id ?? ""}
        onSuccess={() => {
          setShowAddVehicleModal(false);
          fetchPerson(false);
        }}
        ownerData={{
          name: person.name,
          email: person.email ?? "",
          phone: person.phone ?? "",
          type: person.type ?? "Employee",
          department: person.department ?? "",
        }}
      />

      <EditVehicleModal
        key={`${selectedVehicle?.id ?? "owner"}-${editMode}`}
        isOpen={showEditVehicleModal}
        onClose={() => {
          setShowEditVehicleModal(false);
          setSelectedVehicle(null);
        }}
        editMode={editMode}
        personId={userId}
        vehicle={
          selectedVehicle
            ? {
                license_plate: selectedVehicle.license_plate,
                vehicle_type: selectedVehicle.vehicle_type,
                vehicle_make: selectedVehicle.vehicle_make,
                vehicle_model: selectedVehicle.vehicle_model,
                vehicle_color: selectedVehicle.vehicle_color,
                vehicle_year: selectedVehicle.vehicle_year,
                expiry_date: selectedVehicle.expiry_date,
              }
            : null
        }
        owner={{
          name: person.name,
          employee_id: person.employee_id,
          type: person.type,
          department: person.department,
          phone: person.phone,
          email: person.email,
        }}
        onSuccess={() => {
          setShowEditVehicleModal(false);
          setSelectedVehicle(null);
          fetchPerson(false);
        }}
      />

      <DeleteConfirmationModal
        isOpen={showDeletePersonModal}
        onClose={() => setShowDeletePersonModal(false)}
        onConfirm={confirmDeletePerson}
        title="Remove Person"
        message={`Remove ${person.name} from the registry? This deactivates the person along with their associated data.`}
        isLoading={isDeleting}
        confirmButtonText="Remove Person"
      />

      <DeleteConfirmationModal
        isOpen={showDeleteVehicleModal}
        onClose={() => setShowDeleteVehicleModal(false)}
        onConfirm={confirmDeleteVehicle}
        title="Remove Vehicle"
        message={`Remove vehicle ${vehicleToDelete?.license_plate}? This deactivates the registration.`}
        isLoading={isDeleting}
        confirmButtonText="Remove Vehicle"
      />
    </div>
  );
}
