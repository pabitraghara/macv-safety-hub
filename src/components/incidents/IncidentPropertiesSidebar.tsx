import { Separator } from "@/components/ui/separator";
import {
  StatusDropdown,
  PriorityDropdown,
  SeverityDropdown,
  EntityTypeDropdown,
  SiteDropdown,
  DepartmentDropdown,
  AssigneeDropdown,
  DueDateDropdown,
} from "@/components/shared/dropdowns";
import type { User, EntityType, Site, Department } from "@/components/shared/types";
import type { FilterOption } from "@/api/filters/types";

interface IncidentPropertiesSidebarProps {
  tempStatus: string;
  tempPriority: string;
  tempAssignee: User | null | undefined;
  tempIncidentType: EntityType | null | undefined;
  tempSeverity: string;
  tempSite: Site | null | undefined;
  tempDepartment: Department | null | undefined;
  tempDueDate: Date | undefined;

  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  onAssigneeChange: (assignee: User | null) => void;
  onIncidentTypeChange: (incidentType: EntityType | null) => void;
  onSeverityChange: (severity: string) => void;
  onSiteChange: (site: Site | null) => void;
  onDepartmentChange: (department: Department | null) => void;
  onDueDateChange: (date: Date | undefined) => void;

  assigneeOptions: FilterOption[];
  incidentTypeOptions: FilterOption[];
  siteOptions: FilterOption[];
  departmentOptions: FilterOption[];
}

export function IncidentPropertiesSidebar({
  tempStatus, tempPriority, tempAssignee, tempIncidentType,
  tempSeverity, tempSite, tempDepartment, tempDueDate,
  onStatusChange, onPriorityChange, onAssigneeChange, onIncidentTypeChange,
  onSeverityChange, onSiteChange, onDepartmentChange, onDueDateChange,
  assigneeOptions, incidentTypeOptions, siteOptions, departmentOptions,
}: IncidentPropertiesSidebarProps) {
  return (
    <div className="w-full mt-8">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Status</p>
          <StatusDropdown currentStatus={tempStatus} onStatusChange={onStatusChange} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Priority</p>
          <PriorityDropdown currentPriority={tempPriority} onPriorityChange={onPriorityChange} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Assignee</p>
          <AssigneeDropdown currentAssignee={tempAssignee} onAssigneeChange={onAssigneeChange} options={assigneeOptions} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Due Date</p>
          <DueDateDropdown currentDueDate={tempDueDate} onDueDateChange={onDueDateChange} />
        </div>

        <Separator className="my-6" />

        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Incident Type</p>
          <EntityTypeDropdown
            currentType={tempIncidentType}
            onTypeChange={onIncidentTypeChange}
            options={incidentTypeOptions}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Severity</p>
          <SeverityDropdown currentSeverity={tempSeverity} onSeverityChange={onSeverityChange} />
        </div>

        <Separator className="my-6" />

        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Site</p>
          <SiteDropdown currentSite={tempSite} onSiteChange={onSiteChange} options={siteOptions} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Department</p>
          <DepartmentDropdown currentDepartment={tempDepartment} onDepartmentChange={onDepartmentChange} options={departmentOptions} />
        </div>
      </div>
    </div>
  );
}
