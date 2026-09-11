"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Server } from "lucide-react";
import { toast } from "sonner";
import { pipelineNodesApi, type PipelineNode } from "@/api/pipeline-nodes";
import { sitesApi, type Site } from "@/api/sites";
import { camerasApi, type Camera } from "@/api/cameras";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EmptyState from "@/components/common/EmptyState";
import {
  formatMb,
  formatPercent,
  formatUptime,
  nodeFreshestAt,
  nodeLiveness,
  usedRatio,
  type Liveness,
} from "../nodeHealth";

const LIVENESS_STYLE: Record<Liveness, string> = {
  online: "border-green-200 bg-green-100 text-green-800",
  stale: "border-amber-200 bg-amber-100 text-amber-800",
  offline: "border-gray-200 bg-gray-100 text-gray-600",
  never: "border-gray-200 bg-gray-100 text-gray-600",
};

function relative(iso: string | null): string {
  if (!iso) return "—";
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

/** GPU thermal headroom: Jetson throttles as it approaches its limit. */
function gpuTempClass(temp: number | null): string {
  if (temp === null) return "";
  if (temp >= 90) return "text-red-600";
  if (temp >= 80) return "text-amber-600";
  return "";
}

function MetricTile({
  label,
  value,
  valueClass,
  children,
}: {
  label: string;
  value: string;
  valueClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`text-lg font-semibold ${valueClass ?? ""}`}>{value}</p>
      {children}
    </div>
  );
}

const PIPELINE_STATUS_STYLE: Record<string, string> = {
  running: "border-green-200 bg-green-100 text-green-800",
  reconnecting: "border-amber-200 bg-amber-100 text-amber-800",
  down: "border-red-200 bg-red-100 text-red-800",
};

export default function EdgeNodeDetailPage() {
  const params = useParams<{ id: string }>();
  const nodeId = params.id;

  const [now] = useState(() => Date.now());
  const [node, setNode] = useState<PipelineNode | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      pipelineNodesApi.getNodes(),
      sitesApi.getMySites(),
      camerasApi.getCameras({ limit: 1000 }),
    ])
      .then(([nodeList, siteList, cameraList]) => {
        if (cancelled) return;
        const found = nodeList.find((n) => n.id === nodeId) ?? null;
        setNode(found);
        setNotFound(found === null);
        setSites(siteList);
        if (found) {
          setCameras(cameraList.filter((c) => c.pipeline_node === found.code));
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load node");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nodeId]);

  const siteName = (id: string | null) =>
    sites.find((s) => s.id === id)?.name ?? "—";

  const backLink = (
    <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
      <Link href="/settings/edge-nodes">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Edge Nodes
      </Link>
    </Button>
  );

  if (!loading && (notFound || !node)) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        {backLink}
        <EmptyState
          title="Node not found"
          message="This edge node may have been deleted."
        />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        {backLink}
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  const liveness = nodeLiveness(node, now);
  const shmRatio = usedRatio(node.shm_used_mb, node.shm_total_mb);
  const streaming = node.cameras_streaming;
  const assigned = node.cameras_assigned;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      {backLink}

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 font-mono text-xl">
              <Server className="text-muted-foreground h-5 w-5" />
              {node.code}
            </CardTitle>
            <Badge
              variant="outline"
              className={`text-xs ${LIVENESS_STYLE[liveness]}`}
            >
              {liveness === "never"
                ? "never seen"
                : liveness === "online"
                  ? "online"
                  : `${liveness} (${relative(nodeFreshestAt(node))})`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Name: </span>
            {node.name ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Platform: </span>
            {node.platform ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Site: </span>
            {siteName(node.site_id)}
          </div>
          <div>
            <span className="text-muted-foreground">Version: </span>
            {node.running_version ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Last check-in: </span>
            {relative(node.checkin_at)}
          </div>
          <div>
            <span className="text-muted-foreground">Last seen: </span>
            {relative(node.last_seen_at)}
          </div>
        </CardContent>
      </Card>

      {/* Capacity snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Host capacity</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricTile
            label="Cameras streaming"
            value={`${streaming} / ${assigned}`}
            valueClass={
              assigned === 0
                ? "text-muted-foreground"
                : streaming < assigned
                  ? "text-amber-600"
                  : "text-green-700"
            }
          />
          <MetricTile
            label="Uptime"
            value={formatUptime(node.uptime_seconds)}
          />
          <MetricTile
            label="GPU temp"
            value={node.gpu_temp_c === null ? "—" : `${node.gpu_temp_c}°C`}
            valueClass={gpuTempClass(node.gpu_temp_c)}
          />
          <MetricTile
            label="Shared memory"
            value={
              shmRatio === null
                ? "—"
                : `${formatMb(node.shm_used_mb)} / ${formatMb(node.shm_total_mb)}`
            }
          >
            {shmRatio !== null && (
              <Progress value={shmRatio} className="h-1.5" />
            )}
          </MetricTile>
          <MetricTile label="CPU" value={formatPercent(node.cpu_percent)}>
            {node.cpu_percent !== null && (
              <Progress value={node.cpu_percent} className="h-1.5" />
            )}
          </MetricTile>
          <MetricTile label="Memory" value={formatPercent(node.mem_percent)}>
            {node.mem_percent !== null && (
              <Progress value={node.mem_percent} className="h-1.5" />
            )}
          </MetricTile>
          <MetricTile label="Disk free" value={formatMb(node.disk_free_mb)} />
        </CardContent>
      </Card>

      {/* Assigned cameras */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Assigned cameras{" "}
            <span className="text-muted-foreground font-normal">
              ({streaming}/{assigned} streaming)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cameras.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              No cameras are assigned to this node.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Camera</TableHead>
                  <TableHead>Detection</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead className="pr-6">Last heartbeat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cameras.map((cam) => (
                  <TableRow key={cam.id}>
                    <TableCell className="pl-6">
                      <Link
                        href={`/cameras/${cam.id}`}
                        className="hover:underline"
                      >
                        {cam.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {cam.detection_types?.join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      {cam.pipeline_status ? (
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            PIPELINE_STATUS_STYLE[cam.pipeline_status] ?? ""
                          }`}
                        >
                          {cam.pipeline_status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground pr-6 text-sm">
                      {relative(cam.pipeline_heartbeat_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
