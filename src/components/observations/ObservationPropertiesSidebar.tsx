import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import type { Observation, ObservationStatus, Violation } from "@/api/observations/types";

import { ViolationTagsEditor } from "./ViolationTags";
import { TriageStatusDropdown } from "@/components/shared/dropdowns/TriageStatusDropdown";
import { SeverityDropdown } from "@/components/shared/dropdowns/SeverityDropdown";

interface ObservationPropertiesSidebarProps {
  observation: Observation;
  tempStatus: ObservationStatus;
  onTriageChange: (status: ObservationStatus) => void;
  tempSeverity: string;
  onSeverityChange: (severity: string) => void;
  violations: Violation[];
  onViolationsUpdate: (violations: Violation[]) => void;
}

export function ObservationPropertiesSidebar({
  observation,
  tempStatus,
  onTriageChange,
  tempSeverity,
  onSeverityChange,
  violations,
  onViolationsUpdate,
}: ObservationPropertiesSidebarProps) {
  return (
    <div className="w-full mt-8">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Triage Status</p>
          <TriageStatusDropdown currentStatus={tempStatus} onStatusChange={onTriageChange} />
        </div>

        <Separator />

        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Severity</p>
          <SeverityDropdown currentSeverity={tempSeverity} onSeverityChange={onSeverityChange} />
        </div>

        <Separator />

        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Violations</p>
          <ViolationTagsEditor
            code={observation.code}
            violations={violations}
            onUpdate={onViolationsUpdate}
          />
        </div>

        {observation.reviewed_by && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Reviewed By</p>
              <p className="text-sm text-gray-700">{observation.reviewer?.first_name} {observation.reviewer?.last_name}</p>
              {observation.reviewed_at && (
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(observation.reviewed_at), 'MMM dd, yyyy HH:mm')}
                </p>
              )}
            </div>
          </>
        )}

        {observation.review_notes && (
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Review Notes</p>
            <p className="text-sm text-gray-700">{observation.review_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
