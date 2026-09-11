import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/base/http", () => ({
  request: vi.fn(),
}));

import { request } from "@/api/base/http";
import { alertPoliciesApi } from "../api";
import type {
  CreateContactRequest,
  CreatePolicyRequest,
  RecipientInput,
  RecipientUpdate,
  UpdateContactRequest,
  UpdatePolicyRequest,
} from "../types";

const mockedRequest = vi.mocked(request);

describe("alertPoliciesApi", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined as never);
  });

  describe("listPolicies", () => {
    it("issues a GET with filters as params", async () => {
      await alertPoliciesApi.listPolicies({ site_id: "s1", is_active: true });

      expect(mockedRequest).toHaveBeenCalledWith(
        "GET",
        "/api/v1/alert-policies",
        undefined,
        { params: { site_id: "s1", is_active: true } },
      );
    });

    it("passes an empty params object when called with no filters", async () => {
      await alertPoliciesApi.listPolicies();

      expect(mockedRequest).toHaveBeenCalledWith(
        "GET",
        "/api/v1/alert-policies",
        undefined,
        { params: {} },
      );
    });
  });

  it("createPolicy POSTs the payload, including nested recipients and inline external contact", async () => {
    const data: CreatePolicyRequest = {
      name: "High severity alert",
      site_id: null,
      trigger_type: "safety",
      match: { min_severity: "High" },
      schedule: null,
      cooldown_seconds: null,
      is_active: true,
      recipients: [
        { target_id: "target-1", channels: ["email"] },
        {
          target_type: "external",
          email: "ext@example.com",
          label: "External contact",
          phone: "+1000000000",
          channels: ["email", "whatsapp"],
        },
        {
          target_type: "user",
          target_ref: "logto-user-1",
          label: "Member",
          channels: ["whatsapp"],
        },
      ],
    };

    await alertPoliciesApi.createPolicy(data);

    expect(mockedRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/alert-policies",
      data,
    );
  });

  it("updatePolicy PUTs to the policy id", async () => {
    const data: UpdatePolicyRequest = { name: "Renamed", is_active: false };

    await alertPoliciesApi.updatePolicy("p1", data);

    expect(mockedRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/alert-policies/p1",
      data,
    );
  });

  it("deletePolicy DELETEs the policy id", async () => {
    await alertPoliciesApi.deletePolicy("p1");

    expect(mockedRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/alert-policies/p1",
    );
  });

  it("addRecipients POSTs an array of recipient inputs", async () => {
    const arr: RecipientInput[] = [
      { target_id: "target-1", channels: ["email"] },
      {
        target_type: "external",
        email: "ext@example.com",
        channels: ["email"],
      },
    ];

    await alertPoliciesApi.addRecipients("p1", arr);

    expect(mockedRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/alert-policies/p1/recipients",
      arr,
    );
  });

  it("updateRecipient PUTs to the recipient id", async () => {
    const data: RecipientUpdate = { channels: ["whatsapp"], is_active: false };

    await alertPoliciesApi.updateRecipient("p1", "r1", data);

    expect(mockedRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/alert-policies/p1/recipients/r1",
      data,
    );
  });

  it("deleteRecipient DELETEs the recipient id", async () => {
    await alertPoliciesApi.deleteRecipient("p1", "r1");

    expect(mockedRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/alert-policies/p1/recipients/r1",
    );
  });

  it("listContacts GETs the alert-targets collection", async () => {
    await alertPoliciesApi.listContacts();

    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/alert-targets");
  });

  it("createContact POSTs the payload", async () => {
    const data: CreateContactRequest = {
      target_type: "external",
      email: "ext@example.com",
      label: "Ext",
    };

    await alertPoliciesApi.createContact(data);

    expect(mockedRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/alert-targets",
      data,
    );
  });

  it("updateContact PUTs to the contact id", async () => {
    const data: UpdateContactRequest = { label: "New label" };

    await alertPoliciesApi.updateContact("t1", data);

    expect(mockedRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/alert-targets/t1",
      data,
    );
  });

  it("deleteContact DELETEs the contact id", async () => {
    await alertPoliciesApi.deleteContact("t1");

    expect(mockedRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/alert-targets/t1",
    );
  });
});
