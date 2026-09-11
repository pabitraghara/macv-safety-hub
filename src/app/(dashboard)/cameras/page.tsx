"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCameras, camerasApi } from "@/api/cameras";
import type { Camera, CameraStatus } from "@/api/cameras/types";
import { ApiError } from "@/api/base/errors";
import { CameraDialog } from "./components/CameraDialog";
import {
  PipelineHealthBadge,
  RelayHealthBadge,
  pipelineHealthText,
} from "./components/PipelineHealthBadge";
import DeleteConfirmationModal from "@/components/common/DeleteConfirmationModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Search,
  Plus,
  Camera as CameraIcon,
  Gauge,
  Trash2,
  Wifi,
  WifiOff,
  Activity,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Permission } from "@/lib/permissions";

function getStatusColor(status: CameraStatus | string) {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800 border-green-200";
    case "Inactive":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "Maintenance":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Faulty":
      return "bg-red-100 text-red-800 border-red-200";
    case "Offline":
      return "bg-orange-100 text-orange-800 border-orange-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function StatusIcon({ status }: { status: CameraStatus | string }) {
  if (status === "Active") return <Wifi className="h-3 w-3" />;
  if (status === "Offline" || status === "Faulty")
    return <WifiOff className="h-3 w-3" />;
  return <Activity className="h-3 w-3" />;
}

function DetectionBadges({ camera }: { camera: Camera }) {
  const types = camera.detection_types ?? [];
  if (types.length === 0)
    return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {types.map((t) => (
        <Badge key={t} variant="outline" className="text-xs">
          {t}
        </Badge>
      ))}
    </div>
  );
}

function SpeedCell({ camera }: { camera: Camera }) {
  if (!camera.speed_config)
    return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Gauge className="text-muted-foreground h-3.5 w-3.5" />
      {camera.speed_config.speed_limit} km/h
    </span>
  );
}

