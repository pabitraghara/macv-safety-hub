"use client";

import React, { useState, useEffect, useCallback } from "react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import ErrorAlert from "@/components/common/ErrorAlert";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MobileCardList, RecordCard } from "@/components/common/RecordCard";
import { DataTable } from "@/components/ui/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/common/TablePagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { vehiclesApi } from "@/api/vehicles";
import type { Vehicle } from "@/api/vehicles";
import { ApiError } from "@/api/base/errors";
import { useAuth } from "@/lib/auth-context";

type ListVariant = "whitelist" | "blacklist";

const PAGE_SIZE = 50;

interface AccessListPanelProps {
  variant: ListVariant;
}

const COPY: Record<
  ListVariant,
  { title: string; addLabel: string; reasonRequired: boolean }
> = {
  whitelist: {
    title: "Vehicle Whitelist",
    addLabel: "Add to Whitelist",
    reasonRequired: false,
  },
  blacklist: {
    title: "Vehicle Blacklist",
    addLabel: "Add to Blacklist",
    reasonRequired: true,
  },
};

export default function AccessListPanel({ variant }: AccessListPanelProps) {
  const { user } = useAuth();
  const updatedBy = user?.name ?? "Unknown";
  const copy = COPY[variant];

  const [entries, setEntries] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [originalLicensePlate, setOriginalLicensePlate] = useState<
    string | null
  >(null);
  const [newEntry, setNewEntry] = useState({
    license_plate: "",
    vehicle_type: "",
    list_status_reason: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchEntries = useCallback(
    async (page: number = 1) => {
      setIsLoading(true);
      try {
        const response =
          variant === "whitelist"
            ? await vehiclesApi.getWhitelistedVehicles(page, PAGE_SIZE)
            : await vehiclesApi.getBlacklistedVehicles(page, PAGE_SIZE);
        setEntries(response.data || []);
        setTotalCount(response.metadata?.total_count ?? 0);
        setCurrentPage(page);
        setError(null);
      } catch {
        setError(`Failed to fetch ${variant} entries.`);
      } finally {
        setIsLoading(false);
      }
    },
    [variant],
  );

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const flagPlate = async (plate: string, reason?: string) => {
    if (variant === "whitelist") {
      await vehiclesApi.addToWhitelist(plate, updatedBy, reason);
    } else {
      await vehiclesApi.addToBlacklist(plate, updatedBy, reason);
    }
  };

  const resetForm = () => {
    setNewEntry({
      license_plate: "",
      vehicle_type: "",
      list_status_reason: "",
    });
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.license_plate.trim()) {
      toast.error("License plate is required");
      return;
    }
    if (copy.reasonRequired && !newEntry.list_status_reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    setIsSubmitting(true);
    const plate = newEntry.license_plate.trim().toUpperCase();
    try {
      // Register the vehicle if it isn't known yet; a 409 means it already
      // exists, in which case we just move on to flagging it.
      try {
        await vehiclesApi.createVehicleRegistration({
          license_plate: plate,
          owner: {},
          vehicle_info: newEntry.vehicle_type
            ? { type: newEntry.vehicle_type }
            : null,
        });
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 409) throw err;
      }
      await flagPlate(plate, newEntry.list_status_reason.trim() || undefined);
      resetForm();
      setShowForm(false);
      setError(null);
      toast.success(`${copy.title} entry added successfully`);
      await fetchEntries();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : `Failed to add ${variant} entry.`;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpenEntry = (entry: Vehicle) => {
    setEditingEntryId(entry.id);
    setOriginalLicensePlate(entry.license_plate);
    setNewEntry({
      license_plate: entry.license_plate,
      vehicle_type: entry.vehicle_type || "",
      list_status_reason: entry.list_status_reason || "",
    });
    setShowEditForm(true);
  };

  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntryId || !originalLicensePlate) return;
    if (!newEntry.license_plate.trim()) {
      toast.error("License plate is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const newPlate = newEntry.license_plate.trim().toUpperCase();
      if (newPlate !== originalLicensePlate) {
        await vehiclesApi.updateVehicleRegistration(originalLicensePlate, {
          license_plate: newPlate,
        });
      }
      // Re-flag to update the list reason.
      await flagPlate(
        newPlate,
        newEntry.list_status_reason.trim() || undefined,
      );
      setError(null);
      resetForm();
      setEditingEntryId(null);
      setOriginalLicensePlate(null);
      setShowEditForm(false);
      toast.success(`${copy.title} entry updated successfully`);
      await fetchEntries();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : `Failed to edit ${variant} entry.`;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (licensePlate: string) => {
    try {
      await vehiclesApi.removeFromList(licensePlate, updatedBy);
      toast.success(`Removed from ${variant} successfully`);
      setError(null);
      await fetchEntries();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : `Failed to remove ${variant} entry.`;
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorAlert message={error} onRetry={() => fetchEntries()} />}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{copy.title}</h2>
        <Button
          size="sm"
          className="h-8"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4" />
          {copy.addLabel}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor={`${variant}-license-plate`}>
                  License Plate <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`${variant}-license-plate`}
                  type="text"
                  value={newEntry.license_plate}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      license_plate: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., ABC123"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor={`${variant}-vehicle-type`}>Vehicle Type</Label>
                <Input
                  id={`${variant}-vehicle-type`}
                  type="text"
                  value={newEntry.vehicle_type}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, vehicle_type: e.target.value })
                  }
                  placeholder="e.g., Car, Truck, Motorcycle"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor={`${variant}-reason`}>
                  Reason{" "}
                  {copy.reasonRequired && (
                    <span className="text-destructive">*</span>
                  )}
                </Label>
                <Textarea
                  id={`${variant}-reason`}
                  value={newEntry.list_status_reason}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      list_status_reason: e.target.value,
                    })
                  }
                  placeholder={
                    variant === "blacklist"
                      ? "e.g., Stolen vehicle, wanted, etc."
                      : "e.g., Company vehicle, VIP, etc."
                  }
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant={variant === "blacklist" ? "destructive" : "default"}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Adding..." : copy.addLabel}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showEditForm && (
        <Card>
          <CardContent>
            <form onSubmit={handleEditEntry} className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor={`${variant}-edit-license-plate`}>
                  License Plate
                </Label>
                <Input
                  id={`${variant}-edit-license-plate`}
                  type="text"
                  value={newEntry.license_plate}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      license_plate: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., ABC123"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${variant}-edit-reason`}>Reason</Label>
                <Textarea
                  id={`${variant}-edit-reason`}
                  value={newEntry.list_status_reason}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      list_status_reason: e.target.value,
                    })
                  }
                  placeholder="e.g., Company vehicle, VIP, etc."
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingEntryId(null);
                    setOriginalLicensePlate(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading && <LoadingSpinner label={`Loading ${variant}...`} />}

      {!isLoading && entries.length === 0 && (
        <EmptyState
          title={`No ${variant}ed vehicles`}
          message={`No ${variant}ed vehicles yet.`}
        />
      )}

      {!isLoading && entries.length > 0 && (
        <div className="space-y-4">
          <MobileCardList>
            {entries.map((entry) => (
              <RecordCard
                key={entry.id}
                title={
                  <span className="bg-muted inline-block rounded-md border px-2 py-1 font-mono text-xs font-medium">
                    {entry.license_plate}
                  </span>
                }
                subtitle={entry.vehicle_type || undefined}
                trailing={
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-7 w-7"
                      onClick={() => setDeleteTarget(entry.license_plate)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEditOpenEntry(entry)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  </div>
                }
                fields={[
                  {
                    label: "Added",
                    value: entry.created_at
                      ? new Date(entry.created_at).toLocaleDateString()
                      : "-",
                  },
                  {
                    label: "Reason",
                    value: entry.list_status_reason || "-",
                    full: true,
                  },
                ]}
              />
            ))}
          </MobileCardList>

          <DataTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Vehicle Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <span className="bg-muted inline-block rounded-md border px-2 py-1 font-mono text-xs font-medium">
                        {entry.license_plate}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.vehicle_type || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate text-sm">
                      {entry.list_status_reason || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive h-7 w-7"
                          onClick={() => setDeleteTarget(entry.license_plate)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditOpenEntry(entry)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTable>

          <TablePagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={(newPage) => fetchEntries(newPage)}
          />
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from {variant}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this entry from the {variant}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                if (deleteTarget) handleDeleteEntry(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
