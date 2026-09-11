"use client";

import type { Observation, ObservationStatus } from "@/api/observations/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { ViolationTagsDisplay } from "@/components/observations/ViolationTags";
import { ObservationModal } from "@/components/observations/ObservationModal";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

// Helper function to parse raw TXT string into formatted summary + violations array
function parseRawDescription(rawText: string) {
  const violations: { id: string; name: string; category: string }[] = [];
  let summaryText = "";

  if (!rawText) return { summaryText: "No details available.", violations };

  const jsonBlockRegex = /\{'severity':.*?'description':.*?'\}/g;
  const matches = rawText.match(jsonBlockRegex);

  if (matches) {
    matches.forEach((match, idx) => {
      try {
        const validJsonStr = match.replace(/'/g, '"');
        const parsed = JSON.parse(validJsonStr);
        violations.push({
          id: `v-${idx}`,
          name: parsed.name,
          category: parsed.severity,
        });
      } catch (e) {
        const nameMatch = match.match(/'name':\s*'([^']+)'/);
        if (nameMatch) {
          violations.push({
            id: `v-${idx}`,
            name: nameMatch[1],
            category: "Observation",
          });
        }
      }
    });
  }

  if (
    rawText.includes(
      "DESCRIPTION\r\n==================================================",
    )
  ) {
    summaryText = rawText
      .split(
        "DESCRIPTION\r\n==================================================",
      )[1]
      .trim();
  } else {
    summaryText = rawText.slice(0, 150) + "...";
  }

  return { summaryText, violations };
}

function getSeverityColor(severity: string) {
  switch (severity?.toLowerCase()) {
    case "low":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    case "critical":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getStatusColor(status: ObservationStatus) {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    case "confirmed":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "false_positive":
      return "bg-muted text-muted-foreground border-border";
    case "escalated":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), "MMM dd, HH:mm");
  } catch {
    return "Invalid date";
  }
}

export default function ObservationsPage() {
  const router = useRouter();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── PAGINATION STATE ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    async function loadObservations() {
      try {
        const res = await fetch("/observations.json");
        const rawData = await res.json();

        const formattedData: Observation[] = rawData.map((item: any) => {
          const { summaryText, violations } = parseRawDescription(
            item.description,
          );

          return {
            id: item.id,
            code: item.code,
            description: summaryText,
            severity: item.severity,
            review_status: item.status as ObservationStatus,
            timestamp: item.timestamp,
            thumbnail_url: item.videoUrl,
            video_url: item.videoUrl,
            violations: violations,
          };
        });

        setObservations(formattedData);
      } catch (err) {
        console.error("Failed to load observations.json", err);
      } finally {
        setLoading(false);
      }
    }

    loadObservations();
  }, []);

  // Calculate paginated slice
  const totalItems = observations.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const currentObservations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return observations.slice(start, start + pageSize);
  }, [observations, currentPage, pageSize]);

  const observationCodes = observations.map((o) => o.code);

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        Loading observations...
      </div>
    );
  }

  return (
    <>
      <ObservationModal
        code={selectedCode}
        onClose={() => setSelectedCode(null)}
        observationCodes={observationCodes}
        onNavigate={setSelectedCode}
      />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="text-2xl font-semibold">Observations</h1>
            <span className="text-muted-foreground text-sm">
              {totalItems} total
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* <Button
              onClick={() => router.push("/observations/validate")}
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Validate</span>
            </Button> */}
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="h-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DataTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Video Preview</TableHead>
                <TableHead className="w-[160px]">Code</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="w-[100px] text-center">
                  Severity
                </TableHead>
                <TableHead className="w-[120px] text-center">Status</TableHead>
                <TableHead className="w-[180px]">Violations</TableHead>
                <TableHead className="hidden w-[140px] text-center lg:table-cell">
                  Timestamp
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentObservations.map((observation) => (
                <TableRow
                  key={observation.id}
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedCode(observation.code)}
                >
                  <TableCell>
                    <div className="h-16 w-24 overflow-hidden rounded bg-black">
                      <video
                        src={observation.thumbnail_url}
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {observation.code}
                  </TableCell>
                  <TableCell>
                    <div className="text-foreground max-w-[240px] truncate text-sm font-medium">
                      {observation.description}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={getSeverityColor(observation.severity)}
                      variant="outline"
                    >
                      {observation.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={getStatusColor(observation.review_status)}
                      variant="outline"
                    >
                      {observation.review_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ViolationTagsDisplay
                      violations={observation.violations ?? []}
                      max={2}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-center text-xs lg:table-cell">
                    {formatDate(observation.timestamp)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTable>

        {/* ─── PAGINATION CONTROLS ────────────────────────────────────────────── */}
        <div className="mt-4 flex flex-col items-center justify-between gap-4 px-2 sm:flex-row">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span>Rows per page</span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize.toString()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-2">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)}{" "}
              to {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground mr-2 text-sm">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
