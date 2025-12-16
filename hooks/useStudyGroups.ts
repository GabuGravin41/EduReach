import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StudyGroup } from '../services/studyGroupService';

// Mock data
let mockGroups: StudyGroup[] = [
  { id: '1', name: 'React Learners', description: 'Study group for React course', member_count: 5, max_members: 10, is_public: true, is_member: false, course_title: 'React Basics' },
  { id: '2', name: 'Advanced JS', description: 'Deep dive into JS', member_count: 8, max_members: 15, is_public: true, is_member: true, course_title: 'Advanced JavaScript' },
];

export const useStudyGroups = () => {
  return useQuery({
    queryKey: ['studyGroups'],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(r => setTimeout(r, 500));
      return mockGroups;
    }
  });
};

export const useCreateStudyGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      await new Promise(r => setTimeout(r, 500));
      const newGroup: StudyGroup = {
        id: Date.now().toString(),
        ...data,
        member_count: 1,
        max_members: 10,
        is_public: true,
        is_member: true
      };
      mockGroups.push(newGroup);
      return newGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyGroups'] });
    }
  });
};

export const useJoinStudyGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
        mockGroups = mockGroups.map(g => g.id === groupId ? { ...g, is_member: true, member_count: g.member_count + 1 } : g);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['studyGroups'] })
  });
};

export const useLeaveStudyGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
        mockGroups = mockGroups.map(g => g.id === groupId ? { ...g, is_member: false, member_count: g.member_count - 1 } : g);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['studyGroups'] })
  });
};