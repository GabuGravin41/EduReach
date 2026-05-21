import apiClient from './api';

export type UnitTrack = 'engineering' | 'olympiad';

export interface Unit {
  id: number;
  track: UnitTrack;
  name: string;
  code: string;
  institution: string;
  level: string;
  syllabus_summary: string;
  description: string;
  topic_keywords: string[];
  is_official: boolean;
  paper_count: number;
  is_enrolled: boolean;
  created_at: string;
}

export interface UnitPaper {
  id: number;
  title: string;
  topic: string;
  description: string;
  assessment_type: string;
  difficulty_level: string;
  competition_name: string;
  source_year: number | null;
  question_count: number;
  created_at: string;
}

export interface EnrolledUnit {
  id: number;
  unit: Unit;
  enrolled_at: string;
}

export interface CreateUnitData {
  track: UnitTrack;
  name: string;
  code?: string;
  institution?: string;
  level?: string;
  syllabus_summary: string;
  description?: string;
}

export const curriculumService = {
  async getUnits(track?: UnitTrack, search?: string): Promise<Unit[]> {
    const params: Record<string, string> = {};
    if (track) params.track = track;
    if (search) params.search = search;
    const res = await apiClient.get('curriculum/units/', { params });
    return Array.isArray(res.data) ? res.data : res.data.results ?? [];
  },

  async getUnit(id: number): Promise<Unit> {
    const res = await apiClient.get(`curriculum/units/${id}/`);
    return res.data;
  },

  async getUnitPapers(id: number): Promise<UnitPaper[]> {
    const res = await apiClient.get(`curriculum/units/${id}/papers/`);
    return Array.isArray(res.data) ? res.data : res.data.results ?? [];
  },

  async getEnrolledUnits(): Promise<EnrolledUnit[]> {
    const res = await apiClient.get('curriculum/units/enrolled/');
    return Array.isArray(res.data) ? res.data : res.data.results ?? [];
  },

  async enrolUnit(id: number): Promise<Unit> {
    const res = await apiClient.post(`curriculum/units/${id}/enrol/`);
    return res.data;
  },

  async unenrolUnit(id: number): Promise<void> {
    await apiClient.post(`curriculum/units/${id}/unenrol/`);
  },

  async createUnit(data: CreateUnitData): Promise<Unit> {
    const res = await apiClient.post('curriculum/units/', data);
    return res.data;
  },
};
