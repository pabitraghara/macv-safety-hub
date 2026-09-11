"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Pencil, Plus, Server, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { pipelineNodesApi, type PipelineNode } from "@/api/pipeline-nodes";
import { camerasHealth, nodeFreshestAt, nodeLiveness } from "./nodeHealth";
import { sitesApi, type Site } from "@/api/sites";
import { useAuth } from "@/lib/auth-context";
import { Permission } from "@/lib/permissions";
import EmptyState from "@/components/common/EmptyState";
import DeleteConfirmationModal from "@/components/common/DeleteConfirmationModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import NodeDialog from "./NodeDialog";

const LIVENESS_STYLE: Record<string, string> = {
  online: "border-green-200 bg-green-100 text-green-800",
  stale: "border-amber-200 bg-amber-100 text-amber-800",
  offline: "border-gray-200 bg-gray-100 text-gray-600",
};

function LivenessBadge({ node }: { node: PipelineNode }) {
  // Captured once per mount — render stays pure (react-hooks/purity).
  const [now] = useState(() => Date.now());
  const state = nodeLiveness(node, now);
  if (state === "never")
    return <span className="text-muted-foreground">never seen</span>;
  const freshest = nodeFreshestAt(node);
  const ago = freshest
    ? formatDistanceToNow(new Date(freshest), { addSuffix: true })
    : "";
  return (
    <Badge variant="outline" className={`text-xs ${LIVENESS_STYLE[state]}`}>
      {state === "online" ? "online" : `${state} (${ago})`}
    </Badge>
  );
}

function CamerasBadge({ node }: { node: PipelineNode }) {
  const health = camerasHealth(node);
  const style =
    health === "ok"
      ? "text-green-700"
      : health === "degraded"
        ? "text-amber-700"
        : "text-muted-foreground";
  return (
    <span className={`font-mono text-sm ${style}`}>
      {node.cameras_streaming}/{node.cameras_assigned}
    </span>
  );
}

export default function EdgeNodesPage() {
  const router = useRouter();
  const { permissions } = useAuth();
  const canManage = permissions.has(Permission.cameraUpdate);
  const canDelete = permissions.has(Permission.cameraDelete);

  const [nodes, setNodes] = useState<PipelineNode[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PipelineNode | null>(null);
  const [toDelete, setToDelete] = useState<PipelineNode | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refetch = useCallback(() => {
    setLoading(true);
    Promise.all([pipelineNodesApi.getNodes(), sitesApi.getMySites()])
      .then(([nodeList, siteList]) => {
        setNodes(nodeList);
        setSites(siteList);
      })
      .catch(() => toast.error("Failed to load edge nodes"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const siteName = (id: string | null) =>
    sites.find((s) => s.id === id)?.name ?? "—";

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      setDeleting(true);
      await pipelineNodesApi.deleteNode(toDelete.id);
      toast.success(`Node '${toDelete.code}' deleted`);
      setToDelete(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete node");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edge Nodes</h1>
          <p className="text-muted-foreground text-sm">
            One entry per edge server. Cameras are assigned to a node; each box
            polls only its own cameras (<code>SAFETYHUB_NODE</code>).
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Node
          </Button>
        )}
      </div>

      {!loading && nodes.length === 0 ? (
        <EmptyState
          title="No edge nodes"
          message="Create a node for each edge server, then assign cameras to it."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Cameras</TableHead>
                  <TableHead>Liveness</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.map((node) => (
                  <TableRow
                    key={node.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/settings/edge-nodes/${node.id}`)
                    }
                  >
                    <TableCell className="pl-6 font-mono text-sm">
                      <span className="flex items-center gap-2">
                        <Server className="text-muted-foreground h-3.5 w-3.5" />
                        {node.code}
                      </span>
                    </TableCell>
                    <TableCell>{node.name ?? "—"}</TableCell>
                    <TableCell>
                      {node.platform ? (
                        <Badge variant="outline" className="text-xs">
                          {node.platform}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{siteName(node.site_id)}</TableCell>
                    <TableCell>
                      <CamerasBadge node={node} />
                    </TableCell>
                    <TableCell>
                      <LivenessBadge node={node} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {node.running_version ?? "—"}
                    </TableCell>
                    <TableCell
                      className="pr-6 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(node);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToDelete(node)}
                        >
                          <Trash2 className="text-destructive h-4 w-4" />
                        </Button>
                      )}
                      <ChevronRight className="text-muted-foreground ml-1 inline h-4 w-4" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <NodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        node={editing}
        sites={sites}
        onSuccess={refetch}
      />

      <DeleteConfirmationModal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={deleting}
        title={`Delete node '${toDelete?.code}'?`}
        message="Cameras assigned to it stop being served to any box until they are reassigned. The box's SAFETYHUB_NODE will no longer match anything."
      />
    </div>
  );
}
