import { request } from "../base/http";
import type { ActiveFilter, Filter, FilterParams } from "./types";

class FiltersApi {
  async getFilters(resource: string): Promise<Filter[]> {
    const data = await request<Filter[] | { filters: Filter[] }>(
      "GET",
      `/api/v1/filters/${resource}`,
    );
    return Array.isArray(data) ? data : (data.filters ?? []);
  }
}

export const filtersApi = new FiltersApi();

export async function getFilters(
  resource: string,
): Promise<{ filters: Filter[] }> {
  const filters = await filtersApi.getFilters(resource);
  return { filters };
}

/**
 * Convert a list of ActiveFilters into flat query params for API calls.
 * MULTISELECT → repeating key (field=a&field=b)
 * DATERANGE   → field_from and field_to
 */
export function activeFiltersToParams(
  activeFilters: ActiveFilter[],
): FilterParams {
  const params: FilterParams = {};
  for (const f of activeFilters) {
    if (f.type === "MULTISELECT" && f.values.length > 0) {
      params[f.field] = f.values;
    } else if (f.type === "DATERANGE" && f.dateRange) {
      if (f.dateRange.from) params[`${f.field}_from`] = f.dateRange.from;
      if (f.dateRange.to) params[`${f.field}_to`] = f.dateRange.to;
    }
  }
  return params;
}
