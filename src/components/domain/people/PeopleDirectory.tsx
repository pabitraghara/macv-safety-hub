"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import debounce from "lodash.debounce";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import ErrorAlert from "@/components/common/ErrorAlert";
import PageHeader from "@/components/common/PageHeader";
import ToggleSwitch from "@/components/common/ToggleSwitch";
import { RefreshCw, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
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
import { peopleApi } from "@/api/people";
import type { Person, PersonVehicleSummary } from "@/api/people";
import { ApiError } from "@/api/base/errors";

interface ListMetadata {
  total_count: number;
  page: number;
  page_size: number;
}

interface PeopleDirectoryProps {
  /** Person `type` value to filter by (e.g. "Employee", "Contractor"). */
  personType: string;
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

export default function PeopleDirectory({ personType }: PeopleDirectoryProps) {
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

  const isSearchMode = searchTerm.trim().length > 0;

  const queryKey = useMemo(
    () =>
      JSON.stringify({
        personType,
        term: searchTerm.trim(),
        strictSearch,
        page,
        pageSize,
        sortBy,
        sortOrder,
      }),
    [personType, searchTerm, strictSearch, page, pageSize, sortBy, sortOrder],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchPeople = useCallback(
    debounce(
      async (params: {
        personType: string;
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
            // The search endpoint has no type filter; narrow client-side.
            const filtered = (response.data ?? []).filter(
              (p) => p.type === params.personType,
            );
            setPeople(filtered);
            setMetadata({
              total_count: filtered.length,
              page: 1,
              page_size: params.pageSize,
            });
          } else {
            const response = await peopleApi.getPeople({
              type: params.personType,
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
      personType,
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
              {people.map((person) => (
                <RecordCard
                  key={person.id}
                  onClick={() => router.push(`/people/${person.id}`)}
                  media={
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {getInitials(person.name)}
                      </AvatarFallback>
                    </Avatar>
                  }
                  title={person.name || "N/A"}
                  subtitle={person.type ?? undefined}
                  trailing={
                    <Badge
                      variant="outline"
                      className="border-blue-200 bg-blue-100 text-blue-800 tabular-nums dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                    >
                      {person.vehicle_count}
                    </Badge>
                  }
                  fields={[
                    {
                      label: "Employee Id",
                      value: (
                        <span className="font-mono text-xs">
                          {person.employee_id ?? "-"}
                        </span>
                      ),
                    },
                    { label: "Department", value: person.department ?? "-" },
                    { label: "Phone", value: person.phone ?? "-", full: true },
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
                          <LoadingSpinner label="Loading vehicles..." />
                        ) : (
                          <div className="mt-2 space-y-2">
                            {vehiclesCache[person.id]?.map((vehicle) => (
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
              ))}
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
                    <TableHead>Type</TableHead>
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
                            <span className="text-sm font-medium">
                              {person.name || "N/A"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {person.employee_id ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {person.department ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {person.phone ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-100 text-blue-800 tabular-nums dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                          >
                            {person.vehicle_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {person.type ?? "-"}
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(person.id) && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={7} className="bg-muted/50">
                            <div className="ml-12 py-2">
                              {loadingVehicleIds.has(person.id) ? (
                                <LoadingSpinner label="Loading vehicles..." />
                              ) : (
                                <>
                                  <h4 className="mb-2 text-sm font-semibold">
                                    Linked Vehicles (
                                    {vehiclesCache[person.id]?.length ?? 0})
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
    </div>
  );
}
