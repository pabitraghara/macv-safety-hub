export type UserProfile = {
  id: string;
  logto_user_id: string | null;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  employee_id: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UpdateUserProfileRequest = {
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  employee_id?: string | null;
};
