import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';

export interface StudyGroupCreator {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  xp_points?: number;
  level?: number;
}

export interface StudyGroup {
  id: number;
  name: string;
  description?: string;
  course?: number | null;
  course_title?: string;
  creator?: StudyGroupCreator;
  is_public: boolean;
  max_members: number;
  member_count: number;
  is_member: boolean;
  invite_token?: string;
  invite_enabled?: boolean;
  created_at: string;
}

export interface StudyGroupChallenge {
  id: number;
  group: StudyGroup;
  title: string;
  description?: string;
  assessment?: number | null;
  assessment_title?: string;
  start_date: string;
  end_date?: string | null;
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
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async createGroup(payload: CreateStudyGroupPayload): Promise<StudyGroup> {
    const { data } = await apiClient.post('/study-groups/groups/', payload);
    return data;
  },

  async updateGroup(id: number, payload: Partial<CreateStudyGroupPayload>): Promise<StudyGroup> {
    const { data } = await apiClient.patch(`/study-groups/groups/${id}/`, payload);
    return data;
  },

  async joinGroup(id: number): Promise<void> {
    await apiClient.post(`/study-groups/groups/${id}/join/`);
  },

  async joinGroupByToken(token: string): Promise<{ detail: string; group_id: number }> {
    const { data } = await apiClient.post('/study-groups/groups/join-by-token/', { token });
    return data;
  },

  async leaveGroup(id: number): Promise<void> {
    await apiClient.post(`/study-groups/groups/${id}/leave/`);
  },

  async listGroupPosts(groupId: number): Promise<StudyGroupPost[]> {
    const { data } = await apiClient.get('/study-groups/group-posts/', {
      params: { group: groupId },
    });
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async createGroupPost(groupId: number, content: string): Promise<StudyGroupPost> {
    const { data } = await apiClient.post('/study-groups/group-posts/', {
      group: groupId,
      content,
    });
    return data;
  },

  async updateGroupPost(postId: number, content: string): Promise<StudyGroupPost> {
    const { data } = await apiClient.patch(`/study-groups/group-posts/${postId}/`, { content });
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
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async createChallenge(payload: {
    group: number;
    title: string;
    description?: string;
    assessment?: number | null;
    start_date?: string;
    end_date?: string | null;
  }) {
    const { data } = await apiClient.post('/study-groups/challenges/', payload);
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

  async getGroupAssessmentPerformance(groupId: number) {
    const { data } = await apiClient.get(`/study-groups/groups/${groupId}/assessment-performance/`);
    return data;
  },
};

export default studyGroupService;


