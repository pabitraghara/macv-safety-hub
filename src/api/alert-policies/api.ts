import { request } from "../base/http";
import type {
  AlertPolicy,
  AlertRecipient,
  AlertTarget,
  CreateContactRequest,
  CreatePolicyRequest,
  PolicyFilters,
  RecipientInput,
  RecipientUpdate,
  UpdateContactRequest,
  UpdatePolicyRequest,
} from "./types";

export class AlertPoliciesApi {
  // ── Policies ─────────────────────────────────────────────────────

  async listPolicies(filters?: PolicyFilters): Promise<AlertPolicy[]> {
    return request<AlertPolicy[]>("GET", "/api/v1/alert-policies", undefined, {
      params: { ...filters },
    });
  }

  async createPolicy(data: CreatePolicyRequest): Promise<AlertPolicy> {
    return request<AlertPolicy>("POST", "/api/v1/alert-policies", data);
  }

  async updatePolicy(
    id: string,
    data: UpdatePolicyRequest,
  ): Promise<AlertPolicy> {
    return request<AlertPolicy>("PUT", `/api/v1/alert-policies/${id}`, data);
  }

  async deletePolicy(id: string): Promise<void> {
    return request<void>("DELETE", `/api/v1/alert-policies/${id}`);
  }

  async addRecipients(
    policyId: string,
    data: RecipientInput[],
  ): Promise<AlertRecipient[]> {
    return request<AlertRecipient[]>(
      "POST",
      `/api/v1/alert-policies/${policyId}/recipients`,
      data,
    );
  }

  async updateRecipient(
    policyId: string,
    recipientId: string,
    data: RecipientUpdate,
  ): Promise<AlertRecipient> {
    return request<AlertRecipient>(
      "PUT",
      `/api/v1/alert-policies/${policyId}/recipients/${recipientId}`,
      data,
    );
  }

  async deleteRecipient(policyId: string, recipientId: string): Promise<void> {
    return request<void>(
      "DELETE",
      `/api/v1/alert-policies/${policyId}/recipients/${recipientId}`,
    );
  }

  // ── Contact book (org-scoped alert targets) ─────────────────────

  async listContacts(): Promise<AlertTarget[]> {
    return request<AlertTarget[]>("GET", "/api/v1/alert-targets");
  }

  async createContact(data: CreateContactRequest): Promise<AlertTarget> {
    return request<AlertTarget>("POST", "/api/v1/alert-targets", data);
  }

  async updateContact(
    id: string,
    data: UpdateContactRequest,
  ): Promise<AlertTarget> {
    return request<AlertTarget>("PUT", `/api/v1/alert-targets/${id}`, data);
  }

  async deleteContact(id: string): Promise<void> {
    return request<void>("DELETE", `/api/v1/alert-targets/${id}`);
  }
}

export const alertPoliciesApi = new AlertPoliciesApi();
