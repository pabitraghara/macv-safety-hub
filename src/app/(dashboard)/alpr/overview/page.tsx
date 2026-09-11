"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Download, RefreshCw, Upload } from "lucide-react";
import { alprApi } from "@/api/alpr";
import { useMySites } from "@/api/sites";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import ErrorAlert from "@/components/common/ErrorAlert";
import PageHeader from "@/components/common/PageHeader";
import { DateRangePickerWithPresets } from "@/components/common/filters/DateRangePicker";
import AlprDetectionsTable from "../_components/AlprDetectionsTable";
import CameraMultiSelect from "../_components/CameraMultiSelect";
import {
  normalizeDirection,
  type DirectionFilter,
} from "../_hooks/alprFilters";
import { useAlprDetectionsView } from "../_hooks/useAlprDetectionsView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function Page() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading vehicles..." />}>
      <AlprOverviewPage />
    </Suspense>
  );
}

function AlprOverviewPage() {
  const searchParams = useSearchParams();
  const initialDirection = normalizeDirection(searchParams.get("direction"));
  const view = useAlprDetectionsView({ initialDirection });

  const [isOpen, setIsOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [isExporting, setIsExporting] = useState(false);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSiteId, setImportSiteId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const { sites } = useMySites();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await view.exportData(exportFormat);
      setIsOpen(false);
    } catch {
      // exportData already surfaced a toast — keep the dialog open on failure.
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Please select a CSV file");
      return;
    }
    if (!importSiteId) {
      toast.error("Please select a site");
      return;
    }
    setIsImporting(true);
    try {
      await alprApi.importCsv(importFile, {
        site_id: importSiteId,
        job_id: "csv-import",
      });
      toast.success("CSV imported successfully!");
      setIsImportOpen(false);
      setImportFile(null);
      setImportSiteId("");
      view.refetch();
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Failed to import CSV");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <PageHeader title="Automatic License Plate Recognition" />
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePickerWithPresets
            value={view.dateRange}
            onChange={view.handleDateChange}
            showTimePicker={true}
          />
          <Select
            value={view.direction}
            onValueChange={(value) =>
              view.setDirection(value as DirectionFilter)
            }
          >
            <SelectTrigger className="h-8 w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="entry">Entry</SelectItem>
              <SelectItem value="exit">Exit</SelectItem>
            </SelectContent>
          </Select>
          {view.cameraOptions.length > 0 && (
            <CameraMultiSelect
              options={view.cameraOptions}
              selectedIds={view.selectedCameraIds}
              onChange={view.setSelectedCameraIds}
            />
          )}
          <Select
            value={view.searchType}
            onValueChange={(value) =>
              view.changeSearchType(value as "search" | "name")
            }
          >
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="search">License Plate</SelectItem>
              <SelectItem value="name">Owner Name</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder={
              view.searchType === "search"
                ? "Enter license plate..."
                : "Enter owner name..."
            }
            value={
              view.searchType === "search"
                ? view.licensePlateSearch
                : view.ownerNameSearch
            }
            onChange={(e) => view.setSearch(e.target.value)}
            className="h-8 w-48"
          />
          <Select
            value={String(view.pageSize)}
            onValueChange={(value) => view.handlePageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
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
            onClick={view.refetch}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                view.isLoading || view.isRefreshing ? "animate-spin" : ""
              }`}
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
          <Button size="sm" className="h-8" onClick={() => setIsOpen(true)}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      <div>
        {view.isLoading && <LoadingSpinner label="Loading vehicles..." />}
        {!view.isLoading && view.error && (
          <ErrorAlert message={view.error} onRetry={view.refetch} />
        )}
        {!view.isLoading && !view.error && view.vehicles.length === 0 && (
          <EmptyState
            title="No vehicles found"
            message="No vehicles found for the selected filters."
          />
        )}
        {!view.isLoading && !view.error && view.vehicles.length > 0 && (
          <AlprDetectionsTable
            vehicles={view.vehicles}
            metadata={view.metadata}
            onPageChange={view.handlePageChange}
            summary={view.summary}
            direction={view.direction}
          />
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export ANPR Data</DialogTitle>
            <DialogDescription>
              Export the current list of vehicles.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Export Format
            </label>
            <Select
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value as "csv" | "pdf")}
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">Excel (.xlsx)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import ANPR Data</DialogTitle>
            <DialogDescription>
              Import vehicle entry/exit records from a CSV file.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-2 block text-sm font-medium">
              CSV File Format
            </label>
            <div className="bg-muted text-muted-foreground mb-3 rounded-md p-3 text-xs">
              <p className="mb-1 font-semibold">Required columns:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  <strong>license_plate</strong>: License plate number
                </li>
                <li>
                  <strong>timestamp</strong>: ISO format datetime (e.g.,
                  2025-11-11T10:30:00)
                </li>
                <li>
                  <strong>direction</strong>: &quot;entry&quot; or
                  &quot;exit&quot;
                </li>
              </ul>
            </div>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
            <label className="mt-3 mb-2 block text-sm font-medium">Site</label>
            <Select value={importSiteId} onValueChange={setImportSiteId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportOpen(false);
                setImportFile(null);
                setImportSiteId("");
              }}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !importFile || !importSiteId}
            >
              <Upload className="h-4 w-4" />
              {isImporting ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
