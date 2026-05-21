import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  curriculumService,
  type UnitTrack,
  type CreateUnitData,
  type AddLessonData,
} from '../services/curriculumService';

export const CURRICULUM_KEYS = {
  all: ['curriculum'] as const,
  units: (track?: UnitTrack, search?: string) =>
    [...CURRICULUM_KEYS.all, 'units', track ?? 'all', search ?? ''] as const,
  unit: (id: number) => [...CURRICULUM_KEYS.all, 'unit', id] as const,
  papers: (id: number) => [...CURRICULUM_KEYS.all, 'papers', id] as const,
  lessons: (id: number) => [...CURRICULUM_KEYS.all, 'lessons', id] as const,
  enrolled: () => [...CURRICULUM_KEYS.all, 'enrolled'] as const,
};

export const useUnits = (track?: UnitTrack, search?: string) =>
  useQuery({
    queryKey: CURRICULUM_KEYS.units(track, search),
    queryFn: () => curriculumService.getUnits(track, search),
    staleTime: 5 * 60 * 1000,
  });

export const useUnit = (id: number | null) =>
  useQuery({
    queryKey: CURRICULUM_KEYS.unit(id ?? 0),
    queryFn: () => curriculumService.getUnit(id as number),
    enabled: !!id,
  });

export const useUnitPapers = (id: number | null) =>
  useQuery({
    queryKey: CURRICULUM_KEYS.papers(id ?? 0),
    queryFn: () => curriculumService.getUnitPapers(id as number),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

export const useUnitLessons = (id: number | null) =>
  useQuery({
    queryKey: CURRICULUM_KEYS.lessons(id ?? 0),
    queryFn: () => curriculumService.getUnitLessons(id as number),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

export const useEnrolledUnits = () =>
  useQuery({
    queryKey: CURRICULUM_KEYS.enrolled(),
    queryFn: curriculumService.getEnrolledUnits,
    staleTime: 60 * 1000,
  });

export const useEnrolUnit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => curriculumService.enrolUnit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURRICULUM_KEYS.all });
    },
  });
};

export const useUnenrolUnit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => curriculumService.unenrolUnit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURRICULUM_KEYS.all });
    },
  });
};

export const useCreateUnit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUnitData) => curriculumService.createUnit(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURRICULUM_KEYS.all });
    },
  });
};

// ── Unit lessons ──────────────────────────────────────────────────────────────

export const useAddLesson = (unitId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddLessonData) => curriculumService.addUnitLesson(unitId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURRICULUM_KEYS.lessons(unitId) });
      qc.invalidateQueries({ queryKey: CURRICULUM_KEYS.unit(unitId) });
    },
  });
};

export const useUpdateLesson = (unitId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: number; data: Partial<AddLessonData> }) =>
      curriculumService.updateUnitLesson(lessonId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CURRICULUM_KEYS.lessons(unitId) }),
  });
};

export const useDeleteLesson = (unitId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: number) => curriculumService.deleteUnitLesson(lessonId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURRICULUM_KEYS.lessons(unitId) });
      qc.invalidateQueries({ queryKey: CURRICULUM_KEYS.unit(unitId) });
    },
  });
};

export const useToggleLessonComplete = (unitId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: number) => curriculumService.toggleLessonComplete(lessonId),
    onSuccess: () => qc.invalidateQueries({ queryKey: CURRICULUM_KEYS.lessons(unitId) }),
  });
};
