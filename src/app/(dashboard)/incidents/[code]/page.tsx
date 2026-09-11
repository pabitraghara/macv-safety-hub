"use client";

import { useIncidentByCode } from "@/api/incidents";
import { useFilters } from "@/api/filters";
import { LoadingStates } from "@/components/shared/LoadingStates";
import { IncidentMainContent } from "@/components/incidents/IncidentMainContent";
import { IncidentPropertiesSidebar } from "@/components/incidents/IncidentPropertiesSidebar";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useIncidentUpdates } from "@/hooks/use-incident-updates";
import { getFilterOptions } from "@/lib/observation-utils";
import { useParams } from "next/navigation";
import type { Filter, FilterOption } from "@/api/filters/types";

export default function IncidentDetailPage() {
  return <IncidentDetailPageContent />;
}

function IncidentDetailPageContent() {
  const params = useParams();
  const code = typeof params.code === 'string' ? params.code : Array.isArray(params.code) ? params.code[0] : '';
  const { data: incident, loading, error } = useIncidentByCode(code);
  const { filters } = useFilters('incidents');
  const [activitiesRefreshTrigger, setActivitiesRefreshTrigger] = useState(0);
  const [hasShownErrorToast, setHasShownErrorToast] = useState(false);

  const {
    currentTitle,
    currentDescription,
    tempStatus,
    tempPriority,
    tempAssignee,
    tempIncidentType,
    tempSeverity,
    tempSite,
    tempDepartment,
    tempDueDate,
    updateLocalState,
    handleTitleSave,
    handleDescriptionSave,
    handleStatusChange,
    handlePriorityChange,
    handleAssigneeChange,
    handleIncidentTypeChange,
    handleSeverityChange,
    handleSiteChange,
    handleDepartmentChange,
    handleDueDateChange,
  } = useIncidentUpdates({
    code,
    incident,
    onActivitiesRefresh: () => setActivitiesRefreshTrigger(prev => prev + 1),
  });

  useEffect(() => {
    if (incident) {
      updateLocalState();
    }
  }, [incident, updateLocalState]);

  useEffect(() => {
    if (error && !hasShownErrorToast) {
      toast.error("Failed to load incident details. Please try again.");
      setHasShownErrorToast(true);
    }
    if (!error && hasShownErrorToast) {
      setHasShownErrorToast(false);
    }
  }, [error, hasShownErrorToast]);

  const assigneeOptions: FilterOption[] = getFilterOptions(filters as Filter[], 'assigned_to');
  const incidentTypeOptions: FilterOption[] = getFilterOptions(filters as Filter[], 'incident_type_id');
  const siteOptions: FilterOption[] = getFilterOptions(filters as Filter[], 'site_id');
  const departmentOptions: FilterOption[] = getFilterOptions(filters as Filter[], 'department_id');

  if (loading || error || !incident) {
    return (
      <LoadingStates
        isParamsLoaded={true}
        loading={loading}
        error={error}
        code={code}
        backPath="/incidents"
        entityName="Incident"
      />
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex flex-col xl:flex-row">
        {/* Left Column - Main Content */}
        <div className="flex-1 min-w-0 px-6 sm:px-8 lg:px-12">
          <IncidentMainContent
            currentTitle={currentTitle}
            currentDescription={currentDescription}
            onTitleSave={handleTitleSave}
            onDescriptionSave={handleDescriptionSave}
            incidentCode={code}
            activitiesRefreshTrigger={activitiesRefreshTrigger}
            incident={incident}
          />
        </div>

        {/* Vertical Divider */}
        <div className="hidden xl:block w-px bg-gray-200 flex-shrink-0"></div>

        {/* Right Column - Details Sidebar */}
        <div className="xl:w-80 flex-shrink-0 px-3 sm:px-4 lg:px-6">
          <IncidentPropertiesSidebar
            tempStatus={tempStatus}
            tempPriority={tempPriority}
            tempAssignee={tempAssignee}
            tempIncidentType={tempIncidentType}
            tempSeverity={tempSeverity}
            tempSite={tempSite}
            tempDepartment={tempDepartment}
            tempDueDate={tempDueDate}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onAssigneeChange={handleAssigneeChange}
            onIncidentTypeChange={handleIncidentTypeChange}
            onSeverityChange={handleSeverityChange}
            onSiteChange={handleSiteChange}
            onDepartmentChange={handleDepartmentChange}
            onDueDateChange={handleDueDateChange}
            assigneeOptions={assigneeOptions}
            incidentTypeOptions={incidentTypeOptions}
            siteOptions={siteOptions}
            departmentOptions={departmentOptions}
          />
        </div>
      </div>
    </div>
  );
}
