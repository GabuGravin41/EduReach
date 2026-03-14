import apiClient from './api';

export interface CourseChannel {
  id: number;
  course: number;
  course_title?: string;
  created_at: string;
}

export interface DiscussionThread {
  id: number;
  channel: number;
  author: { id: number; username: string };
  title: string;
  content: string;
  is_pinned: boolean;
  views: number;
  reply_count: number;
  vote_count: number;
  created_at: string;
}

export interface ThreadReply {
  id: number;
  thread: number;
  author: { id: number; username: string };
  content: string;
  upvotes: number;
  is_verified: boolean;
  is_accepted: boolean;
  created_at: string;
}

// Backend mounts community routes directly under /api/
const BASE = '';

export const discussionService = {
  async listChannels(): Promise<CourseChannel[]> {
    const { data } = await apiClient.get(`${BASE}/channels/`);
    // Handle DRF pagination: response may be { results: [...] } or a plain array
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async getChannel(id: number): Promise<CourseChannel> {
    const { data } = await apiClient.get(`${BASE}/channels/${id}/`);
    return data;
  },

  async getChannelThreads(channelId: number, params?: { search?: string; sort?: string }): Promise<DiscussionThread[]> {
    const { data } = await apiClient.get(`${BASE}/channels/${channelId}/threads/`, { params });
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async listThreads(params?: Record<string, any>): Promise<DiscussionThread[]> {
    const { data } = await apiClient.get(`${BASE}/threads/`, { params });
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async getThread(id: number): Promise<DiscussionThread> {
    const { data } = await apiClient.get(`${BASE}/threads/${id}/`);
    return data;
  },

  async createThread(payload: { channel: number; title: string; content: string }): Promise<DiscussionThread> {
    const { data } = await apiClient.post(`${BASE}/threads/`, payload);
    return data;
  },

  async listReplies(threadId: number): Promise<ThreadReply[]> {
    const { data } = await apiClient.get(`${BASE}/replies/`, { params: { thread: threadId } });
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async createReply(threadId: number, content: string): Promise<ThreadReply> {
    const { data } = await apiClient.post(`${BASE}/replies/`, { thread: threadId, content });
    return data;
  },

  async voteReply(replyId: number, voteType: 'helpful' | 'not_helpful' = 'helpful'): Promise<{ helpful_votes: number; not_helpful_votes: number; user_vote_type: string | null }> {
    const { data } = await apiClient.post(`${BASE}/replies/${replyId}/vote/`, { vote_type: voteType });
    return data;
  },

  async pinThread(threadId: number): Promise<any> {
    const { data } = await apiClient.post(`${BASE}/threads/${threadId}/pin/`);
    return data;
  },

  async markReplyAccepted(replyId: number): Promise<any> {
    const { data } = await apiClient.post(`${BASE}/replies/${replyId}/mark_as_accepted/`);
    return data;
  },

  async verifyReply(replyId: number): Promise<any> {
    const { data } = await apiClient.post(`${BASE}/replies/${replyId}/verify/`);
    return data;
  },
};

export default discussionService;
