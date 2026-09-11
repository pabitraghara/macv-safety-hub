import { Eye, AlertTriangle, ShieldAlert, Bug } from "lucide-react";
import { StatCard } from "./StatCard";
import type { ObservationStats } from "@/api/observations/types";

export function KpiCards({
  stats,
  loading,
  openObservations,
  escalatedObservations,
  openIncidents,
  criticalIncidents,
}: {
  stats: ObservationStats | null;
  loading: boolean;
  openObservations: number;
  escalatedObservations: number;
  openIncidents: number;
  criticalIncidents: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Observations"
        value={stats?.total ?? 0}
        subtitle={`${openObservations} need review`}
        icon={Eye}
        iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        loading={loading}
        href="/observations"
      />
      <StatCard
        title="Needs Review"
        value={openObservations}
        subtitle="Open observations"
        icon={AlertTriangle}
        iconClassName="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
        loading={loading}
        href="/observations?review_status=open"
      />
      <StatCard
        title="Escalated"
        value={escalatedObservations}
        subtitle="Observations escalated"
        icon={ShieldAlert}
        iconClassName="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        loading={loading}
        href="/observations?review_status=escalated"
      />
      <StatCard
        title="Open Incidents"
        value={openIncidents}
        subtitle={`${criticalIncidents} critical`}
        icon={Bug}
        iconClassName="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        loading={loading}
        href="/incidents?status=open,in_progress"
      />
    </div>
  );
}
