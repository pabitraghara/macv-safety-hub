"use client";
import { useState, useEffect } from "react";
import { speedViolationsApi } from "@/api/speed-violations";
import type {
  SpeedViolationSummary,
  SpeedViolationSummaryParams,
} from "@/api/speed-violations";
import { DateRangePickerWithPresets } from "@/components/common/filters/DateRangePicker";
import { DateRange } from "@/components/tremor/inputs/DatePicker";
import {
  BarChart3,
  Calendar,
  Download,
  FileText,
  MapPin,
  Search,
  Truck,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EMPTY_SUMMARY: SpeedViolationSummary = {
  violation: [],
  total_violations: 0,
  average_violation_speed: 0,
  top_vehicles: [],
  top_locations: [],
  top_cameras: [],
};

// Colour communicates severity, not decoration. Violations are the "bad"
// metric (destructive/red) and average speed is a warning (amber); the two
// "top" cards are just labels, so they stay neutral. Every value carries a
// dark-mode variant so nothing stays over-saturated on dark backgrounds.
const ACCENT = {
  danger: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  neutral: "text-muted-foreground",
} as const;

export default function ReportsPage() {
  const [downloadPdfLoading, setDownloadPdfLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [customDateRange, setCustomDateRange] = useState<
    DateRange | undefined
  >();
  const [licensePlate, setLicensePlate] = useState("");
  const [debouncedLicensePlate, setDebouncedLicensePlate] = useState("");
  const [isData, setIsData] = useState<SpeedViolationSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  // Debounce effect for license plate search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLicensePlate(licensePlate);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [licensePlate]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    if (selectedPeriod === "custom" && customDateRange?.from) {
      startDate = new Date(customDateRange.from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customDateRange.to || now);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (selectedPeriod) {
        case "today":
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "1week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "1month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          startDate.setHours(0, 0, 0, 0);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate.setHours(0, 0, 0, 0);
      }
    }

    return { startDate, endDate };
  };

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const params: SpeedViolationSummaryParams = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      };

      if (debouncedLicensePlate.trim()) {
        params.license_plate = debouncedLicensePlate.trim();
      }

      const summary = await speedViolationsApi.getSummary(params);
      setIsData(summary ?? EMPTY_SUMMARY);
    } catch (error) {
      console.error("Error fetching violations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, [selectedPeriod, customDateRange, debouncedLicensePlate]);

  const downloadPdf = async () => {
    const { startDate, endDate } = getDateRange();
    setDownloadPdfLoading(true);
    try {
      const params: SpeedViolationSummaryParams = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      };

      if (debouncedLicensePlate.trim()) {
        params.license_plate = debouncedLicensePlate.trim();
      }

      const blob = await speedViolationsApi.getSummaryPdf(params);
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `violations_summary_${startDate.toISOString()}_${endDate.toISOString()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setDownloadPdfLoading(false);
    }
  };

  // The cards are titled "Top 3" and rankClasses only defines gold/silver/
  // bronze — the API returns the full ranking (up to 20 plates, every camera),
  // so the page has to take the head of it.
  const TOP_N = 3;

  const rankClasses = (index: number) =>
    index === 0
      ? "bg-amber-400 text-amber-950 dark:bg-amber-500"
      : index === 1
        ? "bg-slate-300 text-slate-900 dark:bg-slate-400"
        : "bg-amber-700 text-amber-50 dark:bg-amber-800";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Speed Violations Report"
        description="Analytics and insights for speed violations across your monitoring network"
        actions={
          <Button size="sm" className="h-8" onClick={() => setIsOpen(true)}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />

      {/* Date Range Selection */}
      <Card className="mb-8 px-4 py-4">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">Time Period:</span>
          </div>

          <div className="flex flex-1 flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="h-8 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="1week">Last 7 Days</SelectItem>
                <SelectItem value="1month">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {selectedPeriod === "custom" && (
              <DateRangePickerWithPresets
                value={customDateRange}
                onChange={setCustomDateRange}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Search className="text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by license plate..."
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              className="h-8 min-w-[200px]"
            />
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1 text-sm">
                Total Violations
              </p>
              <p
                className={`text-3xl font-semibold tabular-nums ${ACCENT.danger}`}
              >
                {isData?.total_violations}
              </p>
            </div>
            <BarChart3 className={`h-8 w-8 ${ACCENT.danger}`} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1 text-sm">
                Average Speed
              </p>
              <p
                className={`text-3xl font-semibold tabular-nums ${ACCENT.warning}`}
              >
                {isData?.average_violation_speed}
              </p>
            </div>
            <BarChart3 className={`h-8 w-8 ${ACCENT.warning}`} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1 text-sm">Top Vehicle</p>
              <p className="text-foreground text-lg font-semibold">
                {loading
                  ? "..."
                  : isData?.top_vehicles?.[0]?.numberplate || "N/A"}
              </p>
              <p className="text-muted-foreground text-sm">
                {isData?.top_vehicles?.[0]?.violation_count || 0} violations
              </p>
            </div>
            <Truck className={`h-8 w-8 ${ACCENT.neutral}`} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1 text-sm">Top Location</p>
              <p className="text-foreground text-lg font-semibold">
                {loading
                  ? "..."
                  : isData?.top_locations?.[0]?.location || "N/A"}
              </p>
              <p className="text-muted-foreground text-sm">
                {isData?.top_locations?.[0]?.violation_count || 0} violations
              </p>
            </div>
            <MapPin className={`h-8 w-8 ${ACCENT.neutral}`} />
          </div>
        </Card>
      </div>

      {/* Top 3 Tables */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Top 3 Violation Vehicles */}
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-2">
            <Truck className={`h-5 w-5 ${ACCENT.neutral}`} />
            <h2 className="text-xl font-semibold">Top 3 Violation Vehicles</h2>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-muted h-12 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {isData?.top_vehicles?.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No violation data available
                </p>
              ) : (
                isData?.top_vehicles?.slice(0, TOP_N).map((vehicle, index) => (
                  <div
                    key={vehicle.numberplate}
                    className="bg-muted flex items-center justify-between rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${rankClasses(index)}`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium">
                          {vehicle.numberplate}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold tabular-nums ${ACCENT.danger}`}
                      >
                        {vehicle.violation_count}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        violations
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        {/* Top 3 Cameras */}
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-2">
            <MapPin className={`h-5 w-5 ${ACCENT.neutral}`} />
            <h2 className="text-xl font-semibold">Top 3 Cameras</h2>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-muted h-12 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(isData?.top_cameras?.length || 0) === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No location data available
                </p>
              ) : (
                isData?.top_cameras?.slice(0, TOP_N).map((camera, index) => (
                  <div
                    key={camera?.camera_name}
                    className="bg-muted flex items-center justify-between rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${rankClasses(index)}`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {camera?.camera_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold tabular-nums ${ACCENT.danger}`}
                      >
                        {camera?.violation_count}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        violations
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Speed Violations Report</DialogTitle>
            <DialogDescription>
              Choose the export format for the speed violations report including
              summary statistics and top violation data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  await downloadPdf(); // wait for the download to finish
                } catch (error) {
                  console.error("Download failed:", error);
                } finally {
                  setIsOpen(false); // close modal after download completes (success or failure)
                }
              }}
            >
              <FileText className="h-4 w-4" />
              {downloadPdfLoading ? "Downloading..." : "Export PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
