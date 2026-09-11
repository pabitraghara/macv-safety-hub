import { request, type PaginatedResponse } from '../base/http';
import type { Notification, NotificationPreference, NotificationPreferenceUpdate } from './types';

export class NotificationsApi {
  async getNotifications(
    page = 1,
    pageSize = 20,
    unreadOnly = false,
  ): Promise<PaginatedResponse<Notification>> {
    return request<PaginatedResponse<Notification>>(
      'GET',
      '/api/v1/notifications',
      undefined,
      { params: { page, page_size: pageSize, unread_only: unreadOnly } },
    );
  }

  async getUnreadCount(): Promise<{ unread_count: number }> {
    return request<{ unread_count: number }>('GET', '/api/v1/notifications/unread-count');
  }

  async markRead(notificationId: string): Promise<Notification> {
    return request<Notification>('POST', `/api/v1/notifications/${notificationId}/read`);
  }

  async markAllRead(): Promise<{ marked_read: number }> {
    return request<{ marked_read: number }>('POST', '/api/v1/notifications/read-all');
  }

  async getPreferences(): Promise<NotificationPreference[]> {
    return request<NotificationPreference[]>('GET', '/api/v1/notifications/preferences');
  }

  async updatePreferences(data: NotificationPreferenceUpdate): Promise<NotificationPreference[]> {
    return request<NotificationPreference[]>('PUT', '/api/v1/notifications/preferences', data);
  }
}

export const notificationsApi = new NotificationsApi();
