"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { SpeedViolationOwner } from "@/api/speed-violations";

/**
 * Vehicle-owner details straight from the violation payload
 * (`violation.owner`, joined server-side) — no extra round trip.
 */

interface OwnerCardProps {
  owner: SpeedViolationOwner | null;
  hasPlate: boolean;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{children}</div>
    </div>
  );
}

export function OwnerCard({ owner, hasPlate }: OwnerCardProps) {
  if (!hasPlate) return null;

  return (
    <Card className="p-4">
      <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase">
        Vehicle Owner
      </h2>
      {owner ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Full name">{owner.name || "—"}</Field>
          <Field label="Type">
            {owner.type ? (
              <Badge
                variant="outline"
                className={
                  owner.type === "Employee"
                    ? "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                    : "border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-300"
                }
              >
                {owner.type}
              </Badge>
            ) : (
              "—"
            )}
          </Field>
          {owner.employee_id && (
            <Field label="Employee ID">{owner.employee_id}</Field>
          )}
          <Field label="Department">{owner.department || "—"}</Field>
          <Field label="Contact">{owner.phone || "—"}</Field>
          {owner.email && <Field label="Email">{owner.email}</Field>}
          <Field label="Vehicle type">{owner.vehicle_type || "—"}</Field>
          <Field label="Registration">
            <span className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className={
                  owner.is_active
                    ? "border-green-200 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                    : "border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                }
              >
                {owner.is_active ? "Active" : "Inactive"}
              </Badge>
              {owner.is_expired && (
                <Badge
                  variant="outline"
                  className="border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                >
                  Expired
                </Badge>
              )}
            </span>
          </Field>
        </div>
      ) : (
        <p className="text-muted-foreground py-4 text-center text-sm">
          No registered owner for this license plate.
        </p>
      )}
    </Card>
  );
}
