import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  curriculumService,
  type UnitTrack,
  type CreateUnitData,
} from '../services/curriculumService';

export const CURRICULUM_KEYS = {
  all: ['curriculum'] as const,
  units: (track?: UnitTrack, search?: string) =>
    [...CURRICULUM_KEYS.all, 'units', track ?? 'all', search ?? ''] as const,
  unit: (id: number) => [...CURRICULUM_KEYS.all, 'unit', id] as const,
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
