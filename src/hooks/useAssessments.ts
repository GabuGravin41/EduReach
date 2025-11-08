import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentService, Assessment, CreateAssessmentData } from '../services/assessmentService';

// Query keys
export const ASSESSMENT_KEYS = {
  all: ['assessments'] as const,
  lists: () => [...ASSESSMENT_KEYS.all, 'list'] as const,
  list: (filters: string) => [...ASSESSMENT_KEYS.lists(), filters] as const,
  details: () => [...ASSESSMENT_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...ASSESSMENT_KEYS.details(), id] as const,
  my: () => [...ASSESSMENT_KEYS.all, 'my'] as const,
};

// Get all assessments
export const useAssessments = () => {
  return useQuery({
    queryKey: ASSESSMENT_KEYS.lists(),
    queryFn: assessmentService.getAssessments,
    staleTime: 5 * 60 * 1000,
  });
};

// Get user's assessments
export const useMyAssessments = () => {
  return useQuery({
    queryKey: ASSESSMENT_KEYS.my(),
    queryFn: assessmentService.getMyAssessments,
    staleTime: 5 * 60 * 1000,
  });
};

// Get single assessment
export const useAssessment = (id: number) => {
  return useQuery({
    queryKey: ASSESSMENT_KEYS.detail(id),
    queryFn: () => assessmentService.getAssessment(id),
    enabled: !!id,
  });
};

// Update assessment mutation to use time_limit
export const useCreateAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assessmentService.createAssessment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.my() });
    },
  });
};

// Update assessment mutation
export const useUpdateAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateAssessmentData> }) =>
      assessmentService.updateAssessment(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.my() });
    },
  });
};

// Delete assessment mutation
export const useDeleteAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assessmentService.deleteAssessment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.my() });
    },
  });
};

// Start assessment mutation
export const useStartAssessment = () => {
  return useMutation({
    mutationFn: assessmentService.startAssessment,
  });
};

// Submit assessment mutation
export const useSubmitAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, answers }: { id: number; answers: Record<number, string> }) =>
      assessmentService.submitAssessment(id, answers),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.my() });
    },
  });
};
