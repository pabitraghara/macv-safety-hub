"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { observationsApi } from "@/api/observations";
import { useMySites } from "@/api/sites";
import { toast } from "sonner";
import { ArrowLeft, Download } from "lucide-react";
import type {
  ExportValidationsParams,
  ValidationDecision,
} from "@/api/observations/types";

export default function ExportValidationsPage() {
  const router = useRouter();
  const { sites } = useMySites();

  const [format, setFormat] = useState<"json" | "csv">("csv");
  const [decision, setDecision] = useState<ValidationDecision | "all">("all");
  const [since, setSince] = useState("");
  const [siteId, setSiteId] = useState("all");
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const params: ExportValidationsParams = { format };
      if (decision !== "all") params.decision = decision;
      if (since) params.since = new Date(since).toISOString();
      if (siteId !== "all") params.site_id = siteId;

      const blob = await observationsApi.exportValidations(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = format === "csv" ? "csv" : "json";
      a.href = url;
      a.download = `validations_${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/observations/validate")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to queue
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Export Validation Data
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Download labeled validation records for ML model fine-tuning.
        </p>
      </div>

      <div className="space-y-5 rounded-lg border bg-white p-5">
        <div className="space-y-1.5">
          <Label>Format</Label>
          <Select
            value={format}
            onValueChange={(v) => setFormat(v as "json" | "csv")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                CSV (recommended for pandas / spreadsheets)
              </SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Decision filter</Label>
          <Select
            value={decision}
            onValueChange={(v) => setDecision(v as ValidationDecision | "all")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All decisions</SelectItem>
              <SelectItem value="true_positive">True positives only</SelectItem>
              <SelectItem value="false_positive">
                False positives only
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Site</Label>
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sites</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>
            Validated since{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </Label>
          <Input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
          />
        </div>

        <Button className="w-full" onClick={handleDownload} disabled={loading}>
          <Download className="mr-2 h-4 w-4" />
          {loading ? "Downloading…" : "Download"}
        </Button>
      </div>
    </div>
  );
}
