export type View =
  | 'dashboard'
  | 'unit_detail'
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
  | 'personal_sessions'
  | 'bulk_create_exam'
  | 'analytics'
  | 'terms'
  | 'privacy'
  | 'join_exam'
  | 'exam_sessions'
  | 'join_group';

export const ROUTES = {
  dashboard: '/dashboard',
  unitDetail: (id: number) => `/units/${id}`,
  courses: '/courses',
  createCourse: '/courses/new',
  courseDetail: (id: number) => `/courses/${id}`,
  assessments: '/assessments',
  createExam: '/assessments/new',
  generateAiQuiz: '/assessments/ai',
  examDetail: (id: number) => `/assessments/${id}`,
  community: '/community',
  studyGroups: '/study-groups',
  studyGroupDetail: (id: number) => `/study-groups/${id}`,
  billing: '/billing',
  profile: '/profile',
  adminPanel: '/admin',
  setupSession: '/session',
  personalSessions: '/my-sessions',
  learn: '/learn',
  bulkCreateExam: '/assessments/bulk',
  analytics: '/analytics',
  terms: '/terms',
  privacy: '/privacy',
  joinExam: '/join',
  examSessions: '/exam-sessions',
  joinGroup: '/invite',
} as const;

type RouteOpts = { courseId?: number; examId?: number; unitId?: number };

const VIEW_TO_PATH: Record<View, string | ((opts?: RouteOpts) => string)> = {
  dashboard: ROUTES.dashboard,
  unit_detail: (opts) => (opts?.unitId != null ? ROUTES.unitDetail(opts.unitId) : ROUTES.dashboard),
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
  personal_sessions: ROUTES.personalSessions,
  learning_session: ROUTES.learn,
  bulk_create_exam: ROUTES.bulkCreateExam,
  analytics: ROUTES.analytics,
  terms: ROUTES.terms,
  privacy: ROUTES.privacy,
  join_exam: ROUTES.joinExam,
  exam_sessions: ROUTES.examSessions,
  join_group: ROUTES.joinGroup,
};

export function viewToPath(view: View, opts?: RouteOpts): string {
  const path = VIEW_TO_PATH[view];
  if (path == null) return ROUTES.dashboard;
  if (typeof path === 'function') return path(opts);
  return path;
}

export interface ParsedRoute {
  view: View;
  courseId: number | null;
  examId: number | null;
  unitId: number | null;
}

export function pathnameToView(pathname: string): ParsedRoute {
  const raw = (pathname || '/').replace(/\/+/g, '/');
  const p = raw.replace(/\/$/, '') || '/';
  const segments = p.split('/').filter(Boolean);
  const base: ParsedRoute = { view: 'dashboard', courseId: null, examId: null, unitId: null };

  if (p === '/' || p === '/dashboard') return base;
  if (segments[0] === 'units' && segments[1] && /^\d+$/.test(segments[1]))
    return { ...base, view: 'unit_detail', unitId: parseInt(segments[1], 10) };
  if (p === '/courses') return { ...base, view: 'courses' };
  if (p === '/courses/new') return { ...base, view: 'create_course' };
  if (segments[0] === 'courses' && segments[1] && /^\d+$/.test(segments[1]))
    return { ...base, view: 'course_detail', courseId: parseInt(segments[1], 10) };
  if (p === '/assessments') return { ...base, view: 'assessments' };
  if (p === '/assessments/new') return { ...base, view: 'create_exam' };
  if (p === '/assessments/ai') return { ...base, view: 'generate_ai_quiz' };
  if (p === '/assessments/bulk') return { ...base, view: 'bulk_create_exam' };
  if (segments[0] === 'assessments' && segments[1] && /^\d+$/.test(segments[1]))
    return { ...base, view: 'exam_detail', examId: parseInt(segments[1], 10) };
  if (segments[0] === 'courses') return { ...base, view: 'courses' };
  if (segments[0] === 'assessments') return { ...base, view: 'assessments' };
  if (p === '/community') return { ...base, view: 'community' };
  if (segments[0] === 'study-groups') return { ...base, view: 'study_groups' };
  if (p === '/pricing' || p === '/billing') return { ...base, view: 'billing' };
  if (p === '/profile') return { ...base, view: 'profile' };
  if (p === '/admin') return { ...base, view: 'admin_panel' };
  if (p === '/session') return { ...base, view: 'setup_session' };
  if (p === '/my-sessions') return { ...base, view: 'personal_sessions' };
  if (p === '/learn') return { ...base, view: 'learning_session' };
  if (p === '/analytics') return { ...base, view: 'analytics' };
  if (p === '/terms') return { ...base, view: 'terms' };
  if (p === '/privacy') return { ...base, view: 'privacy' };
  if (p === '/join') return { ...base, view: 'join_exam' };
  if (p === '/exam-sessions') return { ...base, view: 'exam_sessions' };
  if (p === '/invite') return { ...base, view: 'join_group' };

  return base;
}
