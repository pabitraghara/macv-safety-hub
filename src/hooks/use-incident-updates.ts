import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { incidentsApi } from '@/api/incidents';
import type { Incident, IncidentType, User as UserType } from '@/api/incidents/types';
import type { Site, Department } from '@/components/shared/types';

interface UseIncidentUpdatesProps {
  code: string;
  incident: Incident | null;
  onActivitiesRefresh: () => void;
}

export const useIncidentUpdates = ({ code, incident, onActivitiesRefresh }: UseIncidentUpdatesProps) => {
  const [currentTitle, setCurrentTitle] = useState("");
  const [currentDescription, setCurrentDescription] = useState("");

  const [tempStatus, setTempStatus] = useState(incident?.status || "");
  const [tempPriority, setTempPriority] = useState(String(incident?.priority || "0"));
  const [tempAssignee, setTempAssignee] = useState(incident?.assignee || null);
  const [tempIncidentType, setTempIncidentType] = useState<IncidentType | null>(incident?.incident_type || null);
  const [tempSeverity, setTempSeverity] = useState(incident?.severity || "");
  const [tempSite, setTempSite] = useState<Site | null>(incident?.site || null);
  const [tempDepartment, setTempDepartment] = useState<Department | null>(incident?.department || null);
  const [tempDueDate, setTempDueDate] = useState<Date | undefined>(
    incident?.due_by ? new Date(incident.due_by) : undefined
  );

  const updateLocalState = useCallback(() => {
    if (incident) {
      setCurrentTitle(incident.title || "");
      setCurrentDescription(incident.description || "");
      setTempStatus(incident.status || "");
      setTempPriority(String(incident.priority || "0"));
      setTempAssignee(incident.assignee || null);
      setTempIncidentType(incident.incident_type || null);
      setTempSeverity(incident.severity || "");
      setTempSite(incident.site || null);
      setTempDepartment(incident.department || null);
      setTempDueDate(incident.due_by ? new Date(incident.due_by) : undefined);
    }
  }, [incident]);

  const handleTitleSave = useCallback(async (newTitle: string) => {
    try {
      await incidentsApi.updateDetails(code, { title: newTitle });
      setCurrentTitle(newTitle);
      toast.success("Title updated successfully");
    } catch {
      toast.error("Failed to update title. Please try again.");
      throw new Error("Failed to update title");
    }
  }, [code]);

  const handleDescriptionSave = useCallback(async (newDescription: string) => {
    try {
      await incidentsApi.updateDetails(code, { description: newDescription });
      setCurrentDescription(newDescription);
      toast.success("Description updated successfully");
    } catch {
      toast.error("Failed to update description. Please try again.");
      throw new Error("Failed to update description");
    }
  }, [code]);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (newStatus === tempStatus) return;
    try {
      setTempStatus(newStatus);
      await incidentsApi.changeStatus(code, newStatus);
      onActivitiesRefresh();
      toast.success("Status updated successfully");
    } catch {
      setTempStatus(incident?.status || "");
      toast.error("Failed to update status. Please try again.");
    }
  }, [code, tempStatus, incident?.status, onActivitiesRefresh]);

  const handlePriorityChange = useCallback(async (newPriority: string) => {
    if (newPriority === tempPriority) return;
    try {
      setTempPriority(newPriority);
      await incidentsApi.changePriority(code, parseInt(newPriority));
      onActivitiesRefresh();
      toast.success("Priority updated successfully");
    } catch {
      setTempPriority(String(incident?.priority || "0"));
      toast.error("Failed to update priority. Please try again.");
    }
  }, [code, tempPriority, incident?.priority, onActivitiesRefresh]);

  const handleAssigneeChange = useCallback(async (newAssignee: UserType | null) => {
    if ((newAssignee?.id || null) === (tempAssignee?.id || null)) return;
    try {
      setTempAssignee(newAssignee);
      await incidentsApi.assignIncident(code, newAssignee?.id || '');
      onActivitiesRefresh();
      toast.success("Assignee updated successfully");
    } catch {
      setTempAssignee(incident?.assignee || null);
      toast.error("Failed to update assignee. Please try again.");
    }
  }, [code, tempAssignee, incident?.assignee, onActivitiesRefresh]);

  const handleIncidentTypeChange = useCallback(async (newType: IncidentType | null) => {
    if (newType?.id === tempIncidentType?.id) return;
    try {
      setTempIncidentType(newType);
      if (newType) {
        await incidentsApi.changeIncidentType(code, newType.id);
      }
      onActivitiesRefresh();
      toast.success("Incident type updated successfully");
    } catch {
      setTempIncidentType(incident?.incident_type || null);
      toast.error("Failed to update incident type. Please try again.");
    }
  }, [code, tempIncidentType, incident?.incident_type, onActivitiesRefresh]);

  const handleSeverityChange = useCallback(async (newSeverity: string) => {
    if (newSeverity === tempSeverity) return;
    try {
      setTempSeverity(newSeverity);
      await incidentsApi.changeSeverity(code, newSeverity);
      onActivitiesRefresh();
      toast.success("Severity updated successfully");
    } catch {
      setTempSeverity(incident?.severity || "");
      toast.error("Failed to update severity. Please try again.");
    }
  }, [code, tempSeverity, incident?.severity, onActivitiesRefresh]);

  const handleSiteChange = useCallback(async (newSite: Site | null) => {
    if (newSite?.id === tempSite?.id) return;
    try {
      setTempSite(newSite);
      if (newSite) {
        await incidentsApi.changeSite(code, newSite.id);
      }
      onActivitiesRefresh();
      toast.success("Site updated successfully");
    } catch {
      setTempSite(incident?.site || null);
      toast.error("Failed to update site. Please try again.");
    }
  }, [code, tempSite, incident?.site, onActivitiesRefresh]);

  const handleDepartmentChange = useCallback(async (newDepartment: Department | null) => {
    if (newDepartment?.id === tempDepartment?.id) return;
    try {
      setTempDepartment(newDepartment);
      if (newDepartment) {
        await incidentsApi.changeDepartment(code, newDepartment.id);
      }
      onActivitiesRefresh();
      toast.success("Department updated successfully");
    } catch {
      setTempDepartment(incident?.department || null);
      toast.error("Failed to update department. Please try again.");
    }
  }, [code, tempDepartment, incident?.department, onActivitiesRefresh]);

  const handleDueDateChange = useCallback(async (newDueDate: Date | undefined) => {
    const currentStr = tempDueDate?.toISOString();
    const newStr = newDueDate?.toISOString();
    if (currentStr === newStr) return;
    try {
      setTempDueDate(newDueDate);
      await incidentsApi.changeDueDate(code, newDueDate ? newDueDate.toISOString() : "");
      onActivitiesRefresh();
      toast.success("Due date updated successfully");
    } catch {
      setTempDueDate(incident?.due_by ? new Date(incident.due_by) : undefined);
      toast.error("Failed to update due date. Please try again.");
    }
  }, [code, tempDueDate, incident?.due_by, onActivitiesRefresh]);

  return {
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
  };
};
