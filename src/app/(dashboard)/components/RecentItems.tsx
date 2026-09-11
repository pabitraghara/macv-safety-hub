import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, AlertTriangle, Clock, ArrowRight, CircleDot } from "lucide-react";
import { severityColor, statusColor, formatLabel, timeAgo } from "./helpers";
import type { Observation } from "@/api/observations/types";
import type { Incident } from "@/api/incidents/types";

export function RecentItems({
  loading,
  recentObservations,
  recentIncidents,
}: {
  loading: boolean;
  recentObservations: Observation[];
  recentIncidents: Incident[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Recent Observations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="text-muted-foreground h-4 w-4" />
              <CardTitle className="text-sm">Recent Observations</CardTitle>
            </div>
            <Link
              href="/observations"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : recentObservations.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No observations yet
            </p>
          ) : (
            <div className="space-y-1">
              {recentObservations.map((obs) => (
                <Link
                  key={obs.id}
                  href={`/observations/${obs.code}`}
                  className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                >
                  <CircleDot className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{obs.code}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {obs.description || "No description"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`border-0 text-[10px] ${severityColor(obs.severity)}`}
                    >
                      {formatLabel(obs.severity)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`border-0 text-[10px] ${statusColor(obs.review_status)}`}
                    >
                      {formatLabel(obs.review_status)}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground hidden shrink-0 text-[10px] sm:block">
                    {timeAgo(obs.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-muted-foreground h-4 w-4" />
              <CardTitle className="text-sm">Recent Incidents</CardTitle>
            </div>
            <Link
              href="/incidents"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : recentIncidents.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No incidents yet
            </p>
          ) : (
            <div className="space-y-1">
              {recentIncidents.map((inc) => (
                <Link
                  key={inc.id}
                  href={`/incidents/${inc.code}`}
                  className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                >
                  <Clock className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{inc.title}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {inc.code}
                      {inc.site ? ` · ${inc.site.name}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`border-0 text-[10px] ${severityColor(inc.severity)}`}
                    >
                      {formatLabel(inc.severity)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`border-0 text-[10px] ${statusColor(inc.status)}`}
                    >
                      {formatLabel(inc.status)}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground hidden shrink-0 text-[10px] sm:block">
                    {timeAgo(inc.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
