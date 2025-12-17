import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';

export interface CoursePricing {
  is_paid: boolean;
  price: string | number;
  currency: string;
  free_preview_lessons: number;
  allow_tips: boolean;
}

export interface CourseOwner {
  id: number;
  username: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail?: string;
  isPublic: boolean;
  is_public?: boolean;
  lessons: Lesson[];
  progress?: number;
  created_at?: string;
  updated_at?: string;
  owner?: CourseOwner;
  pricing?: CoursePricing;
}

export interface Lesson {
  id: number;
  title: string;
  videoId: string;
  transcript?: string;
  isCompleted?: boolean;
  duration: string;
  order?: number;
}

export interface CreateCourseData {
  title: string;
  description: string;
  isPublic: boolean;
  lessons: Omit<Lesson, 'id'>[];
}

export interface AddLessonPayload {
  title: string;
  video_id?: string;
  video_url?: string;
  duration?: string;
  description?: string;
  transcript?: string;
  transcript_language?: string;
  manual_transcript?: string;
}

const normalizeListResponse = <T>(data: any): T[] => {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.results)) {
    return data.results;
  }
  return [];
};

export const courseService = {
  // Get all courses (user's own + public)
  async getCourses(): Promise<Course[]> {
    const response = await apiClient.get(API_ENDPOINTS.COURSES);
    return normalizeListResponse<Course>(response.data);
  },

  // Get user's courses only
  async getMyCourses(): Promise<Course[]> {
    const response = await apiClient.get(API_ENDPOINTS.MY_COURSES);
    return normalizeListResponse<Course>(response.data);
  },

  // Get single course by ID
  async getCourse(id: number): Promise<Course> {
    const response = await apiClient.get(API_ENDPOINTS.COURSE_DETAIL(id));
    return response.data;
  },

  // Create new course
  async createCourse(data: CreateCourseData): Promise<Course> {
    const response = await apiClient.post(API_ENDPOINTS.COURSES, data);
    return response.data;
  },

  // Update course
  async updateCourse(id: number, data: Partial<CreateCourseData>): Promise<Course> {
    const response = await apiClient.put(API_ENDPOINTS.COURSE_DETAIL(id), data);
    return response.data;
  },

  // Delete course
  async deleteCourse(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.COURSE_DETAIL(id));
  },

  // Get course lessons
  async getCourseLessons(courseId: number): Promise<Lesson[]> {
    const response = await apiClient.get(API_ENDPOINTS.COURSE_LESSONS(courseId));
    return response.data;
  },

  // Start course (track progress)
  async startCourse(courseId: number): Promise<void> {
    await apiClient.post(API_ENDPOINTS.START_COURSE, { course_id: courseId });
  },

  // Complete lesson
  async completeLesson(lessonId: number): Promise<void> {
    await apiClient.post(API_ENDPOINTS.COMPLETE_LESSON(lessonId));
  },

  async ensurePersonalCourse(): Promise<{ course: Course; created: boolean }> {
    const response = await apiClient.post(`${API_ENDPOINTS.COURSES}ensure_personal/`);
    return response.data;
  },

  async addLessonToCourse(courseId: number, payload: AddLessonPayload): Promise<Lesson> {
    const response = await apiClient.post(`${API_ENDPOINTS.COURSES}${courseId}/add_lesson/`, payload);
    return response.data;
  },

  async getCoursePricing(courseId: number): Promise<CoursePricing> {
    const response = await apiClient.get(API_ENDPOINTS.COURSE_PRICING(courseId));
    return response.data;
  },

  async updateCoursePricing(courseId: number, data: Partial<CoursePricing>): Promise<CoursePricing> {
    const response = await apiClient.patch(API_ENDPOINTS.COURSE_PRICING(courseId), data);
    return response.data;
  },

  async purchaseCourse(courseId: number, payload: { payment_id: number }): Promise<any> {
    const response = await apiClient.post(API_ENDPOINTS.COURSE_PURCHASE(courseId), payload);
    return response.data;
  },

  async tipCreator(courseId: number, payload: { payment_id: number; amount: number; message?: string }): Promise<any> {
    const response = await apiClient.post(API_ENDPOINTS.COURSE_TIP(courseId), payload);
    return response.data;
  },

  async getCreatorDashboard(): Promise<any> {
    const response = await apiClient.get(API_ENDPOINTS.CREATOR_DASHBOARD);
    return response.data;
  },
};
