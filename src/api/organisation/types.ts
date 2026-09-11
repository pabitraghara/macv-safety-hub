export type Organisation = {
  id: string;
  name: string;
  org_code: string;
  website: string | null;
  contact_info: string | null;
  // Explicit module entitlement (org axis). Lowercase values: "safety",
  // "vehicles". Defaults to ["safety"] server-side for any org.
  enabled_modules: string[];
  // Vehicles module: also email the registered vehicle owner on a speed
  // violation (in addition to alert-policy recipients).
  send_owner_email: boolean;
  created_at: string;
  updated_at: string;
};

export type UpdateOrganisationRequest = {
  name?: string;
  website?: string | null;
  contact_info?: string | null;
  send_owner_email?: boolean;
};
