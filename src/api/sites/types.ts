export type Site = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  is_active: boolean;
  org_id: string;
  created_at: string;
  updated_at: string;
};

export type CreateSiteRequest = {
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  timezone?: string | null;
};

export type UpdateSiteRequest = {
  name?: string;
  code?: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  timezone?: string | null;
  is_active?: boolean;
};
