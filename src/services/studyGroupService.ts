import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';

export interface StudyGroup {
  id: number;
  name: string;
  description?: string;
  course?: number | null;
  course_title?: string;
  is_public: boolean;
  max_members: number;
  member_count: number;
  is_member: boolean;
  created_at: string;
}

export interface StudyGroupPost {
  id: number;
  group: number;
  author: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  };
  content: string;
  created_at: string;
}

export interface CreateStudyGroupPayload {
  name: string;
  description?: string;
  course?: number | null;
  is_public?: boolean;
  max_members?: number;
}

export const studyGroupService = {
  async listGroups(params?: { course?: number }): Promise<StudyGroup[]> {
    const { data } = await apiClient.get('/study-groups/groups/', { params });
    return data;
  },

  async createGroup(payload: CreateStudyGroupPayload): Promise<StudyGroup> {
    const { data } = await apiClient.post('/study-groups/groups/', payload);
    return data;
  },

  async joinGroup(id: number): Promise<void> {
    await apiClient.post(`/study-groups/groups/${id}/join/`);
  },

  async leaveGroup(id: number): Promise<void> {
    await apiClient.post(`/study-groups/groups/${id}/leave/`);
  },

  async listGroupPosts(groupId: number): Promise<StudyGroupPost[]> {
    const { data } = await apiClient.get('/study-groups/group-posts/', {
      params: { group: groupId },
    });
    return data;
  },

  async createGroupPost(groupId: number, content: string): Promise<StudyGroupPost> {
    const { data } = await apiClient.post('/study-groups/group-posts/', {
      group: groupId,
      content,
    });
    return data;
  },

  async deleteGroupPost(postId: number): Promise<void> {
    await apiClient.delete(`/study-groups/group-posts/${postId}/`);
  },

  async getMembers(groupId: number): Promise<{ id: number; username: string }[]> {
    const { data } = await apiClient.get(`/study-groups/groups/${groupId}/members/`);
    return data;
  },

  async inviteMember(groupId: number, email: string): Promise<void> {
    await apiClient.post(`/study-groups/groups/${groupId}/invite/`, { email });
  },

  async getChallenges(groupId: number) {
    const { data } = await apiClient.get('/study-groups/challenges/', { params: { group: groupId } });
    return data;
  },

  async participateChallenge(challengeId: number, payload: { score?: number; completed?: boolean }) {
    const { data } = await apiClient.post(`/study-groups/challenges/${challengeId}/participate/`, payload);
    return data;
  },

  async getChallengeLeaderboard(challengeId: number) {
    const { data } = await apiClient.get(`/study-groups/challenges/${challengeId}/leaderboard/`);
    return data;
  },
};

export default studyGroupService;


