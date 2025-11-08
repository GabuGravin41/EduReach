import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseService, Course, CreateCourseData } from '../services/courseService';

// Query keys
export const COURSE_KEYS = {
  all: ['courses'] as const,
  lists: () => [...COURSE_KEYS.all, 'list'] as const,
  list: (filters: string) => [...COURSE_KEYS.lists(), filters] as const,
  details: () => [...COURSE_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...COURSE_KEYS.details(), id] as const,
  my: () => [...COURSE_KEYS.all, 'my'] as const,
};

// Get all courses (user's + public)
export const useCourses = () => {
  return useQuery({
    queryKey: COURSE_KEYS.lists(),
    queryFn: courseService.getCourses,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get user's courses only
export const useMyCourses = () => {
  return useQuery({
    queryKey: COURSE_KEYS.my(),
    queryFn: courseService.getMyCourses,
    staleTime: 5 * 60 * 1000,
  });
};

// Get single course
export const useCourse = (id: number) => {
  return useQuery({
    queryKey: COURSE_KEYS.detail(id),
    queryFn: () => courseService.getCourse(id),
    enabled: !!id,
  });
};

// Create course mutation
export const useCreateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: courseService.createCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.my() });
    },
  });
};

// Update course mutation
export const useUpdateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateCourseData> }) =>
      courseService.updateCourse(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.my() });
    },
  });
};

// Delete course mutation
export const useDeleteCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: courseService.deleteCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.my() });
    },
  });
};

// Start course mutation
export const useStartCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: courseService.startCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.my() });
    },
  });
};

// Complete lesson mutation
export const useCompleteLesson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: courseService.completeLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.my() });
    },
  });
};
