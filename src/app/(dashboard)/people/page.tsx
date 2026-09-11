"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import debounce from "lodash.debounce";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import ErrorAlert from "@/components/common/ErrorAlert";
import PageHeader from "@/components/common/PageHeader";
import ToggleSwitch from "@/components/common/ToggleSwitch";
import {
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  RefreshCw,
  Upload,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import AddPeopleModal from "@/components/domain/people/AddPeopleModal";
import DeleteConfirmationModal from "@/components/common/DeleteConfirmationModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { peopleApi } from "@/api/people";
import type { Person, PersonVehicleSummary } from "@/api/people";
import { vehiclesApi } from "@/api/vehicles";
import { ApiError } from "@/api/base/errors";

interface ListMetadata {
  total_count: number;
  page: number;
  page_size: number;
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

export default function PeoplePage() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [metadata, setMetadata] = useState<ListMetadata>({
    total_count: 0,
    page: 1,
    page_size: 20,
  });
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [strictSearch, setStrictSearch] = useState(false);
  const [vehiclesCache, setVehiclesCache] = useState<
    Record<string, PersonVehicleSummary[]>
  >({});
  const [loadingVehicleIds, setLoadingVehicleIds] = useState<Set<string>>(
    new Set(),
  );
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isAddPeopleOpen, setIsAddPeopleOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Partial<Person>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSearchMode = searchTerm.trim().length > 0;

  const queryKey = useMemo(
    () =>
      JSON.stringify({
        searchTerm: searchTerm.trim(),
        strictSearch,
        page,
        pageSize,
        sortBy,
        sortOrder,
      }),
    [searchTerm, strictSearch, page, pageSize, sortBy, sortOrder],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchPeople = useCallback(
    debounce(
      async (params: {
        searchMode: boolean;
        term: string;
        strict: boolean;
        page: number;
        pageSize: number;
        sortBy: string;
        sortOrder: "asc" | "desc";
      }) => {
        setIsLoading(true);
        try {
          if (params.searchMode) {
            const response = await peopleApi.searchPeople({
              q: params.term,
              limit: params.pageSize,
              strict_search: params.strict,
            });
            setPeople(response.data ?? []);
            setMetadata({
              total_count: response.count ?? 0,
              page: 1,
              page_size: params.pageSize,
            });
          } else {
            const response = await peopleApi.getPeople({
              page: params.page,
              page_size: params.pageSize,
              sort_field: params.sortBy,
              sort_direction: params.sortOrder === "asc" ? 1 : -1,
            });
            setPeople(response.items ?? []);
            setMetadata({
              total_count: response.pagination?.total_items ?? 0,
              page: response.pagination?.current_page ?? params.page,
              page_size: response.pagination?.page_size ?? params.pageSize,
            });
          }
          setError(null);
        } catch (err) {
          const message =
            err instanceof ApiError
              ? err.message
              : "Failed to fetch people. Please try again.";
          setError(message);
        } finally {
          setIsLoading(false);
        }
      },
      300,
    ),
    [],
  );

  const reload = useCallback(() => {
    setIsLoading(true);
    fetchPeople({
      searchMode: isSearchMode,
      term: searchTerm.trim(),
      strict: strictSearch,
      page,
      pageSize,
      sortBy,
      sortOrder,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const fetchPersonVehicles = useCallback(async (personId: string) => {
    setLoadingVehicleIds((prev) => new Set(prev).add(personId));
    try {
      const response = await peopleApi.getPerson(personId);
      setVehiclesCache((prev) => ({
        ...prev,
        [personId]: response.vehicles ?? [],
      }));
    } catch {
      toast.error("Failed to load linked vehicles.");
    } finally {
      setLoadingVehicleIds((prev) => {
        const next = new Set(prev);
        next.delete(personId);
        return next;
      });
    }
  }, []);

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const toggleRowExpansion = (e: React.MouseEvent, personId: string) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(personId)) {
      newExpanded.delete(personId);
    } else {
      newExpanded.add(personId);
      if (!vehiclesCache[personId]) fetchPersonVehicles(personId);
    }
    setExpandedRows(newExpanded);
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Please select a CSV file");
      return;
    }
    setIsImporting(true);
    try {
      await vehiclesApi.bulkImportVehicles(importFile);
      toast.success("Vehicle registrations imported successfully!");
      setIsImportOpen(false);
      setImportFile(null);
      reload();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to import CSV";
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleEdit = (person: Person) => {
    setEditingRowId(person.id);
    setEditedValues({
      name: person.name,
      department: person.department,
      phone: person.phone,
      email: person.email,
    });
  };

  const handleCancel = () => {
    setEditingRowId(null);
    setEditedValues({});
  };

  const handleSave = async (personId: string) => {
    setIsSaving(true);
    try {
      await peopleApi.updatePerson(personId, {
        name: editedValues.name ?? undefined,
        department: editedValues.department,
        phone: editedValues.phone,
        email: editedValues.email,
      });
      setPeople((prev) =>
        prev.map((p) => (p.id === personId ? { ...p, ...editedValues } : p)),
      );
      toast.success("Person updated successfully!");
      setEditingRowId(null);
      setEditedValues({});
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to update person";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field: keyof Person, value: string) => {
    setEditedValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleDelete = (e: React.MouseEvent, person: Person) => {
    e.stopPropagation();
    setPersonToDelete(person);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!personToDelete) return;
    setIsDeleting(true);
    try {
      await peopleApi.deletePerson(personToDelete.id);
      setPeople((prev) => prev.filter((p) => p.id !== personToDelete.id));
      setMetadata((prev) => ({
        ...prev,
        total_count: Math.max(prev.total_count - 1, 0),
      }));
      toast.success("Person removed successfully!");
      setShowDeleteModal(false);
      setPersonToDelete(null);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to remove person";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    const isActive = sortBy === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className="text-muted-foreground hover:text-foreground ml-1 inline-flex items-center"
      >
        {isActive && sortOrder === "asc" ? (
          <ChevronUp className="h-4 w-4" />
        ) : isActive && sortOrder === "desc" ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <div className="flex flex-col">
            <ChevronUp className="-mb-1 h-3 w-3 opacity-30" />
            <ChevronDown className="h-3 w-3 opacity-30" />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <PageHeader title="People" />

      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="h-8 w-full sm:w-64"
          />
          <ToggleSwitch
            isEnabled={strictSearch}
            onToggle={setStrictSearch}
            enabledTitle="Exact match enabled"
            disabledTitle="Exact match disabled"
            enabledMessage="Exact match enabled"
            disabledMessage="Exact match disabled"
            enabledLabel="Exact match"
            disabledLabel="Exact match"
          />
          <Select
            value={String(pageSize)}
            onValueChange={(value) => handlePageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={isLoading}
            onClick={reload}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setIsImportOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            size="sm"
            className="h-8"
            onClick={() => setIsAddPeopleOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add People
          </Button>
        </div>
      </div>

      <div>
        {isLoading && <LoadingSpinner label="Loading people..." />}
        {!isLoading && error && <ErrorAlert message={error} onRetry={reload} />}
        {!isLoading && !error && people.length === 0 && (
          <EmptyState
            title="No people found"
            message="No people match the current search or filters."
          />
        )}
        {!isLoading && !error && people.length > 0 && (
          <>
            <MobileCardList>
              {people.map((person) => {
                const isEditing = editingRowId === person.id;
                return (
                  <RecordCard
                    key={person.id}
                    onClick={
                      isEditing
                        ? undefined
                        : () => router.push(`/people/${person.id}`)
                    }
                    media={
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">
                          {getInitials(person.name)}
                        </AvatarFallback>
                      </Avatar>
                    }
                    title={
                      isEditing ? (
                        <Input
                          type="text"
                          value={editedValues.name ?? ""}
                          onChange={(e) =>
                            handleFieldChange("name", e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="h-8"
                        />
                      ) : (
                        person.name || "N/A"
                      )
                    }
                    subtitle={
                      isEditing ? undefined : (
                        <span className="font-mono">
                          {person.employee_id ?? "-"}
                        </span>
                      )
                    }
                    trailing={
                      isEditing ? (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 dark:text-green-400"
                            onClick={() => handleSave(person.id)}
                            disabled={isSaving}
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-8 w-8 p-0"
                            onClick={handleCancel}
                            disabled={isSaving}
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-100 text-blue-800 tabular-nums dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                          >
                            {person.vehicle_count}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(person)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-8 w-8 p-0"
                            onClick={(e) => handleDelete(e, person)}
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    }
                    fields={[
                      {
                        label: "Department",
                        value: isEditing ? (
                          <Input
                            type="text"
                            value={editedValues.department ?? ""}
                            onChange={(e) =>
                              handleFieldChange("department", e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="h-8"
                          />
                        ) : (
                          (person.department ?? "-")
                        ),
                        full: isEditing,
                      },
                      {
                        label: "Phone",
                        value: isEditing ? (
                          <Input
                            type="text"
                            value={editedValues.phone ?? ""}
                            onChange={(e) =>
                              handleFieldChange("phone", e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="h-8"
                          />
                        ) : (
                          (person.phone ?? "-")
                        ),
                        full: isEditing,
                      },
                    ]}
                    footer={
                      <div onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground h-8 px-0"
                          onClick={(e) => toggleRowExpansion(e, person.id)}
                        >
                          {expandedRows.has(person.id) ? (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              <span>Hide Vehicles</span>
                            </>
                          ) : (
                            <>
                              <ChevronRight className="h-4 w-4" />
                              <span>Show Vehicles</span>
                            </>
                          )}
                        </Button>
                        {expandedRows.has(person.id) &&
                          (loadingVehicleIds.has(person.id) ? (
                            <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Loading vehicles...</span>
                            </div>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {vehiclesCache[person.id]
                                ?.filter((v) => v?.license_plate)
                                .map((vehicle) => (
                                  <div
                                    key={vehicle.id}
                                    onClick={() =>
                                      router.push(
                                        `/vehicles/${encodeURIComponent(vehicle.license_plate)}`,
                                      )
                                    }
                                    className="bg-card hover:bg-accent flex cursor-pointer flex-wrap items-center gap-2 rounded-md border p-3 transition-colors"
                                  >
                                    <span className="bg-muted rounded-md border px-2 py-1 font-mono text-xs font-medium">
                                      {vehicle.license_plate}
                                    </span>
                                    <span className="text-muted-foreground text-sm">
                                      {[
                                        vehicle.vehicle_type,
                                        vehicle.vehicle_make,
                                        vehicle.vehicle_model,
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          ))}
                      </div>
                    }
                  />
                );
              })}
            </MobileCardList>

            <DataTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">
                      <span className="sr-only">Expand</span>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        Name
                        <SortIcon field="name" />
                      </div>
                    </TableHead>
                    <TableHead>Employee Id</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Vehicles</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people.map((person) => (
                    <React.Fragment key={person.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => router.push(`/people/${person.id}`)}
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground h-8"
                            onClick={(e) => toggleRowExpansion(e, person.id)}
                          >
                            {expandedRows.has(person.id) ? (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                <span>Hide Vehicles</span>
                              </>
                            ) : (
                              <>
                                <ChevronRight className="h-4 w-4" />
                                <span>Show Vehicles</span>
                              </>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(person.name)}
                              </AvatarFallback>
                            </Avatar>
                            {editingRowId === person.id ? (
                              <Input
                                type="text"
                                value={editedValues.name ?? ""}
                                onChange={(e) =>
                                  handleFieldChange("name", e.target.value)
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="h-8"
                              />
                            ) : (
                              <span className="text-sm font-medium">
                                {person.name || "N/A"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {person.employee_id ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {editingRowId === person.id ? (
                            <Input
                              type="text"
                              value={editedValues.department ?? ""}
                              onChange={(e) =>
                                handleFieldChange("department", e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="h-8"
                            />
                          ) : (
                            (person.department ?? "-")
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {editingRowId === person.id ? (
                            <Input
                              type="text"
                              value={editedValues.phone ?? ""}
                              onChange={(e) =>
                                handleFieldChange("phone", e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="h-8"
                            />
                          ) : (
                            (person.phone ?? "-")
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-100 text-blue-800 tabular-nums dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                          >
                            {person.vehicle_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {editingRowId === person.id ? (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 dark:text-green-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSave(person.id);
                                }}
                                disabled={isSaving}
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancel();
                                }}
                                disabled={isSaving}
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(person);
                                }}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                onClick={(e) => handleDelete(e, person)}
                                title="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(person.id) && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={7} className="bg-muted/50">
                            <div className="ml-12 py-2">
                              {loadingVehicleIds.has(person.id) ? (
                                <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Loading vehicles...</span>
                                </div>
                              ) : (
                                <>
                                  <h4 className="mb-2 text-sm font-semibold">
                                    Linked Vehicles (
                                    {vehiclesCache[person.id]?.filter(
                                      (v) => v?.license_plate,
                                    ).length ?? 0}
                                    )
                                  </h4>
                                  <div className="space-y-2">
                                    {vehiclesCache[person.id]?.map(
                                      (vehicle) => (
                                        <div
                                          key={vehicle.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(
                                              `/vehicles/${encodeURIComponent(vehicle.license_plate)}`,
                                            );
                                          }}
                                          className="bg-card hover:bg-accent flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors"
                                        >
                                          <div className="flex items-center gap-4">
                                            <span className="bg-muted rounded-md border px-2 py-1 font-mono text-xs font-medium">
                                              {vehicle.license_plate}
                                            </span>
                                            <span className="text-muted-foreground text-sm">
                                              {[
                                                vehicle.vehicle_type,
                                                vehicle.vehicle_make,
                                                vehicle.vehicle_model,
                                              ]
                                                .filter(Boolean)
                                                .join(" ")}
                                            </span>
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </DataTable>

            {!isSearchMode && (
              <TablePagination
                page={metadata.page}
                pageSize={metadata.page_size}
                totalCount={metadata.total_count}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Vehicle Registrations</DialogTitle>
            <DialogDescription>
              Bulk import vehicle registrations from a CSV file.
            </DialogDescription>
          </DialogHeader>
          <div>
            <p className="mb-2 text-sm font-medium">CSV File Format</p>
            <div className="text-muted-foreground bg-muted mb-3 max-h-64 overflow-y-auto rounded-md p-3 text-xs">
              <p className="mb-1 font-semibold">Required columns:</p>
              <ul className="mb-3 list-inside list-disc space-y-1">
                <li>
                  <strong>license_plate</strong>: License plate number
                </li>
                <li>
                  <strong>owner_name</strong>: Name of the vehicle owner
                </li>
                <li>
                  <strong>employee_id</strong>: Employee ID
                </li>
                <li>
                  <strong>owner_type</strong>: Employee, Contractor, Tenant,
                  Visitor, or Staff
                </li>
                <li>
                  <strong>department</strong>: Department name
                </li>
                <li>
                  <strong>phone</strong>: Phone number
                </li>
                <li>
                  <strong>vehicle_type</strong>: sedan, suv, truck, motorcycle,
                  etc.
                </li>
                <li>
                  <strong>expiry_date</strong>: ISO format (YYYY-MM-DD)
                </li>
              </ul>
              <p className="mb-1 font-semibold">Optional columns:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  <strong>email</strong>: Email address
                </li>
                <li>
                  <strong>make</strong>: Vehicle make
                </li>
                <li>
                  <strong>model</strong>: Vehicle model
                </li>
                <li>
                  <strong>color</strong>: Vehicle color
                </li>
                <li>
                  <strong>year</strong>: Vehicle year
                </li>
              </ul>
            </div>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportOpen(false);
                setImportFile(null);
              }}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !importFile}
            >
              {isImporting ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddPeopleModal
        isOpen={isAddPeopleOpen}
        onClose={() => setIsAddPeopleOpen(false)}
        onSuccess={() => {
          setIsAddPeopleOpen(false);
          reload();
        }}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Remove Person"
        message={`Remove ${personToDelete?.name} from the registry? This deactivates the person along with their linked vehicles.`}
        isLoading={isDeleting}
        confirmButtonText="Remove Person"
      />
    </div>
  );
}
