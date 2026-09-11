"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronDown,
  Clock,
  Film,
  Link2,
  Loader2,
  Upload as UploadIcon,
  X,
} from "lucide-react";
import {
  ALLOWED_VIDEO_CONTENT_TYPES,
  MAX_VIDEO_BYTES,
  useVideoUploadSubmit,
  type UploadPhase,
} from "@/api/video-uploads";
import { useFilters } from "@/api/filters/hooks";
import { FilterOption } from "@/api/filters/types";

type Option = { value: string; label: string };

const SITES: Option[] = [
  { value: "site-ntpc-2", label: "NTPC Site 2" },
  { value: "site-ntpc-3", label: "NTPC Site 3" },
  { value: "site-tata-1", label: "Tata Steel Plant 1" },
  { value: "site-jsw-vij", label: "JSW Vijayanagar" },
  { value: "site-relpet", label: "Reliance Petrochem" },
];

const USE_CASES: Option[] = [
  { value: "ppe-helmet", label: "PPE — Helmet Detection" },
  { value: "ppe-vest", label: "PPE — Hi-Vis Vest" },
  { value: "ppe-gloves", label: "PPE — Gloves" },
  { value: "fall-protection", label: "Fall Protection / Harness" },
  { value: "restricted-zone", label: "Restricted Zone Intrusion" },
  { value: "fire-smoke", label: "Fire & Smoke Detection" },
  { value: "vehicle-pedestrian", label: "Vehicle–Pedestrian Conflict" },
  { value: "hot-work", label: "Hot Work / Welding" },
  { value: "confined-space", label: "Confined Space Entry" },
];

const REGULATORY_STANDARDS: Option[] = [
  { value: "OSHA 29 CFR 1926", label: "OSHA 29 CFR 1926" },
  { value: "IS 3786", label: "IS 3786 — Indian Factories Act" },
  { value: "IS 3696", label: "IS 3696" },
  { value: "ISO 45001", label: "ISO 45001" },
  { value: "DGMS", label: "DGMS (India — Mines)" },
  { value: "CEA Safety Regulations", label: "CEA Safety Regulations" },
  { value: "NFPA", label: "NFPA" },
];

const ALL_USE_CASE_VALUES = USE_CASES.map((u) => u.value);
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
const FILE_ACCEPT = [...ALLOWED_VIDEO_CONTENT_TYPES, ...VIDEO_EXTENSIONS].join(
  ",",
);
const MAX_VIDEO_GB = MAX_VIDEO_BYTES / (1024 * 1024 * 1024);

type VideoSource = "file" | "url";

