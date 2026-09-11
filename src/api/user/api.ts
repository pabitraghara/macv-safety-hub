import { request } from "../base/http";
import type { UserProfile, UpdateUserProfileRequest } from "./types";

export class UserApi {
  async getMyProfile(): Promise<UserProfile> {
    return request<UserProfile>("GET", "/api/v1/users/me");
  }

  async updateMyProfile(data: UpdateUserProfileRequest): Promise<UserProfile> {
    return request<UserProfile>("PATCH", "/api/v1/users/me", data);
  }
}

export const userApi = new UserApi();
