export type View =
  | 'dashboard'
  | 'courses'
  | 'create_course'
  | 'course_detail'
  | 'assessments'
  | 'create_exam'
  | 'generate_ai_quiz'
  | 'exam_detail'
  | 'community'
  | 'study_groups'
  | 'billing'
  | 'profile'
  | 'admin_panel'
  | 'setup_session'
  | 'learning_session'
  | 'bulk_create_exam';

export const ROUTES = {
  dashboard: '/dashboard',
  courses: '/courses',
  createCourse: '/courses/new',
  courseDetail: (id: number) => `/courses/${id}`,
  assessments: '/assessments',
  createExam: '/assessments/new',
  generateAiQuiz: '/assessments/ai',
  examDetail: (id: number) => `/assessments/${id}`,
  community: '/community',
  studyGroups: '/study-groups',
  billing: '/billing',
  profile: '/profile',
  adminPanel: '/admin',
  setupSession: '/session',
  learn: '/learn',
  bulkCreateExam: '/assessments/bulk',
} as const;

const VIEW_TO_PATH: Record<View, string | ((opts?: { courseId?: number; examId?: number }) => string)> = {
  dashboard: ROUTES.dashboard,
  courses: ROUTES.courses,
  create_course: ROUTES.createCourse,
  course_detail: (opts) => (opts?.courseId != null ? ROUTES.courseDetail(opts.courseId) : ROUTES.courses),
  assessments: ROUTES.assessments,
  create_exam: ROUTES.createExam,
  generate_ai_quiz: ROUTES.generateAiQuiz,
  exam_detail: (opts) => (opts?.examId != null ? ROUTES.examDetail(opts.examId) : ROUTES.assessments),
  community: ROUTES.community,
  study_groups: ROUTES.studyGroups,
  billing: ROUTES.billing,
  profile: ROUTES.profile,
  admin_panel: ROUTES.adminPanel,
  setup_session: ROUTES.setupSession,
  learning_session: ROUTES.learn,
  bulk_create_exam: ROUTES.bulkCreateExam,
};

export function viewToPath(
  view: View,
  opts?: { courseId?: number; examId?: number }
): string {
  const path = VIEW_TO_PATH[view];
  if (path == null) return ROUTES.dashboard;
  if (typeof path === 'function') return path(opts);
  return path;
}

export function pathnameToView(pathname: string): { view: View; courseId: number | null; examId: number | null } {
  const raw = (pathname || '/').replace(/\/+/g, '/');
  const p = raw.replace(/\/$/, '') || '/';
  const segments = p.split('/').filter(Boolean);

  if (p === '/' || p === '/dashboard') return { view: 'dashboard', courseId: null, examId: null };
  if (p === '/courses') return { view: 'courses', courseId: null, examId: null };
  if (p === '/courses/new') return { view: 'create_course', courseId: null, examId: null };
  if (segments[0] === 'courses' && segments[1] && /^\d+$/.test(segments[1]))
    return { view: 'course_detail', courseId: parseInt(segments[1], 10), examId: null };
  if (p === '/assessments') return { view: 'assessments', courseId: null, examId: null };
  if (p === '/assessments/new') return { view: 'create_exam', courseId: null, examId: null };
  if (p === '/assessments/ai') return { view: 'generate_ai_quiz', courseId: null, examId: null };
  if (p === '/assessments/bulk') return { view: 'bulk_create_exam', courseId: null, examId: null };
  if (segments[0] === 'assessments' && segments[1] && /^\d+$/.test(segments[1]))
    return { view: 'exam_detail', courseId: null, examId: parseInt(segments[1], 10) };
  if (segments[0] === 'courses') return { view: 'courses', courseId: null, examId: null };
  if (segments[0] === 'assessments') return { view: 'assessments', courseId: null, examId: null };
  if (p === '/community') return { view: 'community', courseId: null, examId: null };
  if (p === '/study-groups') return { view: 'study_groups', courseId: null, examId: null };
  if (p === '/pricing' || p === '/billing') return { view: 'billing', courseId: null, examId: null };
  if (p === '/profile') return { view: 'profile', courseId: null, examId: null };
  if (p === '/admin') return { view: 'admin_panel', courseId: null, examId: null };
  if (p === '/session') return { view: 'setup_session', courseId: null, examId: null };
  if (p === '/learn') return { view: 'learning_session', courseId: null, examId: null };

  return { view: 'dashboard', courseId: null, examId: null };
}
