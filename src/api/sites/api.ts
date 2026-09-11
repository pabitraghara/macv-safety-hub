import { request } from "../base/http";
import type { CreateSiteRequest, Site, UpdateSiteRequest } from "./types";

export class SitesApi {
  async getMySites(): Promise<Site[]> {
    return request<Site[]>("GET", "/api/v1/sites/my");
  }

  async getSite(id: string): Promise<Site> {
    return request<Site>("GET", `/api/v1/sites/${id}`);
  }

  async createSite(data: CreateSiteRequest): Promise<Site> {
    return request<Site>("POST", "/api/v1/sites/my", data);
  }

  async updateSite(id: string, data: UpdateSiteRequest): Promise<Site> {
    return request<Site>("PATCH", `/api/v1/sites/my/${id}`, data);
  }
}

export const sitesApi = new SitesApi();
