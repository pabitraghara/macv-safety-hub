export type OrgRole = {
  id: string;
  name: string;
  description?: string | null;
};

export type OrgMember = {
  logto_user_id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
  is_active: boolean;
  roles: string[];
};

export type PendingInvitation = {
  id: string;
  email: string;
  roles: string[];
  created_at: string;
  expires_at: string;
  status: string;
};

export type InvitationDetail = {
  id: string;
  email: string;
  org_name: string;
  roles: string[];
  status: string;
  expires_at: string;
};

export type InviteUserRequest = {
  email: string;
  role: string;
};

export type UpdateRoleRequest = {
  role: string;
};
