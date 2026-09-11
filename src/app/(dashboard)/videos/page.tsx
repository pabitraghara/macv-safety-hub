"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useVideoUploads,
  type VideoUploadResponse,
  type VideoUploadStatus,
} from "@/api/video-uploads";

const STATUS_FILTER_OPTIONS: {
  value: VideoUploadStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "uploaded", label: "Uploaded" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

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

function formatDate(dateString: string | null) {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "MMM dd, HH:mm");
  } catch {
    return "Invalid date";
  }
}

function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: {
    total_items: number;
    page_size: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  onPageChange: (page: number) => void;
}) {
  if (pagination.total_pages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-between border-t pt-4">
      <div className="text-muted-foreground text-sm">
        <span className="font-medium">
          {Math.min(
            (pagination.current_page - 1) * pagination.page_size + 1,
            pagination.total_items,
          )}
        </span>
        <span> – </span>
        <span className="font-medium">
          {Math.min(
            pagination.current_page * pagination.page_size,
            pagination.total_items,
          )}
        </span>
        <span> of </span>
        <span className="font-medium">{pagination.total_items}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.current_page - 1)}
          disabled={!pagination.has_previous}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {pagination.current_page} of {pagination.total_pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.current_page + 1)}
          disabled={!pagination.has_next}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function VideoLibraryPage() {
  const router = useRouter();
  const { data, pagination, loading, error, params, refetch, setParams } =
    useVideoUploads();

  const statusValue = params.status ?? "all";

  const handleStatusChange = (value: string) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      status: value === "all" ? undefined : (value as VideoUploadStatus),
    }));
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  const handleRowClick = (video: VideoUploadResponse) => {
    router.push(`/videos/${video.code}`);
  };

  return (
    <div className="mx-auto w-full max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Video Library</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            All uploaded videos and their processing status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusValue} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="h-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button asChild size="sm" className="h-9 gap-1.5">
            <Link href="/videos/upload">
              <Plus className="h-4 w-4" />
              Upload
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-3 text-sm">{error}</p>
            <Button onClick={refetch} variant="outline" size="sm">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : loading && data.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-16 text-center text-sm">
            Loading videos…
          </CardContent>
        </Card>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4 text-sm">
              No videos uploaded yet.
            </p>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/videos/upload">
                <Plus className="h-4 w-4" />
                Upload your first video
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Code</TableHead>
                      <TableHead className="min-w-[200px]">Name</TableHead>
                      <TableHead className="w-[140px]">Site</TableHead>
                      <TableHead className="w-[160px]">Footage start</TableHead>
                      <TableHead className="w-[120px] text-center">
                        Status
                      </TableHead>
                      <TableHead className="w-[140px]">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((video) => (
                      <TableRow
                        key={video.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleRowClick(video)}
                      >
                        <TableCell className="font-mono text-xs">
                          {video.code}
                        </TableCell>
                        <TableCell className="font-medium">
                          {video.name ?? (
                            <span className="text-muted-foreground italic">
                              Untitled
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {video.site_id}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(video.footage_timestamp)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={getStatusColor(video.status)}
                          >
                            {video.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(video.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <PaginationControls
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
