const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const trimmedBaseUrl = rawBaseUrl.replace(/\/+$/, '');
const normalizedBaseUrl = trimmedBaseUrl.endsWith('/api') ? trimmedBaseUrl : `${trimmedBaseUrl}/api`;

export const API_CONFIG = {
  BASE_URL: normalizedBaseUrl,
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
};

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login/',
  REGISTER: '/auth/registration/',
  LOGOUT: '/auth/logout/',
  REFRESH_TOKEN: '/auth/token/refresh/',
  
  // Users
  USER_ME: '/users/me/',
  UPGRADE_TIER: '/users/upgrade_tier/',
  
  // Courses
  COURSES: '/courses/',
  COURSE_DETAIL: (id: number) => `/courses/${id}/`,
  COURSE_LESSONS: (id: number) => `/courses/${id}/lessons/`,
  MY_COURSES: '/courses/my_courses/',
  START_COURSE: '/progress/start_course/',
  COMPLETE_LESSON: (id: number) => `/progress/${id}/complete_lesson/`,
  
  // Assessments
  ASSESSMENTS: '/assessments/',
  ASSESSMENT_DETAIL: (id: number) => `/assessments/${id}/`,
  START_ASSESSMENT: (id: number) => `/assessments/${id}/start/`,
  SUBMIT_ASSESSMENT: (id: number) => `/assessments/${id}/submit/`,
  MY_ASSESSMENTS: '/assessments/my_assessments/',
  ASSESSMENT_QUESTIONS: (id: number) => `/assessments/${id}/questions/`,
  
  // Community
  POSTS: '/posts/',
  POST_DETAIL: (id: number) => `/posts/${id}/`,
  POST_LIKE: (id: number) => `/posts/${id}/like/`,
  POST_COMMENT: (id: number) => `/posts/${id}/comment/`,
  MY_POSTS: '/posts/my_posts/',
  
  // AI Services
  AI_GENERATE_QUIZ: '/ai/generate-quiz/',
  AI_CHAT: '/ai/chat/',
  AI_STUDY_PLAN: '/ai/study-plan/',
  AI_EXPLAIN: '/ai/explain/',
  
  // YouTube
  YOUTUBE_EXTRACT_TRANSCRIPT: '/youtube/extract-transcript/',
  YOUTUBE_VIDEO_INFO: '/youtube/video-info/',
  YOUTUBE_SAVE_NOTES: '/youtube/save-notes/',
  YOUTUBE_GET_NOTES: '/youtube/notes/',
  
  // Lessons
  LESSON_FETCH_TRANSCRIPT: (id: number) => `/lessons/${id}/fetch_transcript/`,
  LESSON_UPDATE_MANUAL_TRANSCRIPT: (id: number) => `/lessons/${id}/update_manual_transcript/`,
  LESSON_GET_TRANSCRIPT: (id: number) => `/lessons/${id}/get_transcript/`,
  LESSON_GENERATE_QUIZ: (id: number) => `/lessons/${id}/generate_quiz/`,
};
