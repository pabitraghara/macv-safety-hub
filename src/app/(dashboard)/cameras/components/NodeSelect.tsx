"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { pipelineNodesApi, type NodePlatform } from "@/api/pipeline-nodes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNASSIGNED = "__unassigned__";
const ADD_NEW = "__add__";
const PLATFORMS: NodePlatform[] = ["windows", "jetson", "linux"];

/**
 * Edge-node select for camera assignment. Nodes are registry rows (one per
 * edge server; a deployment runs several) — a select instead of free text so
 * a typo can never split a fleet. Inline "add node" creates the registry row
 * (team action) and selects it.
 */
export default function NodeSelect({
  value,
  onChange,
  disabled,
}: {
  value: string; // node code, "" = unassigned
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const [codes, setCodes] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newPlatform, setNewPlatform] = useState<NodePlatform | "">("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    pipelineNodesApi
      .getNodes()
      .then((nodes) => {
        if (!cancelled) setCodes(nodes.map((n) => n.code));
      })
      .catch(() => {
        // Listing failing must not block camera creation; the value (if any)
        // is still submitted as-is.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function createNode() {
    const code = newCode.trim();
    if (!code) return;
    try {
      setCreating(true);
      await pipelineNodesApi.createNode({
        code,
        platform: newPlatform || null,
      });
      setCodes((prev) => (prev.includes(code) ? prev : [...prev, code].sort()));
      onChange(code);
      setAdding(false);
      setNewCode("");
      setNewPlatform("");
      toast.success(`Node '${code}' created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create node");
    } finally {
      setCreating(false);
    }
  }

  // A stored value that is not in the fetched list (e.g. list failed) must
  // still render — include it as an option.
  const options =
    value && !codes.includes(value) ? [...codes, value].sort() : codes;

  return (
    <div className="space-y-2">
      <Select
        value={value === "" ? UNASSIGNED : value}
        onValueChange={(next) => {
          if (next === ADD_NEW) {
            setAdding(true);
            return;
          }
          setAdding(false);
          onChange(next === UNASSIGNED ? "" : next);
        }}
        disabled={disabled}
      >
        <SelectTrigger id="cam-node">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>
            Unassigned (any edge server)
          </SelectItem>
          {options.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
          <SelectItem value={ADD_NEW}>
            <span className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New node…
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {adding && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="node code (e.g. road-01)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            disabled={creating}
            className="flex-1"
          />
          <Select
            value={newPlatform}
            onValueChange={(v) => setNewPlatform(v as NodePlatform)}
            disabled={creating}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="platform" />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={createNode}
            disabled={creating || !newCode.trim()}
          >
            {creating ? "Creating…" : "Create"}
          </Button>
        </div>
      )}
    </div>
  );
}
