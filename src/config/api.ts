const DEFAULT_API_BASE = 'http://localhost:8000/api';

const pickValidBaseUrl = (value?: string): string => {
  if (!value || typeof value !== 'string') return DEFAULT_API_BASE;
  const candidates = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    // Skip wildcard-like entries such as *.onrender.com
    if (candidate.includes('*')) continue;
    if (/^https?:\/\//i.test(candidate)) {
      return candidate;
    }
  }

  return DEFAULT_API_BASE;
};

const rawBaseUrl = pickValidBaseUrl(import.meta.env.VITE_API_BASE_URL);
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
  LOGIN: 'auth/login/',
  REGISTER: 'auth/registration/',
  LOGOUT: 'auth/logout/',
  REFRESH_TOKEN: 'auth/token/refresh/',
  PASSWORD_RESET: 'auth/password/reset/',
  PASSWORD_RESET_CONFIRM: 'auth/password/reset/confirm/',
  GOOGLE_LOGIN: 'users/google-login/',
  
  // Users
  USER_ME: 'users/me/',
  USER_USAGE: 'users/me/usage/',
  UPGRADE_TIER: 'users/upgrade_tier/',
  ADMIN_STATS: 'users/admin/stats/',
  USERS_CHALLENGEABLE: 'users/challengeable/',
  
  // Courses
  COURSES: 'courses/',
  COURSE_DETAIL: (id: number) => `courses/${id}/`,
  COURSE_LESSONS: (id: number) => `courses/${id}/lessons/`,
  MY_COURSES: 'courses/my_courses/',
  COURSE_PRICING: (id: number) => `courses/${id}/pricing/`,
  COURSE_PURCHASE: (id: number) => `courses/${id}/purchase/`,
  COURSE_TIP: (id: number) => `courses/${id}/tip/`,
  CREATOR_DASHBOARD: 'courses/creator_dashboard/',
  START_COURSE: 'progress/start_course/',
  COMPLETE_LESSON: (id: number) => `progress/${id}/complete_lesson/`,
  
  // Assessments
  ASSESSMENTS: 'assessments/',
  ASSESSMENT_DETAIL: (id: number) => `assessments/${id}/`,
  START_ASSESSMENT: (id: number) => `assessments/${id}/start/`,
  SUBMIT_ASSESSMENT: (id: number) => `assessments/${id}/submit/`,
  MY_ASSESSMENTS: 'assessments/my_assessments/',
  ASSESSMENT_QUESTIONS: (id: number) => `assessments/${id}/questions/`,
  
  // Community
  POSTS: 'posts/',
  POST_DETAIL: (id: number) => `posts/${id}/`,
  POST_LIKE: (id: number) => `posts/${id}/like/`,
  POST_COMMENT: (id: number) => `posts/${id}/comment/`,
  MY_POSTS: 'posts/my_posts/',
  
  // AI Services
  AI_GENERATE_QUIZ: 'ai/generate-quiz/',
  AI_CHAT: 'ai/chat/',
  AI_STUDY_PLAN: 'ai/study-plan/',
  AI_EXPLAIN: 'ai/explain/',
  
  // YouTube
  YOUTUBE_EXTRACT_TRANSCRIPT: 'youtube/extract-transcript/',
  YOUTUBE_VIDEO_INFO: 'youtube/video-info/',
  YOUTUBE_SAVE_NOTES: 'youtube/save-notes/',
  YOUTUBE_GET_NOTES: 'youtube/notes/',
  
  // Lessons
  LESSON_FETCH_TRANSCRIPT: (id: number) => `lessons/${id}/fetch_transcript/`,
  LESSON_UPDATE_MANUAL_TRANSCRIPT: (id: number) => `lessons/${id}/update_manual_transcript/`,
  LESSON_GET_TRANSCRIPT: (id: number) => `lessons/${id}/get_transcript/`,
  LESSON_GENERATE_QUIZ: (id: number) => `lessons/${id}/generate_quiz/`,

  // Payments
  PAYMENT_METHODS: 'payments/methods/',
  PAYMENT_HISTORY: 'payments/history/',
  PAYMENT_INITIATE: 'payments/initiate/',
  PAYMENT_SUBSCRIPTION: 'payments/subscription/',
  PAYMENT_SUBSCRIPTION_CANCEL: 'payments/subscription/cancel/',
  PAYMENT_SUBSCRIPTION_UPGRADE: 'payments/subscription/upgrade/',
  PAYMENT_TRIAL_START: 'payments/trial/start/',
  PAYMENT_PAYBILL_CONFIRM: (id: number) => `payments/${id}/confirm-paybill/`,
  PAYMENT_PAYSTACK_VERIFY: 'payments/paystack/verify/',
  PAYMENT_ENTERPRISE_INQUIRY: 'payments/enterprise-inquiry/',
};
