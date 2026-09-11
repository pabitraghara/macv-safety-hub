"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  pipelineNodesApi,
  type NodePlatform,
  type PipelineNode,
} from "@/api/pipeline-nodes";
import type { Site } from "@/api/sites";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";
const PLATFORMS: NodePlatform[] = ["windows", "jetson", "linux"];

interface NodeDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  node: PipelineNode | null; // null = create
  sites: Site[];
  onSuccess: () => void;
}

export default function NodeDialog({
  open,
  onOpenChange,
  node,
  sites,
  onSuccess,
}: NodeDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<string>(NONE);
  const [siteId, setSiteId] = useState<string>(NONE);
  const [streamBaseUrl, setStreamBaseUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(node?.code ?? "");
    setName(node?.name ?? "");
    setPlatform(node?.platform ?? NONE);
    setSiteId(node?.site_id ?? NONE);
    setStreamBaseUrl(node?.stream_base_url ?? "");
    setNotes(node?.notes ?? "");
  }, [open, node]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      const shared = {
        name: name.trim() || null,
        platform: platform === NONE ? null : (platform as NodePlatform),
        site_id: siteId === NONE ? null : siteId,
        stream_base_url: streamBaseUrl.trim() || null,
        notes: notes.trim() || null,
      };
      if (node) {
        await pipelineNodesApi.updateNode(node.id, shared);
        toast.success(`Node '${node.code}' updated`);
      } else {
        await pipelineNodesApi.createNode({ code: code.trim(), ...shared });
        toast.success(`Node '${code.trim()}' created`);
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save node");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {node ? `Edit node '${node.code}'` : "Add Node"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          {!node && (
            <div className="space-y-1.5">
              <Label htmlFor="node-code">Code</Label>
              <Input
                id="node-code"
                placeholder="road-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={saving}
                required
              />
              <p className="text-muted-foreground text-xs">
                The label the box sets as <code>SAFETYHUB_NODE</code>. Cannot be
                changed later (boxes reference it).
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="node-name">Name</Label>
            <Input
              id="node-name"
              placeholder="Jetty gate server"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select
                value={platform}
                onValueChange={setPlatform}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Site</Label>
              <Select
                value={siteId}
                onValueChange={setSiteId}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="node-stream">Live-stream base URL</Label>
            <Input
              id="node-stream"
              placeholder="http://10.76.11.50:8889"
              value={streamBaseUrl}
              onChange={(e) => setStreamBaseUrl(e.target.value)}
              disabled={saving}
            />
            <p className="text-muted-foreground text-xs">
              The MediaMTX host on this box (site LAN). Used by the Live Streams
              page.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="node-notes">Notes</Label>
            <Textarea
              id="node-notes"
              placeholder="e.g. relay reachable via port-forward :8080 → device :80"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || (!node && !code.trim())}>
              {saving ? "Saving…" : node ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
