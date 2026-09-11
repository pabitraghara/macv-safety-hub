"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import debounce from "lodash.debounce";
import ToggleSwitch from "@/components/common/ToggleSwitch";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import ErrorAlert from "@/components/common/ErrorAlert";
import PageHeader from "@/components/common/PageHeader";
import { TablePagination } from "@/components/common/TablePagination";
import VehicleActionMenu from "@/components/domain/vehicles/VehicleActionMenu";
import VehicleListActionModal from "@/components/domain/vehicles/VehicleListActionModal";
import EditVehicleModal from "@/components/domain/vehicles/EditVehicleModal";
import AddVehicleModal from "@/components/domain/people/AddVehicleModal";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { vehiclesApi } from "@/api/vehicles";
import type { Vehicle } from "@/api/vehicles";
import { ApiError } from "@/api/base/errors";

interface RegistryMetadata {
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export default function VehicleRegistryPage() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [strictSearch, setStrictSearch] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [metadata, setMetadata] = useState<RegistryMetadata>({
    total_count: 0,
    page: 1,
    page_size: 20,
    total_pages: 0,
  });

  const isSearchMode = searchTerm.trim().length > 0;

  const listParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      sort_by: "total_violations",
      sort_order: "desc" as const,
    }),
    [page, pageSize],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchVehicles = useCallback(
    debounce(
      async (params: {
        searchMode: boolean;
        term: string;
        fuzzy: boolean;
        page: number;
        pageSize: number;
      }) => {
        setIsLoading(true);
        try {
          if (params.searchMode) {
            const response = await vehiclesApi.searchVehicles({
              q: params.term,
              limit: params.pageSize,
              fuzzy: params.fuzzy,
            });
            setVehicles(response.data ?? []);
            setMetadata({
              total_count: response.count ?? response.data?.length ?? 0,
              page: 1,
              page_size: params.pageSize,
              total_pages: 1,
            });
          } else {
            const response = await vehiclesApi.getVehicles({
              page: params.page,
              page_size: params.pageSize,
              sort_by: "total_violations",
              sort_order: "desc",
            });
            setVehicles(response.data ?? []);
            setMetadata({
              total_count: response.metadata?.total_count ?? 0,
              page: response.metadata?.page ?? params.page,
              page_size: response.metadata?.page_size ?? params.pageSize,
              total_pages: response.metadata?.total_pages ?? 0,
            });
          }
          setError(null);
        } catch (err) {
          const message =
            err instanceof ApiError
              ? err.message
              : "Failed to fetch vehicles. Please try again.";
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
    fetchVehicles({
      searchMode: isSearchMode,
      term: searchTerm.trim(),
      fuzzy: !strictSearch,
      page: listParams.page,
      pageSize: listParams.page_size,
    });
  }, [fetchVehicles, isSearchMode, searchTerm, strictSearch, listParams]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<
    "whitelist" | "blacklist" | null
  >(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const handleUserClick = (e: React.MouseEvent, ownerId?: string | null) => {
    e.stopPropagation();
    if (ownerId) router.push(`/people/${ownerId}`);
  };

  const handleWhitelistClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setModalAction("whitelist");
    setIsModalOpen(true);
  };

  const handleBlacklistClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setModalAction("blacklist");
    setIsModalOpen(true);
  };

  const handleViewDetailsClick = (vehicle: Vehicle) => {
    router.push(`/vehicles/${encodeURIComponent(vehicle.license_plate)}`);
  };

  const handleEditClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowEditVehicleModal(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setModalAction(null);
    setSelectedVehicle(null);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Vehicles"
        actions={
          <>
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
              size="sm"
              className="h-8"
              onClick={() => setShowAddVehicleModal(true)}
            >
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          type="text"
          placeholder="Search license plate..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="h-8 w-full sm:w-56"
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

      <div>
        {isLoading && <LoadingSpinner label="Loading vehicles..." />}
        {!isLoading && error && <ErrorAlert message={error} onRetry={reload} />}
        {!isLoading && !error && vehicles.length === 0 && (
          <EmptyState
            title="No vehicles found"
            message="No vehicles found for the selected filters."
          />
        )}
        {!isLoading && !error && vehicles.length > 0 && (
          <>
            <MobileCardList>
              {vehicles
                .filter((vehicle) => vehicle?.license_plate)
                .map((vehicle) => (
                  <RecordCard
                    key={vehicle.id}
                    title={
                      <span className="bg-muted inline-block rounded-md border px-2 py-1 font-mono text-xs font-medium">
                        {vehicle.license_plate}
                      </span>
                    }
                    subtitle={vehicle.vehicle_type ?? undefined}
                    trailing={
                      <VehicleActionMenu
                        vehicle={vehicle}
                        onWhitelistClick={handleWhitelistClick}
                        onBlacklistClick={handleBlacklistClick}
                        onViewDetailsClick={handleViewDetailsClick}
                        onEditClick={handleEditClick}
                      />
                    }
                    fields={[
                      {
                        label: "Owner Name",
                        value: vehicle.owner?.id ? (
                          <button
                            onClick={(e) =>
                              handleUserClick(e, vehicle.owner?.id)
                            }
                            className="text-brand font-medium hover:underline"
                          >
                            {vehicle.owner?.name ?? "-"}
                          </button>
                        ) : (
                          (vehicle.owner?.name ?? "-")
                        ),
                      },
                      { label: "Type", value: vehicle.owner?.type ?? "-" },
                      {
                        label: "Employee Id",
                        value: vehicle.owner?.employee_id ?? "-",
                      },
                      {
                        label: "Department",
                        value: vehicle.owner?.department ?? "-",
                      },
                      {
                        label: "Phone",
                        value: vehicle.owner?.phone ?? "-",
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
                    <TableHead>Owner Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Employee Id</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="w-[60px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles
                    .filter((vehicle) => vehicle?.license_plate)
                    .map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell>
                          <span className="bg-muted inline-block rounded-md border px-2 py-1 font-mono text-xs font-medium">
                            {vehicle.license_plate}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {vehicle.vehicle_type ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {vehicle.owner?.id ? (
                            <button
                              onClick={(e) =>
                                handleUserClick(e, vehicle.owner?.id)
                              }
                              className="text-brand font-medium hover:underline"
                            >
                              {vehicle.owner?.name ?? "-"}
                            </button>
                          ) : (
                            (vehicle.owner?.name ?? "-")
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {vehicle.owner?.type ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {vehicle.owner?.employee_id ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {vehicle.owner?.department ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {vehicle.owner?.phone ?? "-"}
                        </TableCell>
                        <TableCell>
                          <VehicleActionMenu
                            vehicle={vehicle}
                            onWhitelistClick={handleWhitelistClick}
                            onBlacklistClick={handleBlacklistClick}
                            onViewDetailsClick={handleViewDetailsClick}
                            onEditClick={handleEditClick}
                          />
                        </TableCell>
                      </TableRow>
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

      <AddVehicleModal
        isOpen={showAddVehicleModal}
        onClose={() => setShowAddVehicleModal(false)}
        employeeId=""
        onSuccess={() => {
          setShowAddVehicleModal(false);
          reload();
        }}
      />

      <EditVehicleModal
        isOpen={showEditVehicleModal}
        onClose={() => {
          setShowEditVehicleModal(false);
          setSelectedVehicle(null);
        }}
        vehicle={selectedVehicle}
        onSuccess={() => {
          setShowEditVehicleModal(false);
          setSelectedVehicle(null);
          reload();
        }}
      />

      <VehicleListActionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        action={modalAction}
        licensePlate={selectedVehicle?.license_plate ?? null}
        onSuccess={reload}
      />
    </div>
  );
}
