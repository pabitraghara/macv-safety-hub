import { request } from "../base/http";
import type {
  CreatePersonRequest,
  Person,
  PersonListParams,
  PersonListResponse,
  PersonSearchParams,
  PersonSearchResponse,
  PersonVehiclesResponse,
  PersonWithVehicles,
  UpdatePersonRequest,
} from "./types";

export class PeopleApi {
  async getPeople(params: PersonListParams = {}): Promise<PersonListResponse> {
    return request<PersonListResponse>("GET", "/api/v1/people", undefined, {
      params: params as Record<string, unknown>,
    });
  }

  async searchPeople(
    params: PersonSearchParams,
  ): Promise<PersonSearchResponse> {
    return request<PersonSearchResponse>(
      "GET",
      "/api/v1/people/search",
      undefined,
      { params: { ...params } },
    );
  }

  async getPerson(personId: string): Promise<PersonWithVehicles> {
    return request<PersonWithVehicles>("GET", `/api/v1/people/${personId}`);
  }

  async getPersonVehicles(personId: string): Promise<PersonVehiclesResponse> {
    return request<PersonVehiclesResponse>(
      "GET",
      `/api/v1/people/${personId}/vehicles`,
    );
  }

  async createPerson(data: CreatePersonRequest): Promise<Person> {
    return request<Person>("POST", "/api/v1/people", data);
  }

  async updatePerson(
    personId: string,
    data: UpdatePersonRequest,
  ): Promise<Person> {
    return request<Person>("PATCH", `/api/v1/people/${personId}`, data);
  }

  async deletePerson(personId: string): Promise<void> {
    return request<void>("DELETE", `/api/v1/people/${personId}`);
  }
}

export const peopleApi = new PeopleApi();
