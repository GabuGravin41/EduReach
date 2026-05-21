import apiClient from './api';

export type UnitTrack = 'engineering' | 'olympiad' | 'general';

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
  is_public: boolean;
  source_course: number | null;
  paper_count: number;
  lesson_count: number;
  is_enrolled: boolean;
  created_at: string;
}

export interface UnitLesson {
  id: number;
  unit: number;
  title: string;
  video_id: string;
  video_url: string;
  duration: string;
  order: number;
  description: string;
  is_completed: boolean;
  thumbnail_url: string;
  has_transcript: boolean;
  added_by: number | null;
}

export interface AddLessonData {
  title: string;
  video_url: string;
  description?: string;
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

/** Profile fields used to tailor what a user is shown first. */
export interface ProfileSignal {
  track?: string;
  learner_type?: string;
  interests?: string;
  learning_goal?: string;
  degree_course?: string;
}

/**
 * Recommend a unit track from the user's onboarding profile. The platform
 * itself is generic — this only decides what to surface FIRST, so the
 * experience is tailored without the catalog being hardcoded.
 * Returns null when the profile gives no clear signal.
 */
export function profileTrack(user: ProfileSignal | null | undefined): UnitTrack | null {
  if (!user) return null;
  const explicit = (user.track || '').toLowerCase();
  if (explicit === 'engineering' || explicit === 'olympiad') return explicit;

  const blob = [user.learner_type, user.interests, user.learning_goal, user.degree_course]
    .filter(Boolean).join(' ').toLowerCase();
  if (/\b(olympiad|imo|pamo|eamo|competition)\b/.test(blob)) return 'olympiad';
  if (/\b(univ|college|degree|engineer|undergrad|campus)\b/.test(blob)) return 'engineering';
  return null;
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

  async getUnitLessons(id: number): Promise<UnitLesson[]> {
    const res = await apiClient.get(`curriculum/units/${id}/lessons/`);
    return Array.isArray(res.data) ? res.data : res.data.results ?? [];
  },

  async addUnitLesson(unitId: number, data: AddLessonData): Promise<UnitLesson> {
    const res = await apiClient.post(`curriculum/units/${unitId}/add-lesson/`, data);
    return res.data;
  },

  async updateUnitLesson(lessonId: number, data: Partial<AddLessonData>): Promise<UnitLesson> {
    const res = await apiClient.patch(`curriculum/unit-lessons/${lessonId}/`, data);
    return res.data;
  },

  async deleteUnitLesson(lessonId: number): Promise<void> {
    await apiClient.delete(`curriculum/unit-lessons/${lessonId}/`);
  },

  async toggleLessonComplete(lessonId: number): Promise<boolean> {
    const res = await apiClient.post(`curriculum/unit-lessons/${lessonId}/complete/`);
    return !!res.data?.is_completed;
  },

  async attachAssessment(unitId: number, assessmentId: number): Promise<void> {
    await apiClient.post(`curriculum/units/${unitId}/attach-assessment/`, {
      assessment_id: assessmentId,
    });
  },

  async detachAssessment(unitId: number, assessmentId: number): Promise<void> {
    await apiClient.post(`curriculum/units/${unitId}/detach-assessment/`, {
      assessment_id: assessmentId,
    });
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
