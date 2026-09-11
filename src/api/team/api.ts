import { request } from '../base/http';
import type {
  InvitationDetail,
  InviteUserRequest,
  OrgMember,
  OrgRole,
  PendingInvitation,
  UpdateRoleRequest,
} from './types';

export class TeamApi {
  async getOrgRoles(): Promise<OrgRole[]> {
    return request<OrgRole[]>('GET', '/api/v1/users/roles');
  }

  async getMembers(): Promise<OrgMember[]> {
    return request<OrgMember[]>('GET', '/api/v1/users/members');
  }

  async inviteUser(data: InviteUserRequest): Promise<{ message: string }> {
    return request<{ message: string }>('POST', '/api/v1/users/invite', data);
  }

  async updateMemberRole(userId: string, data: UpdateRoleRequest): Promise<{ message: string }> {
    return request<{ message: string }>('PATCH', `/api/v1/users/${userId}/role`, data);
  }

  async removeMember(userId: string): Promise<{ message: string }> {
    return request<{ message: string }>('DELETE', `/api/v1/users/${userId}`);
  }

  async getInvitations(): Promise<PendingInvitation[]> {
    return request<PendingInvitation[]>('GET', '/api/v1/users/invitations');
  }

  async revokeInvitation(invitationId: string): Promise<{ message: string }> {
    return request<{ message: string }>(
      'DELETE',
      `/api/v1/users/invitations/${invitationId}`,
    );
  }

  async getInvitationDetail(invitationId: string): Promise<InvitationDetail> {
    return request<InvitationDetail>(
      'GET',
      `/api/v1/users/invitations/${invitationId}/detail`,
    );
  }

  async acceptInvitation(invitationId: string): Promise<{ message: string }> {
    return request<{ message: string }>(
      'PUT',
      `/api/v1/users/invitations/${invitationId}/accept`,
    );
  }
}

export const teamApi = new TeamApi();
