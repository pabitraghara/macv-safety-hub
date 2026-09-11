export interface FilterOption {
  value: string;
  label: string;
  color: string | null;
  icon: string | null;
  count: number;
  avatar_url: string | null;
  avatar_color: string | null;
}

export interface Filter {
  id: string;
  label: string;
  type: 'MULTISELECT' | 'DATERANGE';
  field: string;
  icon: string;
  options: FilterOption[];
}

export interface ActiveFilter {
  id: string;
  type: 'MULTISELECT' | 'DATERANGE';
  field: string;
  label: string;
  values: string[];
  dateRange?: { from: string; to: string };
}

export interface FilterParams {
  [key: string]: string | string[] | undefined;
}

export interface FilterResponse {
  filters: Filter[];
} 