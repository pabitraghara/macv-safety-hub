import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLabel } from "./helpers";
import type { Observation } from "@/api/observations/types";

function buildSeverityRows(observations: Observation[]): {
  label: string;
  total: number;
}[] {
  const counts: Record<string, number> = {};
  for (const obs of observations) {
    const s = obs.severity.toLowerCase();
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([s, total]) => ({ label: formatLabel(s), total }))
    .sort((a, b) => b.total - a.total);
}

export function SiteBreakdownTable({
  loading,
  observations,
}: {
  loading: boolean;
  observations: Observation[];
}) {
  const severityRows = buildSeverityRows(observations);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Observations by Severity</CardTitle>
        <p className="text-muted-foreground text-xs">All time</p>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 px-6 pb-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : severityRows.length === 0 ? (
          <p className="text-muted-foreground px-6 pb-4 text-sm">No data yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-muted-foreground px-6 pb-2 text-left text-xs font-medium">
                  Severity
                </th>
                <th className="text-muted-foreground px-6 pb-2 text-right text-xs font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {severityRows.map((row) => (
                <tr
                  key={row.label}
                  className="hover:bg-muted/40 border-b transition-colors last:border-0"
                >
                  <td className="px-6 py-2 font-medium">{row.label}</td>
                  <td className="px-6 py-2 text-right tabular-nums">
                    {row.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
