import apiClient from './api';

export interface AppNotification {
  id: number;
  notif_type: 'challenge' | 'system';
  title: string;
  message: string;
  assessment_id: number | null;
  share_token: string;
  sender_username: string | null;
  created_at: string;
}

export const notificationService = {
  async getUnread(): Promise<AppNotification[]> {
    const res = await apiClient.get('/notifications/');
    return Array.isArray(res.data) ? res.data : [];
  },

  async markRead(id: number): Promise<void> {
    await apiClient.post(`/notifications/${id}/mark-read/`);
  },

  async markAllRead(): Promise<void> {
    await apiClient.post('/notifications/mark-all-read/');
  },

  async sendChallenge(assessmentId: number, targetUserId: number): Promise<void> {
    await apiClient.post(`/assessments/${assessmentId}/send-challenge/`, {
      target_user_id: targetUserId,
    });
  },
};