function MultiSelect({
  options,
  values,
  onChange,
  placeholder,
  disabled,
}: {
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (value: string) => {
    onChange(
      values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value],
    );
  };

  const selected = options.filter((o) => values.includes(o.value));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            <span
              className={selected.length === 0 ? "text-muted-foreground" : ""}
            >
              {selected.length === 0
                ? placeholder
                : `${selected.length} selected`}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <div className="max-h-64 overflow-y-auto p-1">
            {options.map((option) => {
              const checked = values.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(option.value)}
                  />
                  <span className="flex-1">{option.label}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="gap-1 py-0.5 pr-1 pl-2"
            >
              {option.label}
              <button
                type="button"
                onClick={() => toggle(option.value)}
                className="hover:bg-muted-foreground/20 rounded-sm"
                aria-label={`Remove ${option.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

const PHASE_LABELS: Record<UploadPhase, string> = {
  idle: "",
  presigning: "Requesting upload URL…",
  uploading: "Uploading to storage…",
  registering: "Registering video…",
  polling: "Waiting for transfer to finish…",
  starting: "Starting analysis…",
  done: "Done",
  error: "Failed",
};

function toIsoOrNull(localDateTime: string): string | null {
  if (!localDateTime) return null;
  const d = new Date(localDateTime);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function nowLocalDateTime(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function VideoUploadPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [videoSource, setVideoSource] = useState<VideoSource>("file");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [siteId, setSiteId] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [useCases, setUseCases] = useState<string[]>(ALL_USE_CASE_VALUES);
  const [standards, setStandards] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const { filters } = useFilters("incidents");

  // const { filters } = useFilters("videos");

  const siteOptions: FilterOption[] =
    filters.find((f) => f.id === "site_id")?.options ?? [];

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { submit, reset, phase, progress, error, result } =
    useVideoUploadSubmit();
  const submitting = phase !== "idle" && phase !== "done" && phase !== "error";

  const isValid =
    name.trim().length > 0 &&
    siteId &&
    timestamp &&
    useCases.length > 0 &&
    (videoSource === "file" ? !!videoFile : videoUrl.trim().length > 0);

  useEffect(() => {
    if (phase === "done" && result) {
      router.push(`/videos/${result.code}`);
    }
  }, [phase, result, router]);

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setVideoFile(null);
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(`File exceeds ${MAX_VIDEO_GB} GB limit.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const lowerName = file.name.toLowerCase();
    const extOk = VIDEO_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    const mimeOk =
      !!file.type &&
      ALLOWED_VIDEO_CONTENT_TYPES.includes(
        file.type as (typeof ALLOWED_VIDEO_CONTENT_TYPES)[number],
      );
    if (!extOk && !mimeOk) {
      toast.error(`Unsupported video type: ${file.type || lowerName}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setVideoFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) {
      if (!isValid) toast.error("Please complete the required fields.");
      return;
    }

    try {
      await submit({
        autoStart: false,
        input:
          videoSource === "file"
            ? { kind: "file", file: videoFile! }
            : { kind: "url", url: videoUrl.trim() },
        name: name.trim(),
        site_id: siteId,
        footage_timestamp: toIsoOrNull(timestamp),
        use_case_ids: useCases,
        regulatory_standards: standards,
        user_prompt: description.trim() || null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      toast.error(message);
    }
  };

  const handleReset = () => {
    setName("");
    setVideoFile(null);
    setVideoUrl("");
    setSiteId("");
    setTimestamp("");
    setUseCases(ALL_USE_CASE_VALUES);
    setStandards([]);
    setDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    reset();
  };

  // async function getUseCases() {
  //   try {
  //     const response = await fetch("http://localhost:8000/api/v1/use-cases");

  //     if (!response.ok) {
  //       throw new Error("Failed to fetch use cases");
  //     }

  //     const data = await response.json();
  //     console.log("Use Cases:", data);
  //   } catch (error) {
  //     console.error("Error fetching use cases:", error);
  //   }
  // }

  // getUseCases();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Upload Video</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Submit a video for safety analysis. You&apos;ll be able to start
          processing on the next page.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>
                Video <span className="text-destructive">*</span>
              </Label>

              <div className="bg-muted/50 inline-flex rounded-md border p-0.5">
                <button
                  type="button"
                  onClick={() => setVideoSource("file")}
                  disabled={submitting}
                  className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                    videoSource === "file"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Film className="h-3.5 w-3.5" />
                  File
                </button>
                <button
                  type="button"
                  onClick={() => setVideoSource("url")}
                  disabled={submitting}
                  className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                    videoSource === "url"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  URL
                </button>
              </div>

              {videoSource === "file" ? (
                <div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept={FILE_ACCEPT}
                    onChange={(e) =>
                      handleFileChange(e.target.files?.[0] ?? null)
                    }
                    disabled={submitting}
                    className="cursor-pointer"
                  />
                  {videoFile && (
                    <p className="text-muted-foreground mt-1.5 text-xs">
                      {videoFile.name} ·{" "}
                      {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs">
                    Up to {MAX_VIDEO_GB} GB. MP4, MOV, AVI, MKV, or WebM.
                  </p>
                </div>
              ) : (
                <Input
                  type="url"
                  placeholder="https://example.com/video.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  disabled={submitting}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. NTPC Site 2 Shutdown Day 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="site">
                  Site <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={siteId}
                  onValueChange={setSiteId}
                  disabled={submitting}
                >
                  <SelectTrigger id="site">
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {siteOptions.map((site) => (
                      <SelectItem key={site.value} value={site.value}>
                        {site.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timestamp">
                  Footage start <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="timestamp"
                    type="datetime-local"
                    value={timestamp}
                    onChange={(e) => setTimestamp(e.target.value)}
                    disabled={submitting}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setTimestamp(nowLocalDateTime())}
                    disabled={submitting}
                    title="Use current time"
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Safety use cases <span className="text-destructive">*</span>
              </Label>
              <MultiSelect
                options={USE_CASES}
                values={useCases}
                onChange={setUseCases}
                placeholder="Select use cases to analyze"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label>Regulatory standards</Label>
              <MultiSelect
                options={REGULATORY_STANDARDS}
                values={standards}
                onChange={setStandards}
                placeholder="Select applicable standards"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="e.g. Focus on the unloading bay between minutes 4–12. Ignore vehicles in the parking lot."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={submitting}
              />
            </div>

            {submitting && (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{PHASE_LABELS[phase]}</span>
                </div>
                {phase === "uploading" && (
                  <div className="space-y-1">
                    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {Math.round(progress * 100)}%
                    </p>
                  </div>
                )}
              </div>
            )}

            {phase === "error" && error && (
              <div className="border-destructive/50 bg-destructive/5 text-destructive rounded-md border p-3 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                disabled={submitting}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={!isValid || submitting}
                className="gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadIcon className="h-4 w-4" />
                )}
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
