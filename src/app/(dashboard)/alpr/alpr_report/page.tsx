"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  Download,
  FileDown,
  Printer,
  Truck,
} from "lucide-react";
import {
  alprApi,
  type AlprAnalyticsParams,
  type AlprAnalyticsSummary,
} from "@/api/alpr";
import { useTimezone } from "@/contexts/TimezoneContext";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import { DateRangePickerWithPresets } from "@/components/common/filters/DateRangePicker";
import { DateRange } from "@/components/tremor/inputs/DatePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MobileCardList, RecordCard } from "@/components/common/RecordCard";
import { DataTable } from "@/components/ui/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface HourlyBucket {
  name: string;
  value: number;
}

const EMPTY_SUMMARY: AlprAnalyticsSummary = {
  total_vehicles: 0,
  total_entries: 0,
  total_exits: 0,
  employee_breakdown: { employees: 0, contractors: 0, unknown: 0 },
};

export default function ALPRReportPage() {
  const { timezone } = useTimezone();

  const [downloadPdfLoading, setDownloadPdfLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [customDateRange, setCustomDateRange] = useState<
    DateRange | undefined
  >();
  const [summary, setSummary] = useState<AlprAnalyticsSummary>(EMPTY_SUMMARY);
  const [heatmapData, setHeatmapData] = useState<HourlyBucket[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchALPRData = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = getDateRange();
        const params: AlprAnalyticsParams = {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          timezone,
        };

        const [summaryResponse, heatmapResponse] = await Promise.all([
          alprApi.getAnalyticsSummary(params),
          alprApi.getHeatmap(params),
        ]);

        setSummary({
          total_vehicles: summaryResponse.total_vehicles || 0,
          total_entries: summaryResponse.total_entries || 0,
          total_exits: summaryResponse.total_exits || 0,
          employee_breakdown: {
            employees: summaryResponse.employee_breakdown?.employees || 0,
            contractors: summaryResponse.employee_breakdown?.contractors || 0,
            unknown: summaryResponse.employee_breakdown?.unknown || 0,
          },
        });

        const hourly = heatmapResponse.hourly_breakdown || {};
        setHeatmapData(
          Object.entries(hourly).map(([name, value]) => ({
            name,
            value: value as number,
          })),
        );
      } catch (err) {
        console.error("Error fetching ALPR data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchALPRData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, customDateRange, timezone]);

  const downloadPdf = async () => {
    const { startDate, endDate } = getDateRange();
    setDownloadPdfLoading(true);
    try {
      const blob = await alprApi.exportPdf({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        timezone,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `alpr_report_${startDate.toISOString().split("T")[0]}_${endDate.toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading PDF:", err);
    } finally {
      setDownloadPdfLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="ALPR Report"
        description="Vehicle entry analytics and insights across your monitoring network"
        actions={
          <div className="print:hidden">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setIsOpen(true)}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      <Card className="mb-8 py-4">
        <CardContent className="px-4">
          <div className="flex flex-col flex-wrap items-start gap-4 sm:flex-row sm:items-center">
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
                  showTimePicker={false}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="gap-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Vehicles
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 tabular-nums dark:text-blue-400">
              {loading ? "..." : summary.total_vehicles}
            </div>
          </CardContent>
        </Card>

        <Card className="gap-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Employee Vehicles
            </CardTitle>
            <Truck className="h-4 w-4 text-green-500 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 tabular-nums dark:text-green-400">
              {loading ? "..." : summary.employee_breakdown.employees}
            </div>
          </CardContent>
        </Card>

        <Card className="gap-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Contractor Vehicles
            </CardTitle>
            <Truck className="h-4 w-4 text-orange-500 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 tabular-nums dark:text-orange-400">
              {loading ? "..." : summary.employee_breakdown.contractors}
            </div>
          </CardContent>
        </Card>

        <Card className="gap-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Unknown Vehicles
            </CardTitle>
            <Truck className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {loading ? "..." : summary.employee_breakdown.unknown}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Entry &amp; Exit Vehicle Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-green-50 p-4 dark:bg-green-950">
                  <span className="text-sm font-medium">Entry Entries</span>
                  <span className="text-sm font-semibold text-green-600 tabular-nums dark:text-green-400">
                    {summary.total_entries}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-orange-50 p-4 dark:bg-orange-950">
                  <span className="text-sm font-medium">Exit Entries</span>
                  <span className="text-sm font-semibold text-orange-600 tabular-nums dark:text-orange-400">
                    {summary.total_exits}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Vehicle Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-green-50 p-4 dark:bg-green-950">
                  <span className="text-sm font-medium">Employee</span>
                  <span className="text-sm font-semibold text-green-600 tabular-nums dark:text-green-400">
                    {summary.employee_breakdown.employees}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-orange-50 p-4 dark:bg-orange-950">
                  <span className="text-sm font-medium">Contractor</span>
                  <span className="text-sm font-semibold text-orange-600 tabular-nums dark:text-orange-400">
                    {summary.employee_breakdown.contractors}
                  </span>
                </div>
                <div className="bg-muted flex items-center justify-between rounded-lg p-4">
                  <span className="text-sm font-medium">Unknown</span>
                  <span className="text-muted-foreground text-sm font-semibold tabular-nums">
                    {summary.employee_breakdown.unknown}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-semibold">Entry Time Heatmap</h2>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        ) : heatmapData.length > 0 ? (
          <>
            <MobileCardList>
              {heatmapData.map((item, index) => {
                const maxCount = Math.max(
                  ...heatmapData.map((d) => d.value),
                  1,
                );
                const intensity = (item.value / maxCount) * 100;
                return (
                  <RecordCard
                    key={index}
                    title={item.name}
                    trailing={
                      <span className="text-sm font-semibold tabular-nums">
                        {item.value}
                      </span>
                    }
                    footer={
                      <div className="bg-muted h-6 w-full overflow-hidden rounded">
                        <div
                          className="flex h-full items-center justify-center bg-gradient-to-r from-blue-200 to-blue-600 text-xs font-semibold text-white"
                          style={{ width: `${intensity}%` }}
                        >
                          {intensity > 20 && `${Math.round(intensity)}%`}
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </MobileCardList>

            <DataTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Vehicle Count</TableHead>
                    <TableHead>Intensity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {heatmapData.map((item, index) => {
                    const maxCount = Math.max(
                      ...heatmapData.map((d) => d.value),
                      1,
                    );
                    const intensity = (item.value / maxCount) * 100;
                    return (
                      <TableRow key={index}>
                        <TableCell className="text-sm">{item.name}</TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {item.value}
                        </TableCell>
                        <TableCell>
                          <div className="bg-muted h-6 w-full overflow-hidden rounded">
                            <div
                              className="flex h-full items-center justify-center bg-gradient-to-r from-blue-200 to-blue-600 text-xs font-semibold text-white"
                              style={{ width: `${intensity}%` }}
                            >
                              {intensity > 20 && `${Math.round(intensity)}%`}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTable>
          </>
        ) : (
          <EmptyState
            title="No heatmap data"
            message="No heatmap data available for the selected period"
          />
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="print:hidden">
          <DialogHeader>
            <DialogTitle>Export ALPR Report</DialogTitle>
            <DialogDescription>
              Export the ALPR report including summary statistics and vehicle
              breakdown data as PDF.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setTimeout(() => window.print(), 100);
              }}
            >
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
            <Button
              onClick={async () => {
                try {
                  await downloadPdf();
                } catch (err) {
                  console.error("Download failed:", err);
                } finally {
                  setIsOpen(false);
                }
              }}
              disabled={downloadPdfLoading}
            >
              <FileDown className="h-4 w-4" />
              {downloadPdfLoading ? "Downloading..." : "Export PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
