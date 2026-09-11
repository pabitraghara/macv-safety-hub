import { request, type PaginatedResponse } from "../base/http";
import {
  Incident,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  IncidentListParams,
  Comment,
  CreateCommentRequest,
  Activity,
  Attachment,
} from "./types";

export class IncidentsApi {
  async getIncidents(
    params: IncidentListParams = {},
  ): Promise<Incident[] | PaginatedResponse<Incident>> {
    return request<Incident[] | PaginatedResponse<Incident>>(
      "GET",
      "/api/v1/incidents/",
      undefined,
      { params: params as Record<string, unknown> },
    );
  }

  async getIncident(id: string): Promise<Incident> {
    return request<Incident>("GET", `/api/v1/incidents/${id}`);
  }

  async getIncidentByCode(code: string): Promise<Incident> {
    return request<Incident>("GET", `/api/v1/incidents/${code}`, undefined, {
      params: { expand: "true" },
    });
  }

  async createIncident(data: CreateIncidentRequest): Promise<Incident> {
    return request<Incident>("POST", "/api/v1/incidents/", data);
  }

  async updateIncident(
    id: string,
    data: UpdateIncidentRequest,
  ): Promise<Incident> {
    return request<Incident>("PUT", `/api/v1/incidents/${id}`, data);
  }

  async deleteIncident(id: string): Promise<void> {
    return request<void>("DELETE", `/api/v1/incidents/${id}`);
  }

  async assignIncident(code: string, userId: string): Promise<Incident> {
    return request<Incident>("PUT", `/api/v1/incidents/${code}/assign`, {
      assigned_to: userId,
    });
  }

  async changeStatus(code: string, status: string): Promise<Incident> {
    return request<Incident>("PUT", `/api/v1/incidents/${code}/status`, {
      status,
    });
  }

  async changePriority(code: string, priority: number): Promise<Incident> {
    return request<Incident>("PUT", `/api/v1/incidents/${code}/priority`, {
      priority,
    });
  }

  async changeSeverity(code: string, severity: string): Promise<Incident> {
    return request<Incident>("PUT", `/api/v1/incidents/${code}/severity`, {
      severity,
    });
  }

  async changeIncidentType(
    code: string,
    incidentTypeId: string,
  ): Promise<Incident> {
    return request<Incident>("PUT", `/api/v1/incidents/${code}/incident-type`, {
      incident_type_id: incidentTypeId,
    });
  }

  async changeSite(code: string, siteId: string): Promise<Incident> {
    return request<Incident>("PUT", `/api/v1/incidents/${code}/site`, {
      site_id: siteId,
    });
  }

  async changeDepartment(
    code: string,
    departmentId: string,
  ): Promise<Incident> {
    return request<Incident>("PUT", `/api/v1/incidents/${code}/department`, {
      department_id: departmentId,
    });
  }

  async changeDueDate(code: string, dueBy: string): Promise<Incident> {
    return request<Incident>("PUT", `/api/v1/incidents/${code}/due-date`, {
      due_by: dueBy,
    });
  }

  async updateDetails(
    code: string,
    updates: { title?: string; description?: string },
  ): Promise<Incident> {
    return request<Incident>("PUT", `/api/v1/incidents/${code}`, updates);
  }

  async resolveIncident(code: string): Promise<Incident> {
    return request<Incident>("PUT", `/api/v1/incidents/${code}/resolve`);
  }

  async getComments(incidentId: string): Promise<Comment[]> {
    return request<Comment[]>(
      "GET",
      `/api/v1/incidents/${incidentId}/comments`,
    );
  }

  async addComment(
    incidentId: string,
    data: CreateCommentRequest,
  ): Promise<Comment> {
    return request<Comment>(
      "POST",
      `/api/v1/incidents/${incidentId}/comments`,
      data,
    );
  }

  async deleteComment(incidentId: string, commentId: string): Promise<void> {
    return request<void>(
      "DELETE",
      `/api/v1/incidents/${incidentId}/comments/${commentId}`,
    );
  }

  async uploadAttachment(code: string, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append("file", file);
    return request<Attachment>(
      "POST",
      `/api/v1/incidents/${code}/attachments`,
      formData,
    );
  }

  async getAttachments(code: string): Promise<Attachment[]> {
    return request<Attachment[]>(
      "GET",
      `/api/v1/incidents/${code}/attachments`,
    );
  }

  async getActivities(
    code: string,
    includeComments = true,
  ): Promise<Activity[]> {
    return request<Activity[]>(
      "GET",
      `/api/v1/incidents/${code}/activities`,
      undefined,
      { params: { include_comments: includeComments } },
    );
  }
}

export const incidentsApi = new IncidentsApi();
