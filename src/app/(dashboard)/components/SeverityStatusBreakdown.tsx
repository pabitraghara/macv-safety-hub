import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Activity } from "lucide-react";
import { SeverityBar } from "./SeverityBar";
import { formatLabel, severityOrder, severityBarColors } from "./helpers";
import type { ObservationStats } from "@/api/observations/types";
import type { Incident } from "@/api/incidents/types";

export function SeverityStatusBreakdown({
  loading,
  stats,
  incidents,
  obsSeverities,
  incStatuses,
}: {
  loading: boolean;
  stats: ObservationStats | null;
  incidents: Incident[];
  obsSeverities: Record<string, number>;
  incStatuses: Record<string, number>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Observation Severity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="text-muted-foreground h-4 w-4" />
            <CardTitle className="text-sm">Observations by Severity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : (stats?.total ?? 0) === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No observations yet
            </p>
          ) : (
            <div className="space-y-3">
              {severityOrder.map((s) => (
                <SeverityBar
                  key={s}
                  label={s}
                  count={obsSeverities[s] ?? 0}
                  total={stats?.total ?? 0}
                  color={severityBarColors[s] ?? "bg-gray-500"}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incident Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="text-muted-foreground h-4 w-4" />
            <CardTitle className="text-sm">Incidents by Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : incidents.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No incidents yet
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {Object.entries(incStatuses)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div
                    key={status}
                    className="bg-muted/50 flex flex-col items-center rounded-lg border px-5 py-3"
                  >
                    <span className="text-2xl font-bold tabular-nums">
                      {count}
                    </span>
                    <span className="text-muted-foreground mt-1 text-xs font-medium">
                      {formatLabel(status)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