/** Latest calibration-snapshot thumbnail, or a camera-icon placeholder. */
function SnapshotThumb({ camera }: { camera: Camera }) {
  if (!camera.snapshot_url) {
    return (
      <div className="bg-muted flex h-10 w-16 flex-shrink-0 items-center justify-center rounded">
        <CameraIcon className="text-muted-foreground h-4 w-4" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={camera.snapshot_url}
      alt={`${camera.name} snapshot`}
      className="h-10 w-16 flex-shrink-0 rounded object-cover"
    />
  );
}

function CameraCard({
  camera,
  onOpen,
}: {
  camera: Camera;
  onOpen: () => void;
}) {
  return (
    <Card className="mb-3 cursor-pointer" onClick={onOpen}>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <SnapshotThumb camera={camera} />
            <span className="truncate text-sm font-medium">{camera.name}</span>
          </div>
          <Badge
            className={`${getStatusColor(camera.status)} flex flex-shrink-0 items-center gap-1 text-xs`}
            variant="outline"
          >
            <StatusIcon status={camera.status} />
            {camera.status}
          </Badge>
        </div>
        <p className="text-muted-foreground mb-3 font-mono text-xs">
          {camera.ip_address ?? "RTSP only"}
        </p>
        <div className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {camera.site_id && <span>Site assigned</span>}
          {(camera.detection_types ?? []).length > 0 && (
            <span>Detection: {(camera.detection_types ?? []).join(", ")}</span>
          )}
          {pipelineHealthText(camera) && (
            <span className="col-span-2">
              Pipeline: {pipelineHealthText(camera)}
            </span>
          )}
          {camera.speed_config && (
            <span>Limit: {camera.speed_config.speed_limit} km/h</span>
          )}
          {camera.location && (
            <span className="col-span-2 truncate">{camera.location}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
  { label: "Maintenance", value: "Maintenance" },
  { label: "Faulty", value: "Faulty" },
  { label: "Offline", value: "Offline" },
];

export default function CamerasPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Camera | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { permissions } = useAuth();
  const canManage = permissions.has(Permission.cameraUpdate);
  const canDelete = permissions.has(Permission.cameraDelete);

  const {
    data: cameras,
    loading,
    error,
    refetch,
    updateFilters,
  } = useCameras(statusFilter !== "all" ? { status: statusFilter } : {});

  // useCameras captures its argument as INITIAL state only — changing the
  // filter must go through updateFilters or nothing refetches.
  function changeStatusFilter(next: string) {
    setStatusFilter(next);
    updateFilters({ status: next === "all" ? undefined : next });
  }

  const filtered = cameras.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.ip_address ?? "").includes(q) ||
      (c.location ?? "").toLowerCase().includes(q) ||
      (c.zone ?? "").toLowerCase().includes(q) ||
      (c.manufacturer ?? "").toLowerCase().includes(q)
    );
  });

  function openCreate() {
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      setDeleting(true);
      await camerasApi.deleteCamera(toDelete.id);
      toast.success(`Camera '${toDelete.name}' deleted`);
      setToDelete(null);
      refetch();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to delete camera",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Cameras</h1>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search cameras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={changeStatusFilter}>
          <SelectTrigger className="h-8 w-28 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={refetch}
            variant="outline"
            size="sm"
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {canManage && (
            <Button size="sm" className="h-8" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Camera
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="text-muted-foreground">Loading cameras...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="mb-2 font-semibold text-red-600">
                Error loading cameras
              </p>
              <p className="mb-4 text-sm text-red-500">{error}</p>
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
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="py-8 text-center">
              <CameraIcon className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
              <p className="text-muted-foreground text-lg">
                {cameras.length === 0
                  ? "No cameras registered"
                  : "No cameras match your search"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="block md:hidden">
            {filtered.map((camera) => (
              <CameraCard
                key={camera.id}
                camera={camera}
                onOpen={() => router.push(`/cameras/${camera.id}`)}
              />
            ))}
          </div>

          {/* Desktop table */}
          <DataTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Name</TableHead>
                  <TableHead className="w-[140px]">IP Address</TableHead>
                  <TableHead className="w-[110px] text-center">
                    Status
                  </TableHead>
                  <TableHead className="w-[140px]">Detection</TableHead>
                  <TableHead className="w-[130px] text-center">
                    Pipeline
                  </TableHead>
                  <TableHead className="w-[120px] text-center">
                    Speed Limit
                  </TableHead>
                  {canDelete && (
                    <TableHead className="w-[60px] text-right">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((camera) => (
                  <TableRow
                    key={camera.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/cameras/${camera.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <SnapshotThumb camera={camera} />
                        <div>
                          <div className="text-sm font-medium">
                            {camera.name}
                          </div>
                          {camera.location && (
                            <div className="text-muted-foreground max-w-[160px] truncate text-xs">
                              {camera.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {camera.ip_address ?? (
                        <span className="text-muted-foreground font-sans">
                          RTSP only
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={`${getStatusColor(camera.status)} inline-flex items-center gap-1 text-xs`}
                        variant="outline"
                      >
                        <StatusIcon status={camera.status} />
                        {camera.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DetectionBadges camera={camera} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-1">
                        <PipelineHealthBadge camera={camera} />
                        <RelayHealthBadge camera={camera} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <SpeedCell camera={camera} />
                    </TableCell>
                    {canDelete && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive h-8 w-8"
                          aria-label={`Delete ${camera.name}`}
                          onClick={(e) => {
                            // Don't let the row's open-page click fire too.
                            e.stopPropagation();
                            setToDelete(camera);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTable>

          <p className="text-muted-foreground mt-3 text-xs">
            {filtered.length} camera{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== cameras.length &&
              ` (filtered from ${cameras.length})`}
          </p>
        </>
      )}
      <CameraDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={refetch}
      />
      <DeleteConfirmationModal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Camera"
        message={`Delete camera '${toDelete?.name}'? Its speed calibration will be removed with it.`}
        isLoading={deleting}
        confirmButtonText="Delete Camera"
      />
    </div>
  );
}
