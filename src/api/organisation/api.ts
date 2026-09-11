import { request } from "../base/http";
import type { Organisation, UpdateOrganisationRequest } from "./types";

export class OrganisationApi {
  async getMyOrg(): Promise<Organisation> {
    return request<Organisation>("GET", "/api/v1/organisations/my");
  }

  async updateMyOrg(data: UpdateOrganisationRequest): Promise<Organisation> {
    return request<Organisation>("PATCH", "/api/v1/organisations/my", data);
  }
}

export const organisationApi = new OrganisationApi();
