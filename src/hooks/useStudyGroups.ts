import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import studyGroupService, { StudyGroup, StudyGroupPost } from '../services/studyGroupService';

export const STUDY_GROUP_KEYS = {
  all: ['study-groups'] as const,
  lists: () => [...STUDY_GROUP_KEYS.all, 'list'] as const,
  list: (filter: string) => [...STUDY_GROUP_KEYS.lists(), filter] as const,
  detail: (id: number) => [...STUDY_GROUP_KEYS.all, 'detail', id] as const,
  posts: (groupId: number) => [...STUDY_GROUP_KEYS.all, 'posts', groupId] as const,
  members: (groupId: number) => [...STUDY_GROUP_KEYS.all, 'members', groupId] as const,
  challenges: (groupId: number) => [...STUDY_GROUP_KEYS.all, 'challenges', groupId] as const,
};

export const useStudyGroups = (opts?: { courseId?: number }) => {
  const filter = opts?.courseId ? `course:${opts.courseId}` : 'all';
  return useQuery({
    queryKey: STUDY_GROUP_KEYS.list(filter),
    queryFn: () => studyGroupService.listGroups({ course: opts?.courseId }),
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateStudyGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: studyGroupService.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDY_GROUP_KEYS.lists() });
    },
  });
};

export const useJoinStudyGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: studyGroupService.joinGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDY_GROUP_KEYS.lists() });
    },
  });
};

export const useLeaveStudyGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: studyGroupService.leaveGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDY_GROUP_KEYS.lists() });
    },
  });
};

export const useStudyGroupPosts = (groupId: number) => {
  return useQuery({
    queryKey: STUDY_GROUP_KEYS.posts(groupId),
    queryFn: () => studyGroupService.listGroupPosts(groupId),
    enabled: !!groupId,
  });
};

export const useCreateStudyGroupPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, content }: { groupId: number; content: string }) =>
      studyGroupService.createGroupPost(groupId, content),
    onSuccess: (post: StudyGroupPost) => {
      queryClient.invalidateQueries({ queryKey: STUDY_GROUP_KEYS.posts(post.group) });
    },
  });
};

export const useStudyGroupMembers = (groupId: number) => {
  return useQuery({
    queryKey: STUDY_GROUP_KEYS.members(groupId),
    queryFn: () => studyGroupService.getMembers(groupId),
    enabled: !!groupId,
  });
};

export const useInviteStudyGroupMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, email }: { groupId: number; email: string }) =>
      studyGroupService.inviteMember(groupId, email),
    onSuccess: (_data, variables) => {
      // Refresh members list after inviting
      queryClient.invalidateQueries({ queryKey: STUDY_GROUP_KEYS.members(variables.groupId) });
    },
  });
};

export const useStudyGroupChallenges = (groupId: number) => {
  return useQuery({
    queryKey: STUDY_GROUP_KEYS.challenges(groupId),
    queryFn: () => studyGroupService.getChallenges(groupId),
    enabled: !!groupId,
  });
};

export const useCreateStudyGroupChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: studyGroupService.createChallenge,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: STUDY_GROUP_KEYS.challenges(variables.group) });
    },
  });
};

