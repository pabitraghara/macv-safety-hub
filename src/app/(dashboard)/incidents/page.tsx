"use client";

import { useIncidents } from "@/api/incidents";
import { useFilters } from "@/api/filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MoreHorizontal,
  Calendar,
  Clock,
  RefreshCw,
  Plus,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { FilterBar } from "@/components/filters/filter-bar";
import { AddIncidentDialog } from "@/components/incidents/AddIncidentDialog";
import { useRouter } from "next/navigation";
import type { Incident } from "@/api/incidents/types";

type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_id: string;
};

function getSeverityColor(severity: string) {
  switch (severity?.toLowerCase()) {
    case "low":
      return "bg-green-100 text-green-800 border-green-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case "open":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "in progress":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "resolved":
      return "bg-green-100 text-green-800 border-green-200";
    case "closed":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), "MMM dd");
  } catch {
    return "Invalid date";
  }
}

function getUserInitials(user: User | null | undefined): string {
  if (!user) return "?";
  return (
    `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "?"
  );
}

function IncidentCard({
  incident,
  onClick,
}: {
  incident: Incident;
  onClick: () => void;
}) {
  return (
    <Card
      className="mb-4 cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge
                className={`${getSeverityColor(incident.severity)} text-xs`}
                variant="outline"
              >
                {incident.severity}
              </Badge>
              <Badge
                className={`${getStatusColor(incident.status)} text-xs`}
                variant="outline"
              >
                {incident.status}
              </Badge>
            </div>
            <h3 className="truncate pr-2 text-sm font-medium">
              {incident.title}
            </h3>
            <p className="mt-1 truncate font-mono text-xs text-gray-500">
              {incident.code}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 flex-shrink-0 p-0"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {incident.description && (
          <p className="mb-3 text-sm break-words text-gray-600">
            {incident.description}
          </p>
        )}

        <div className="flex flex-col gap-2 text-xs text-gray-500">
          {incident.occurred_at && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                Occurred: {formatDate(incident.occurred_at)}
              </span>
            </div>
          )}
          {incident.due_by && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                Due: {formatDate(incident.due_by)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: {
    total_items: number;
    page_size: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  onPageChange: (page: number) => void;
}) {
  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const { current_page, total_pages } = pagination;

    if (total_pages > 0) pages.push(1);
    if (current_page > 3) pages.push("ellipsis-start");

    for (
      let i = Math.max(2, current_page - 1);
      i <= Math.min(total_pages - 1, current_page + 1);
      i++
    ) {
      if (!pages.includes(i)) pages.push(i);
    }

    if (current_page < total_pages - 2) pages.push("ellipsis-end");
    if (total_pages > 1) pages.push(total_pages);

    return pages;
  };

  if (pagination.total_pages <= 1) return null;

  const pages = generatePageNumbers();

  return (
    <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-4">
      <div className="text-sm text-gray-600">
        <span className="font-medium">
          {Math.min(
            (pagination.current_page - 1) * pagination.page_size + 1,
            pagination.total_items,
          )}
        </span>
        <span> - </span>
        <span className="font-medium">
          {Math.min(
            pagination.current_page * pagination.page_size,
            pagination.total_items,
          )}
        </span>
        <span> of </span>
        <span className="font-medium">{pagination.total_items}</span>
        <span> results</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.current_page - 1)}
          disabled={!pagination.has_previous}
          className="h-8"
        >
          Previous
        </Button>

        <div className="flex items-center gap-1">
          {pages.map((page, index) => (
            <div key={index}>
              {page === "ellipsis-start" || page === "ellipsis-end" ? (
                <span className="px-2 py-1 text-gray-400">...</span>
              ) : (
                <Button
                  variant={
                    page === pagination.current_page ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className="h-8 min-w-[32px]"
                >
                  {page}
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.current_page + 1)}
          disabled={!pagination.has_next}
          className="h-8"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function IncidentsPage() {
  const {
    data: incidents,
    pagination,
    loading,
    error,
    refetch,
    goToPage,
    updateGenericFilters,
  } = useIncidents();
  const { filters, loading: filtersLoading } = useFilters("incidents");
  const router = useRouter();

  const handleIncidentClick = (incident: Incident) => {
    router.push(`/incidents/${incident.code}`);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Incidents</h1>
        </div>
      </div>

      <FilterBar
        key="incidents-filter-bar"
        filters={filters}
        onFiltersChange={updateGenericFilters}
        loading={filtersLoading}
        filterKey="incidents"
        actionButtons={
          <>
            <Button
              onClick={refetch}
              variant="outline"
              size="sm"
              disabled={loading}
              className="h-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <AddIncidentDialog onSuccess={refetch}>
              <Button size="sm" disabled={loading} className="h-8">
                <Plus className="h-4 w-4" />
              </Button>
            </AddIncidentDialog>
            <Button variant="outline" size="sm" className="h-8">
              <Settings className="h-4 w-4" />
              Display
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Loading incidents...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-2 text-lg font-semibold text-red-600">
                Error Loading Incidents
              </div>
              <p className="mb-4 text-sm break-words text-red-500 sm:text-base">
                {error}
              </p>
              <Button
                onClick={refetch}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !incidents || incidents.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="py-8 text-center">
              <p className="text-lg text-gray-600">No incidents found</p>
              <p className="mt-2 text-gray-500">
                Create your first incident to get started
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block md:hidden">
            {incidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onClick={() => handleIncidentClick(incident)}
              />
            ))}
          </div>

          {/* Desktop Table View */}
          <DataTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead className="min-w-[200px]">Title</TableHead>
                  <TableHead className="w-[100px] text-center">
                    Severity
                  </TableHead>
                  <TableHead className="w-[100px] text-center">
                    Status
                  </TableHead>
                  <TableHead className="hidden w-[100px] text-center lg:table-cell">
                    Occurred
                  </TableHead>
                  <TableHead className="hidden w-[100px] text-center lg:table-cell">
                    Due By
                  </TableHead>
                  <TableHead className="w-[60px] text-center">
                    Assignee
                  </TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow
                    key={incident.id}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => handleIncidentClick(incident)}
                  >
                    <TableCell className="font-mono text-xs">
                      {incident.code}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">
                          {incident.title}
                        </div>
                        {incident.description && (
                          <div className="max-w-[150px] truncate text-xs text-gray-500">
                            {incident.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={getSeverityColor(incident.severity)}
                        variant="outline"
                      >
                        {incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={getStatusColor(incident.status)}
                        variant="outline"
                      >
                        {incident.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-center text-xs lg:table-cell">
                      {formatDate(incident.occurred_at)}
                    </TableCell>
                    <TableCell className="hidden text-center text-xs lg:table-cell">
                      {formatDate(incident.due_by)}
                    </TableCell>
                    <TableCell className="text-center">
                      {incident.assignee ? (
                        <Avatar className="mx-auto h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getUserInitials(incident.assignee as User)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                          <span className="text-xs text-gray-400">?</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTable>

          <PaginationControls pagination={pagination} onPageChange={goToPage} />
        </>
      )}
    </div>
  );
}
