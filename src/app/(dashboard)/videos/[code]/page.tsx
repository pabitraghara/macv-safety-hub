"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  videoUploadsApi,
  useVideoUploadByCode,
  type VideoUploadStatus,
} from "@/api/video-uploads";

function getStatusColor(status: VideoUploadStatus) {
  switch (status) {
    case "pending":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "uploaded":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "processing":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "failed":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function formatDateTime(dateString: string | null) {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "MMM dd, yyyy HH:mm");
  } catch {
    return "Invalid date";
  }
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-3 sm:gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-sm sm:col-span-2">{children}</dd>
    </div>
  );
}

export default function VideoDetailPage() {
  const params = useParams();
  const code =
    typeof params.code === "string"
      ? params.code
      : Array.isArray(params.code)
        ? params.code[0]
        : "";

  const { data: video, loading, error, refetch } = useVideoUploadByCode(code);
  const [actionPending, setActionPending] = useState(false);

  const handleStart = async () => {
    if (!video) return;
    setActionPending(true);
    try {
      await videoUploadsApi.start(video.code);
      toast.success("Processing started.");
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start.";
      toast.error(message);
    } finally {
      setActionPending(false);
    }
  };

  const handleRetry = async () => {
    if (!video) return;
    setActionPending(true);
    try {
      await videoUploadsApi.retry(video.code);
      toast.success("Retry queued.");
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to retry.";
      toast.error(message);
    } finally {
      setActionPending(false);
    }
  };

  if (loading && !video) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-3 text-sm">
              {error ?? "Video not found."}
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={refetch} variant="outline" size="sm">
                Retry
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/videos">Back to library</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canStart = video.status === "uploaded";
  const canRetry = video.status === "failed";
  const isProcessing =
    video.status === "pending" || video.status === "processing";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="text-muted-foreground mb-3 flex items-center gap-1 text-sm">
        <Link href="/videos" className="hover:text-foreground">
          Videos
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-mono">{video.code}</span>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">
            {video.name ?? (
              <span className="text-muted-foreground italic">Untitled</span>
            )}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className={getStatusColor(video.status)}>
              {video.status}
            </Badge>
            {isProcessing && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                auto-refreshing
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/videos">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {canStart && (
            <Button
              size="sm"
              onClick={handleStart}
              disabled={actionPending}
              className="gap-1.5"
            >
              {actionPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start processing
            </Button>
          )}
          {canRetry && (
            <Button
              size="sm"
              onClick={handleRetry}
              disabled={actionPending}
              className="gap-1.5"
            >
              {actionPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Retry processing
            </Button>
          )}
        </div>
      </div>

      {video.status === "failed" && video.error_message && (
        <Card className="border-destructive/50 bg-destructive/5 mb-4">
          <CardContent className="text-destructive py-4 text-sm">
            <div className="font-medium">Processing failed</div>
            <div className="mt-1 break-words">{video.error_message}</div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="pt-6">
          <h2 className="mb-2 text-sm font-semibold">Details</h2>
          <dl className="divide-y">
            <DetailRow label="Code">
              <span className="font-mono text-xs">{video.code}</span>
            </DetailRow>
            <DetailRow label="Site">{video.site_id}</DetailRow>
            <DetailRow label="Footage start">
              {formatDateTime(video.footage_timestamp)}
            </DetailRow>
            <DetailRow label="Source">
              {video.source_url ? (
                <a
                  href={video.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary break-all hover:underline"
                >
                  {video.source_url}
                </a>
              ) : video.blob_path ? (
                <span className="font-mono text-xs break-all">
                  {video.blob_path}
                </span>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Use cases">
              {video.use_case_ids.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {video.use_case_ids.map((id) => (
                    <Badge key={id} variant="secondary">
                      {id}
                    </Badge>
                  ))}
                </div>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Regulatory standards">
              {video.regulatory_standards.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {video.regulatory_standards.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              ) : (
                "—"
              )}
            </DetailRow>
            {video.user_prompt && (
              <DetailRow label="Description">
                <p className="break-words whitespace-pre-wrap">
                  {video.user_prompt}
                </p>
              </DetailRow>
            )}
            <DetailRow label="Created">
              {formatDateTime(video.created_at)}
            </DetailRow>
            <DetailRow label="Processing started">
              {formatDateTime(video.processing_started_at)}
            </DetailRow>
            <DetailRow label="Processing completed">
              {formatDateTime(video.processing_completed_at)}
            </DetailRow>
          </dl>
        </CardContent>
      </Card>

      {video.observation_count > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Observations{" "}
                <span className="text-muted-foreground font-normal">
                  ({video.observation_count})
                </span>
              </h2>
            </div>
            <div className="divide-y">
              {video.observations.map((obs) => (
                <Link
                  key={obs.id}
                  href={`/observations/${obs.code}`}
                  className="hover:bg-muted/50 flex items-center gap-3 py-3"
                >
                  {obs.thumbnail_url ? (
                    <img
                      src={obs.thumbnail_url}
                      alt={obs.code}
                      className="h-12 w-16 rounded object-cover"
                    />
                  ) : (
                    <div className="bg-muted h-12 w-16 rounded" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{obs.code}</span>
                      <Badge variant="outline" className="text-xs">
                        {obs.severity}
                      </Badge>
                    </div>
                    {obs.description && (
                      <p className="text-muted-foreground mt-0.5 truncate text-sm">
                        {obs.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="text-muted-foreground h-4 w-4" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
