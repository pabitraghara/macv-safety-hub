"use client";

import { useRouter } from "next/navigation";
import { Camera, Clock, Gauge, IdCard, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SpeedViolation } from "@/api/speed-violations";

/**
 * Right-hand summary of one violation: speed stat tiles + the fact card
 * (time in org timezone, site, camera, plate + confidence, repeat-offender
 * context when present).
 */

interface ViolationSummaryProps {
  violation: SpeedViolation;
  timezone: string;
}

function StatTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${
          accent ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <div className="mt-0.5 text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

export function ViolationSummary({
  violation,
  timezone,
}: ViolationSummaryProps) {
  const router = useRouter();

  const recorded =
    violation.avg_speed != null ? Number(violation.avg_speed) : null;
  const limit =
    violation.speed_limit != null ? Number(violation.speed_limit) : null;
  const excess =
    recorded != null && limit != null ? Math.max(recorded - limit, 0) : null;

  const when = violation.timestamp ? new Date(violation.timestamp) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile
          label="Recorded"
          value={recorded != null ? `${recorded.toFixed(0)} km/h` : "—"}
          accent
        />
        <StatTile
          label="Limit"
          value={limit != null ? `${limit.toFixed(0)} km/h` : "—"}
        />
        <StatTile
          label="Excess"
          value={excess != null ? `+${excess.toFixed(0)} km/h` : "—"}
          accent={excess != null && excess > 0}
        />
      </div>

      <Card className="space-y-4 p-4">
        <h2 className="text-sm font-semibold tracking-wide uppercase">
          Violation Details
        </h2>
        <FactRow icon={Clock} label="Violation time">
          {when
            ? new Intl.DateTimeFormat(undefined, {
                timeZone: timezone,
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).format(when)
            : "Unknown"}
        </FactRow>
        <FactRow icon={MapPin} label="Site">
          {violation.site_name || "Unknown site"}
        </FactRow>
        {violation.camera_name && (
          <FactRow icon={Camera} label="Camera">
            {violation.camera_name}
          </FactRow>
        )}
        {violation.license_plate && (
          <FactRow icon={IdCard} label="License plate">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-mono text-base font-bold tracking-wider">
                  {violation.license_plate}
                </span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {violation.plate_confidence != null
                    ? `${(Number(violation.plate_confidence) * 100).toFixed(1)}%`
                    : "N/A"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() =>
                  router.push(
                    `/vehicles/${encodeURIComponent(violation.license_plate ?? "")}`,
                  )
                }
              >
                View vehicle
              </Button>
            </div>
          </FactRow>
        )}
        {violation.monthly_violation_count > 1 && (
          <FactRow icon={Gauge} label="This month">
            <span>
              {violation.monthly_violation_count} violations
              {violation.warning_level && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {violation.warning_level}
                </Badge>
              )}
            </span>
          </FactRow>
        )}
      </Card>
    </div>
  );
}
