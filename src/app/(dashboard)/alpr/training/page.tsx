"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Gauge,
  ImageOff,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ScanText,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  usePlateOcrReviewQueue,
  type PlateOcrListParams,
  type PlateOcrReviewAction,
  type PlateOcrSample,
  type PlateOcrSource,
} from "@/api/plate-ocr";
import PageHeader from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { Permission } from "@/lib/permissions";
import { TrainingRuns } from "./training-runs";
import { VerificationRuns } from "./verification-runs";

const PAGE_SIZE = 25;

function confidence(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function sourceLabel(source: PlateOcrSource) {
  return source === "gate_alpr" ? "Gate ALPR" : "Speed detection";
}

function statusClass(status: string) {
  if (status === "disagreement")
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "agreed")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "failed" || status === "missing_evidence")
    return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function EvidenceImage({
  src,
  alt,
  context = false,
}: {
  src: string | null;
  alt: string;
  context?: boolean;
}) {
  if (!src) {
    return (
      <div
        className={`bg-muted flex items-center justify-center ${context ? "aspect-video" : "h-44"}`}
      >
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <ImageOff className="h-4 w-4" /> No image stored
        </div>
      </div>
    );
  }

  return (
    <a href={src} target="_blank" rel="noreferrer" className="block bg-black">
      {/* Evidence URLs can be signed or cross-origin, so Next Image cannot safely optimize them. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={
          context
            ? "aspect-video w-full object-contain"
            : "h-44 w-full object-contain sm:h-52"
        }
      />
    </a>
  );
}

function ReadCard({
  title,
  icon,
  text,
  normalized,
  confidenceValue,
  selected,
}: {
  title: string;
  icon: React.ReactNode;
  text: string | null;
  normalized: string | null;
  confidenceValue: number | null;
  selected?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${selected ? "border-emerald-300 bg-emerald-50/50" : "bg-card"}`}
    >
      <div className="text-muted-foreground mb-3 flex items-center justify-between text-xs font-medium tracking-wide uppercase">
        <span className="flex items-center gap-1.5">
          {icon} {title}
        </span>
        <span>{confidence(confidenceValue)}</span>
      </div>
      <div className="font-mono text-2xl font-semibold tracking-widest">
        {normalized || "NO READ"}
      </div>
      {text && text !== normalized && (
        <p className="text-muted-foreground mt-1 truncate font-mono text-xs">
          Raw: {text}
        </p>
      )}
    </div>
  );
}

function ReviewPanel({
  sample,
  submitting,
  onReview,
  onRequeue,
}: {
  sample: PlateOcrSample;
  submitting: boolean;
  onReview: (
    action: PlateOcrReviewAction,
    correctedText?: string,
    notes?: string,
  ) => Promise<void>;
  onRequeue: () => Promise<void>;
}) {
  const [correction, setCorrection] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-4 rounded-xl border bg-white p-5 dark:bg-slate-950">
      <div>
        <h2 className="font-semibold">Choose the training label</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Only accepted or corrected reads enter a future dataset.
        </p>
      </div>

      <div className="grid gap-2">
        <Button
          variant="outline"
          className="h-auto justify-start py-3"
          disabled={submitting || !sample.normalized_text}
          onClick={() => onReview("accept_edge", undefined, notes)}
        >
          <ScanText className="mr-2 h-4 w-4" />
          Accept edge OCR
          <span className="ml-auto font-mono text-xs">
            {sample.normalized_text || "No read"}
          </span>
        </Button>
        <Button
          variant="outline"
          className="h-auto justify-start py-3"
          disabled={submitting || !sample.gemini_normalized_text}
          onClick={() => onReview("accept_gemini", undefined, notes)}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Accept Gemini
          <span className="ml-auto font-mono text-xs">
            {sample.gemini_normalized_text || "No read"}
          </span>
        </Button>
      </div>

      <div className="space-y-2 border-t pt-4">
        <label htmlFor="plate-correction" className="text-sm font-medium">
          Correct manually
        </label>
        <div className="flex gap-2">
          <Input
            id="plate-correction"
            value={correction}
            maxLength={100}
            onChange={(event) =>
              setCorrection(event.target.value.toUpperCase())
            }
            placeholder="Enter the visible plate"
            className="font-mono uppercase"
          />
          <Button
            disabled={submitting || !correction.trim()}
            onClick={() => onReview("correct", correction, notes)}
          >
            <Check className="h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="review-notes" className="text-sm font-medium">
          Notes{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea
          id="review-notes"
          value={notes}
          maxLength={1000}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Glare, partial plate, wrong crop…"
          className="min-h-20 resize-none"
        />
      </div>

      <Button
        variant="outline"
        className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
        disabled={submitting}
        onClick={() => onReview("exclude", undefined, notes)}
      >
        <X className="mr-2 h-4 w-4" /> Exclude false detection / unreadable crop
      </Button>

      {(sample.verification_status === "failed" ||
        sample.verification_status === "missing_evidence" ||
        sample.verification_status === "no_plate") && (
        <Button
          variant="ghost"
          className="w-full"
          disabled={submitting || !sample.plate_image_url}
          onClick={onRequeue}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Run Gemini again
        </Button>
      )}
    </div>
  );
}

export default function OcrTrainingPage() {
  const { permissions } = useAuth();
  const canManage = permissions.has(Permission.vehicleManage);
  const [pageNumber, setPageNumber] = useState(1);
  const [source, setSource] = useState<PlateOcrSource | "all">("all");
  // Gemini is rollout-gated, so new samples may remain pending until the
  // verifier is enabled. Show the stored corpus by default instead of making
  // a healthy pending queue look empty.
  const [verification, setVerification] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("unreviewed");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const params = useMemo<PlateOcrListParams>(
    () => ({
      page: pageNumber,
      page_size: PAGE_SIZE,
      source_type: source === "all" ? undefined : source,
      verification_status: verification === "all" ? undefined : verification,
      review_status: reviewStatus === "all" ? undefined : reviewStatus,
      search: search || undefined,
      has_plate_image: true,
    }),
    [pageNumber, source, verification, reviewStatus, search],
  );
  const queue = usePlateOcrReviewQueue(params);
  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(0, queue.page.data.length - 1),
  );
  const sample = queue.page.data[safeActiveIndex] ?? null;

  const changeFilter = (change: () => void) => {
    change();
    setPageNumber(1);
    setActiveIndex(0);
  };

  const handleReview = async (
    action: PlateOcrReviewAction,
    correctedText?: string,
    notes?: string,
  ) => {
    if (!sample) return;
    try {
      await queue.review(sample.id, {
        action,
        corrected_text: correctedText?.trim() || undefined,
        notes: notes?.trim() || undefined,
      });
      toast.success(
        action === "exclude" ? "Sample excluded" : "Training label saved",
      );
    } catch {
      toast.error("Could not save this review");
    }
  };

  const handleRequeue = async () => {
    if (!sample) return;
    try {
      await queue.requeue(sample.id);
      toast.success("Gemini verification queued again");
    } catch {
      toast.error("Could not requeue Gemini verification");
    }
  };

  if (!canManage) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center text-center">
        <LockKeyhole className="text-muted-foreground mb-4 h-10 w-10" />
        <h1 className="text-xl font-semibold">OCR training access required</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Ask an administrator for the vehicle management permission.
        </p>
      </div>
    );
  }

  const unreviewed = queue.summary.review_statuses.unreviewed ?? 0;
  const disagreements = queue.summary.verification_statuses.disagreement ?? 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-1 sm:px-4">
      <PageHeader
        title="OCR Review & Training"
        description="Compare edge OCR with Gemini, correct mistakes, and build a trusted license-plate dataset."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Needs review", unreviewed],
          ["Disagreements", disagreements],
          ["Training eligible", queue.summary.training_eligible],
          ["All OCR samples", queue.summary.total],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <VerificationRuns />

      <TrainingRuns eligibleCount={queue.summary.training_eligible} />

      <div className="mb-4 flex flex-col gap-2 rounded-lg border bg-white p-3 lg:flex-row lg:items-center dark:bg-slate-950">
        <Select
          value={verification}
          onValueChange={(value) => changeFilter(() => setVerification(value))}
        >
          <SelectTrigger className="lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Awaiting Gemini</SelectItem>
            <SelectItem value="disagreement">Disagreements</SelectItem>
            <SelectItem value="failed">Gemini failed</SelectItem>
            <SelectItem value="no_plate">Gemini: no plate</SelectItem>
            <SelectItem value="agreed">Agreements</SelectItem>
            <SelectItem value="all">All verification states</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={reviewStatus}
          onValueChange={(value) => changeFilter(() => setReviewStatus(value))}
        >
          <SelectTrigger className="lg:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unreviewed">Unreviewed</SelectItem>
            <SelectItem value="accepted_edge">Accepted edge</SelectItem>
            <SelectItem value="accepted_gemini">Accepted Gemini</SelectItem>
            <SelectItem value="corrected">Corrected</SelectItem>
            <SelectItem value="excluded">Excluded</SelectItem>
            <SelectItem value="all">All review states</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={source}
          onValueChange={(value) =>
            changeFilter(() => setSource(value as PlateOcrSource | "all"))
          }
        >
          <SelectTrigger className="lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Gate + speed</SelectItem>
            <SelectItem value="gate_alpr">Gate ALPR</SelectItem>
            <SelectItem value="speed_violation">Speed detection</SelectItem>
          </SelectContent>
        </Select>
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            changeFilter(() => setSearch(searchDraft.trim()));
          }}
        >
          <Input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search a plate"
            className="min-w-0"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        <Button
          variant="ghost"
          size="icon"
          onClick={queue.refresh}
          title="Refresh"
        >
          <RefreshCw
            className={`h-4 w-4 ${queue.loading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {queue.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {queue.error}
        </div>
      )}

      {queue.loading ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-[620px] rounded-xl" />
          <Skeleton className="h-[460px] rounded-xl" />
        </div>
      ) : !sample ? (
        <div className="rounded-xl border bg-white px-6 py-16 text-center dark:bg-slate-950">
          <CheckCircle2 className="mx-auto mb-4 h-11 w-11 text-emerald-500" />
          <h2 className="text-lg font-semibold">
            No samples match these filters
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Change a filter or refresh once new detections have been verified.
          </p>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-xl border bg-white dark:bg-slate-950">
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
              <Badge variant="outline">{sourceLabel(sample.source_type)}</Badge>
              <Badge
                variant="outline"
                className={statusClass(sample.verification_status)}
              >
                {sample.verification_status.replaceAll("_", " ")}
              </Badge>
              {sample.direction && (
                <Badge variant="secondary">{sample.direction}</Badge>
              )}
              <span className="text-muted-foreground ml-auto text-xs">
                {format(new Date(sample.captured_at), "dd MMM yyyy, HH:mm:ss")}
              </span>
            </div>

            <div className="grid border-b md:grid-cols-2">
              <div className="border-b md:border-r md:border-b-0">
                <div className="text-muted-foreground px-3 py-2 text-xs font-medium tracking-wide uppercase">
                  Plate crop
                </div>
                <EvidenceImage
                  src={sample.plate_image_url}
                  alt="Detected license plate crop"
                />
              </div>
              <div>
                <div className="text-muted-foreground px-3 py-2 text-xs font-medium tracking-wide uppercase">
                  Vehicle context
                </div>
                <EvidenceImage
                  src={sample.context_image_url}
                  alt="Vehicle context"
                  context
                />
              </div>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <ReadCard
                title="Edge model"
                icon={<ScanText className="h-4 w-4" />}
                text={sample.raw_text}
                normalized={sample.normalized_text}
                confidenceValue={sample.ocr_confidence}
                selected={sample.review_status === "accepted_edge"}
              />
              <ReadCard
                title="Gemini"
                icon={<Sparkles className="h-4 w-4" />}
                text={sample.gemini_text}
                normalized={sample.gemini_normalized_text}
                confidenceValue={sample.gemini_confidence}
                selected={sample.review_status === "accepted_gemini"}
              />
            </div>

            <div className="text-muted-foreground grid gap-3 border-t px-4 py-3 text-xs sm:grid-cols-3">
              <span>
                <strong className="text-foreground font-medium">Camera:</strong>{" "}
                {sample.camera_name || sample.device_id || "Unknown"}
              </span>
              <span>
                <strong className="text-foreground font-medium">
                  OCR model:
                </strong>{" "}
                {sample.ocr_model_version || "Unreported"}
              </span>
              <span>
                <strong className="text-foreground font-medium">
                  Edit distance:
                </strong>{" "}
                {sample.verification_edit_distance ?? "—"}
              </span>
              {sample.verification_error && (
                <span className="text-red-700 sm:col-span-3">
                  {sample.verification_error}
                </span>
              )}
            </div>
          </div>

          <ReviewPanel
            key={sample.id}
            sample={sample}
            submitting={queue.submitting}
            onReview={handleReview}
            onRequeue={handleRequeue}
          />
        </div>
      )}

      {!queue.loading && queue.page.data.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Gauge className="h-4 w-4" />
            Showing {safeActiveIndex + 1} of {queue.page.data.length} on page{" "}
            {queue.page.page}
            {queue.submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safeActiveIndex === 0}
              onClick={() => setActiveIndex(safeActiveIndex - 1)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            {safeActiveIndex < queue.page.data.length - 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveIndex(safeActiveIndex + 1)}
              >
                Skip <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={queue.page.page >= queue.page.total_pages}
                onClick={() => {
                  setPageNumber((page) => page + 1);
                  setActiveIndex(0);
                }}
              >
                Next page <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
