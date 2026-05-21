import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { viewToPath, pathnameToView, ROUTES, type View } from './src/routes';

export type { View };
import { Assessment } from './types';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { AuthProvider } from './src/contexts/AuthContext';
import { useAuth } from './src/contexts/useAuth';
import { useGuest } from './src/contexts/GuestContext';
import { GuestSignUpModal } from './components/GuestSignUpModal';
import { authService } from './src/services/authService';
import { API_CONFIG } from './src/config/api';
import { useCourses, useCreateCourse, useCourse, COURSE_KEYS, useMyCourses } from './src/hooks/useCourses';
import { useAssessments, useCreateAssessment, useAssessment, ASSESSMENT_KEYS } from './src/hooks/useAssessments';
import { useUsage, USAGE_QUERY_KEY } from './src/hooks/useUsage';
import { usePosts, useCreatePost, useToggleLike, useAddComment, useDeletePost } from './src/hooks/useCommunity';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { LandingPage } from './components/LandingPage';
import { LearningSession } from './components/LearningSession';
import { SetupSession } from './components/SetupSession';
import { MyCoursesPage } from './components/MyCoursesPage';
import { CommunityPage } from './components/CommunityPage';
import { CourseDetailPage } from './components/CourseDetailPage';
import { ExamDetailPage } from './components/ExamDetailPage';
import { BillingPage } from './components/BillingPage';
import { TrialBanner } from './components/TrialBanner';
import { PushNotificationPrompt } from './components/PushNotificationPrompt';
import { UserCircleIcon } from './components/icons/UserCircleIcon';
import { MenuIcon } from './components/icons/MenuIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { courseService, Course } from './src/services/courseService';
import { useToast } from './src/contexts/ToastContext';
import { notificationService, type AppNotification } from './src/services/notificationService';
import { FloatingAIAssistant } from './components/FloatingAIAssistant';
import { OnboardingModal, hasCompletedOnboarding } from './components/OnboardingModal';
import { PostAuthOnboardingModal } from './components/PostAuthOnboardingModal';

// Lazy load heavy components for better performance
// Wraps a lazy import so a stale-chunk 404 (post-deploy cache) auto-reloads instead of crashing
const lazyWithReload = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) =>
  lazy(() =>
    factory().catch((err: Error) => {
      const isChunk =
        err.name === 'ChunkLoadError' ||
        /Loading chunk \d+ failed/i.test(err.message) ||
        /Failed to fetch dynamically imported module/i.test(err.message);
      if (isChunk) { window.location.reload(); }
      throw err;
    })
  );

const CreateCoursePage = lazyWithReload(() => import('./components/CreateCoursePage').then(m => ({ default: m.CreateCoursePage })));
const CreateExamPage = lazyWithReload(() => import('./components/CreateExamPage').then(m => ({ default: m.CreateExamPage })));
const GenerateAIQuizPage = lazyWithReload(() => import('./components/GenerateAIQuizPage').then(m => ({ default: m.GenerateAIQuizPage })));
const AdminDashboard = lazyWithReload(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const UserProfilePage = lazyWithReload(() => import('./components/UserProfilePage').then(m => ({ default: m.UserProfilePage })));
const EnhancedAssessmentsPage = lazyWithReload(() => import('./components/EnhancedAssessmentsPage').then(m => ({ default: m.EnhancedAssessmentsPage })));
const StudyGroupsPage = lazyWithReload(() => import('./components/StudyGroupsPage').then(m => ({ default: m.StudyGroupsPage })));
const BulkCreateExamPage = lazyWithReload(() => import('./components/BulkCreateExamPage').then(m => ({ default: m.BulkCreateExamPage })));
const AnalyticsDashboard = lazyWithReload(() => import('./components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const TermsOfServicePage = lazyWithReload(() => import('./components/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })));
const PrivacyPolicyPage = lazyWithReload(() => import('./components/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const JoinExamPage = lazyWithReload(() => import('./components/JoinExamPage'));
const ExamSessionsPage = lazyWithReload(() => import('./components/ExamSessionsPage'));
const PersonalSessionsPage = lazyWithReload(() => import('./components/PersonalSessionsPage').then(m => ({ default: m.PersonalSessionsPage })));
const MySemesterPage = lazyWithReload(() => import('./components/MySemesterPage').then(m => ({ default: m.MySemesterPage })));
const UnitDetailPage = lazyWithReload(() => import('./components/UnitDetailPage').then(m => ({ default: m.UnitDetailPage })));

  
export type UserTier = 'free' | 'learner' | 'pro' | 'pro_plus' | 'admin';
const VALID_TIERS: UserTier[] = ['free', 'learner', 'pro', 'pro_plus', 'admin'];
const normalizeUserTier = (value: unknown): UserTier => {
  return (typeof value === 'string' && VALID_TIERS.includes(value as UserTier))
    ? (value as UserTier)
    : 'free';
};

interface SessionData {
    videoId: string;
    transcript: string;
    title?: string;
    courseId?: number | null;
    lessonId?: number;
    attachToCourse?: boolean;
}

// Mock Data - replaced with API data
// Using empty arrays to force reliance on API (catches integration bugs early)
const initialCourses: Course[] = [];
const initialAssessments: any[] = [];

const initialPosts: any[] = [];
const COURSES_CACHE_KEY = 'edureach:courses-cache:v1';
const LOCAL_ASSESSMENTS_KEY = 'edureach:local-assessments:v1';
const LAST_VIEW_KEY = 'edureach:last-view:v1';
const LAST_SELECTED_COURSE_KEY = 'edureach:last-course-id:v1';
const LAST_SELECTED_EXAM_KEY = 'edureach:last-exam-id:v1';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
type CourseCreationToast = { type: 'success' | 'error'; message: string } | null;

const mapApiAssessmentToUi = (assessment: any): Assessment => ({
  id: assessment.id,
  title: assessment.title,
  topic: assessment.topic || 'General',
  questions: Number(assessment.question_count ?? assessment.questions?.length ?? 0),
  time: Number(assessment.time_limit_minutes ?? assessment.time_limit ?? 30),
  status: 'pending',
  score: '-',
  description: assessment.description,
  created_at: assessment.created_at,
  share_token: assessment.share_token,
  creator: assessment.creator,
   assessment_type: (assessment.assessment_type as any) || 'exam',
  questions_data: assessment.questions?.map((q: any) => ({
    id: String(q.id),
    type:
      q.question_type === 'mcq'
        ? 'multiple_choice'
        : q.question_type === 'true_false'
        ? 'true_false'
        : q.question_type === 'essay'
        ? 'essay'
        : 'short_answer',
    question_text: q.question_text,
    options: q.options || [],
    correct_answer_index: Array.isArray(q.options) ? q.options.indexOf(q.correct_answer) : 0,
    correct_answers: q.correct_answer ? [q.correct_answer] : [],
    correct_answer: q.correct_answer,
    points: q.points || 1,
    explanation: q.explanation || '',
    images: q.images || [],
    case_sensitive: false,
    exact_match: false,
    max_length: 400,
  })),
});

type CommunityViewProps = {
  userTier: UserTier;
  username: string;
};

const CommunityView: React.FC<CommunityViewProps> = ({ userTier, username }) => {
  const { data: apiPosts = [], isLoading: postsLoading } = usePosts();
  const createPostMutation = useCreatePost();
  const toggleLikeMutation = useToggleLike();
  const addCommentMutation = useAddComment();
  const deletePostMutation = useDeletePost();
  const toast = useToast();

  const mappedPosts = Array.isArray(apiPosts)
    ? apiPosts.map((p: any) => ({
        id: p.id,
        // list serializer returns author_username; full serializer returns author (object or string)
        author: p.author_username ?? (typeof p.author === 'string' ? p.author : p.author?.username) ?? 'User',
        avatar: UserCircleIcon,
        time: p.created_at ? new Date(p.created_at).toLocaleString() : 'Just now',
        content: p.content,
        likes: p.like_count ?? p.likes ?? 0,
        comments: Array.isArray(p.comments) ? p.comments : [],
        liked: p.is_liked ?? p.liked ?? false,
      }))
    : [];

  return (
    <CommunityPage
      posts={mappedPosts}
      onPostCreated={async (content) => {
        try {
          await createPostMutation.mutateAsync({ content });
          toast.success('Post shared with the community!');
        } catch (err) {
          toast.error('Failed to post. Please try again.');
        }
      }}
      onToggleLike={(id) => toggleLikeMutation.mutate(id, {
        onError: () => toast.error('Could not update like. Try again.'),
      })}
      onAddComment={async (postId, comment) => addCommentMutation.mutate(
        { postId, data: { content: comment } },
        { onError: () => toast.error('Comment failed. Please try again.') },
      )}
      userTier={userTier}
      onDeletePost={(id) => deletePostMutation.mutate(id, {
        onSuccess: () => toast.success('Post deleted.'),
        onError: () => toast.error('Could not delete post.'),
      })}
      userScore={120}
      username={username}
    />
  );
};

const useDarkMode = () => {
    const [isDark, setIsDark] = useState(() => {
        try {
            const saved = localStorage.getItem('edureach:theme');
            if (saved) return saved === 'dark';
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        } catch { return false; }
    });

    const toggle = () => {
        setIsDark(prev => {
            const next = !prev;
            try {
                localStorage.setItem('edureach:theme', next ? 'dark' : 'light');
                document.documentElement.classList.toggle('dark', next);
            } catch {}
            return next;
        });
    };

    // Sync class on mount in case localStorage was already set
    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { isDark, toggle };
};

const AppContent: React.FC = () => {
    const { user, logout, isLoading, refreshUser } = useAuth();
    const { isGuest, isReady: guestReady, guestTrialExpired, guestDaysRemaining, shouldShowReminder, dismissReminder, exitGuestMode, enterGuestMode } = useGuest();
    const [guestModal, setGuestModal] = useState<{ action: string } | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showPostAuthOnboarding, setShowPostAuthOnboarding] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isDark, toggle: toggleDark } = useDarkMode();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [readNotifIds, setReadNotifIds] = useState<Set<number>>(new Set());
    const [notifOpen, setNotifOpen] = useState(false);

    // Poll for unread notifications every 30s while logged in
    useEffect(() => {
      if (!user) return;
      const fetchNotifs = () => {
        notificationService.getUnread()
          .then(fresh => {
            setNotifications(prev => {
              // merge: keep previously-seen notifications so they stay visible after being read
              const freshIds = new Set(fresh.map(n => n.id));
              const kept = prev.filter(n => !freshIds.has(n.id));
              return [...fresh, ...kept];
            });
          })
          .catch(() => {});
      };
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 30000);
      return () => clearInterval(interval);
    }, [user]);

    // Post-auth onboarding: show ONCE per session for users who haven't completed it.
    // A ref prevents refreshUser() calls from re-triggering the modal after the user
    // has already seen and dismissed it (or after a failed save in the modal itself).
    const onboardingShownRef = useRef(false);
    useEffect(() => {
      if (!user) { onboardingShownRef.current = false; return; } // reset on logout
      if (onboardingShownRef.current) return;                    // already decided this session
      if (user.onboarding_completed === false) {
        onboardingShownRef.current = true;
        setShowPostAuthOnboarding(true);
      }
    }, [user]);

    // Show onboarding modal for any first-time visitor (guest or logged-in)
    useEffect(() => {
      if (!hasCompletedOnboarding()) {
        setShowOnboarding(true);
      }
    }, [user, isGuest]);

    // Close notification dropdown when clicking outside
    useEffect(() => {
      if (!notifOpen) return;
      const handler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-notif-panel]')) setNotifOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [notifOpen]);

    const route = pathnameToView(location.pathname);
    const currentView = route.view;
    const selectedCourseId = route.courseId;
    const selectedExamId = route.examId;
    const selectedUnitId = route.unitId;

    // ── Session tracking — fires on load and every view change ──────────────
    useEffect(() => {
      const SESSION_KEY = 'edureach:session-id';
      let sessionId = '';
      try {
        sessionId = localStorage.getItem(SESSION_KEY) || '';
        if (!sessionId) {
          sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          localStorage.setItem(SESSION_KEY, sessionId);
        }
      } catch {}
      if (!sessionId) return;

      // Fire and forget — never block UX on tracking
      fetch(`${API_CONFIG.BASE_URL}/analytics/track/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          is_guest: isGuest && !user,
          page: currentView || 'landing',
          referrer: typeof document !== 'undefined' ? document.referrer : '',
        }),
        credentials: 'include',
      }).catch(() => {}); // silent
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentView, user?.id, isGuest]);

    // Reset focus mode when leaving exam_detail
    useEffect(() => {
      if (currentView !== 'exam_detail') setExamFocusMode(false);
    }, [currentView]);

    useEffect(() => {
      const path = location.pathname || '/';
      // Only auto-redirect logged-in users away from '/'; unauthenticated users see the landing page
      if ((path === '/' || path === '') && user) {
        navigate(ROUTES.dashboard, { replace: true });
        return;
      }
      if (path === '/pricing') {
        navigate(ROUTES.billing, { replace: true });
        return;
      }
      // Fix literal :courseId or :examId in URL (invalid) -> redirect to list
      if (path.includes('/:courseId') || path === '/courses/:courseId') {
        navigate(ROUTES.courses, { replace: true });
      } else if (path.includes('/:examId') || path === '/assessments/:examId') {
        navigate(ROUTES.assessments, { replace: true });
      }
    }, [location.pathname, navigate]);

    // After login: redirect to the page the user was trying to reach before being sent to LoginScreen
    useEffect(() => {
      if (!user) return;
      const saved = sessionStorage.getItem('edureach:post_login_redirect');
      if (saved) {
        sessionStorage.removeItem('edureach:post_login_redirect');
        navigate(saved, { replace: true });
      }
    }, [user, navigate]);

    const setView = (view: View, opts?: { courseId?: number; examId?: number; unitId?: number; state?: object }) => {
      const path = viewToPath(view, {
        courseId: opts?.courseId ?? (view === 'course_detail' ? selectedCourseId ?? undefined : undefined),
        examId: opts?.examId ?? (view === 'exam_detail' ? selectedExamId ?? undefined : undefined),
        unitId: opts?.unitId ?? (view === 'unit_detail' ? selectedUnitId ?? undefined : undefined),
      });
      navigate(path, opts?.state ? { state: opts.state } : undefined);
    };
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [examFocusMode, setExamFocusMode] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [userTier, setUserTier] = useState<UserTier>('free');
    const [learnerType, setLearnerType] = useState<string>('');
    const [sessionExpiredNotice, setSessionExpiredNotice] = useState('');
    const [aiStatus, setAiStatus] = useState<'unknown' | 'up' | 'down'>('unknown');
    const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [updateToastVisible, setUpdateToastVisible] = useState(false);
    const updateCountdownRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const toast = useToast();
    const setCourseCreationToast = (params: { type: 'success' | 'error', message: string } | null) => {
      if (!params) return;
      if (params.type === 'success') toast.success(params.message);
      else toast.error(params.message);
    };

    const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);
    const [pushPromptDismissed, setPushPromptDismissed] = useState(() => {
      try { return sessionStorage.getItem('edureach:push-prompt-dismissed') === '1'; } catch { return false; }
    });
    const [recentlyCreatedCourseId, setRecentlyCreatedCourseId] = useState<number | null>(null);
    const [cachedCourses, setCachedCourses] = useState<Course[]>(() => {
      if (typeof window === 'undefined') return [];
      try {
        const raw = localStorage.getItem(COURSES_CACHE_KEY);
        return raw ? (JSON.parse(raw) as Course[]) : [];
      } catch {
        return [];
      }
    });
    
    // Fetch courses and usage from backend
    const { data: coursesData = [] } = useCourses();
    const { data: assessmentsData = [], isLoading: assessmentsLoading } = useAssessments();
    const { data: usageData } = useUsage(!!user);
    const createAssessmentMutation = useCreateAssessment();
    const createCourseMutation = useCreateCourse();
    const apiCourses = Array.isArray(coursesData) ? coursesData : [];
    const apiAssessments = Array.isArray(assessmentsData) ? assessmentsData : [];
    const courses = apiCourses.length > 0 ? apiCourses : cachedCourses;
    const [localAssessments, setLocalAssessments] = useState<Assessment[]>(() => {
      if (typeof window === 'undefined') return [];
      try {
        const raw = localStorage.getItem(LOCAL_ASSESSMENTS_KEY);
        if (raw) return JSON.parse(raw) as Assessment[];
      } catch {
        // ignore parse failures
      }
      return [];
    });
    // Use only API assessments so the list reflects real data (no dummy/local merge)
    const assessments = apiAssessments.map(mapApiAssessmentToUi);
    const assessmentDetailQuery = useAssessment(selectedExamId ?? 0);
    const [posts, setPosts] = useState<any[]>([
        { id: 1, author: "Alice", avatar: UserCircleIcon, time: "2h ago", content: "Just finished the React course! Highly recommend it.", likes: 5, comments: [{author: "Bob", content: "Nice job!"}], liked: false }
    ]);
    
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [learningAIOpen, setLearningAIOpen] = useState(false);
    // Reset AI panel whenever a new learning session starts
    useEffect(() => { setLearningAIOpen(false); }, [sessionData?.videoId]);
    const selectedCourseQuery = useCourse(selectedCourseId ?? 0);
  
    useEffect(() => {
      if (user) {
          setUserTier(normalizeUserTier(user.tier));
          setLearnerType(user.learner_type ?? '');
      }
    }, [user]);

    useEffect(() => {
      if (apiCourses.length > 0 && typeof window !== 'undefined') {
        setCachedCourses(apiCourses);
        try {
          const json = JSON.stringify(apiCourses);
          if (json.length < 4 * 1024 * 1024) localStorage.setItem(COURSES_CACHE_KEY, json);
        } catch (e) {
          if (e instanceof DOMException && e.name === 'QuotaExceededError') {
            try { localStorage.removeItem(COURSES_CACHE_KEY); } catch {}
          }
        }
      }
    }, [apiCourses]);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LOCAL_ASSESSMENTS_KEY, JSON.stringify(localAssessments));
        } catch (e) {
          if (e instanceof DOMException && e.name === 'QuotaExceededError') {
            try { localStorage.removeItem(LOCAL_ASSESSMENTS_KEY); } catch {}
          }
        }
      }
    }, [localAssessments]);

    useEffect(() => {
      const handler = () => {
        setSessionExpiredNotice('Your session expired. Please log in again.');
        setTimeout(() => setSessionExpiredNotice(''), 4000);
      };
      window.addEventListener('auth:expired', handler as EventListener);
      return () => window.removeEventListener('auth:expired', handler as EventListener);
    }, []);

    useEffect(() => {
      const handleUp = () => setAiStatus('up');
      const handleDown = () => setAiStatus('down');
      window.addEventListener('ai:up', handleUp as EventListener);
      window.addEventListener('ai:down', handleDown as EventListener);
      return () => {
        window.removeEventListener('ai:up', handleUp as EventListener);
        window.removeEventListener('ai:down', handleDown as EventListener);
      };
    }, []);

    useEffect(() => {
      const onOnline = () => setIsOffline(false);
      const onOffline = () => setIsOffline(true);
      const apiOnline = () => setIsOffline(false);
      const apiOffline = () => setIsOffline(true);

      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      window.addEventListener('network:online', apiOnline as EventListener);
      window.addEventListener('network:offline', apiOffline as EventListener);

      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
        window.removeEventListener('network:online', apiOnline as EventListener);
        window.removeEventListener('network:offline', apiOffline as EventListener);
      };
    }, []);

    useEffect(() => {
      const onBeforeInstallPrompt = (event: Event) => {
        event.preventDefault();
        setInstallEvent(event as BeforeInstallPromptEvent);
        setShowInstallPrompt(true);
      };

      const onAppInstalled = () => {
        setInstallEvent(null);
        setShowInstallPrompt(false);
      };

      window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.addEventListener('appinstalled', onAppInstalled);
      return () => {
        window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.removeEventListener('appinstalled', onAppInstalled);
      };
    }, []);

    useEffect(() => {
      const onSwUpdateAvailable = () => {
        setUpdateToastVisible(true);
        // Auto-refresh after 30 seconds if user ignores the banner
        updateCountdownRef.current = setTimeout(() => {
          handleRefreshToUpdate();
        }, 30000);
      };
      window.addEventListener('sw:update-available', onSwUpdateAvailable as EventListener);
      return () => {
        window.removeEventListener('sw:update-available', onSwUpdateAvailable as EventListener);
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (!recentlyCreatedCourseId) return;
      const timeout = window.setTimeout(() => setRecentlyCreatedCourseId(null), 15000);
      return () => window.clearTimeout(timeout);
    }, [recentlyCreatedCourseId]);

    const limits = {
        // YouTube content is freely accessible educational material — no lesson cap
        lessonsPerCourse: Infinity
    };

    const invalidateCourseQueries = async (courseId?: number) => {
      const tasks: Promise<unknown>[] = [
        queryClient.invalidateQueries({ queryKey: COURSE_KEYS.lists() }),
        queryClient.invalidateQueries({ queryKey: COURSE_KEYS.my() }),
      ];
      if (courseId) {
        tasks.push(queryClient.invalidateQueries({ queryKey: COURSE_KEYS.detail(courseId) }));
      }
      await Promise.all(tasks);
    };

    const handleAddLessonToCourse = async (
      courseId: number,
      lesson: {
        title: string;
        videoId: string;
        videoUrl?: string;
        transcript?: string;
        transcriptLanguage?: string;
        autoFetchTranscript?: boolean;
      }
    ) => {
      await courseService.addLessonToCourse(courseId, {
        title: lesson.title,
        video_id: lesson.videoId,
        video_url: lesson.videoUrl,
        transcript: lesson.transcript ?? '',
        transcript_language: lesson.transcriptLanguage ?? 'en',
        auto_fetch_transcript: lesson.autoFetchTranscript ?? true,
      });
      await invalidateCourseQueries(courseId);
    };
  
    const handleCourseCreated = async (newCourse: any) => {
        try {
          const createdCourse = await createCourseMutation.mutateAsync({
            title: newCourse.title,
            description: newCourse.description,
            isPublic: Boolean(newCourse.isPublic),
            lessons: [],
          });

          const lessons = Array.isArray(newCourse.lessons) ? newCourse.lessons : [];
          for (const lesson of lessons) {
            if (!lesson?.videoId) continue;
            await courseService.addLessonToCourse(createdCourse.id, {
              title: lesson.title || 'Lesson',
              video_id: lesson.videoId,
              transcript: lesson.transcript || '',
              duration: lesson.duration || 'N/A',
              auto_fetch_transcript: !(lesson.transcript && String(lesson.transcript).trim().length > 0),
            });
          }

          await queryClient.invalidateQueries({ queryKey: COURSE_KEYS.lists() });
          await queryClient.invalidateQueries({ queryKey: COURSE_KEYS.my() });
          await queryClient.invalidateQueries({ queryKey: COURSE_KEYS.detail(createdCourse.id) });
          setRecentlyCreatedCourseId(createdCourse.id);
          setCourseCreationToast({
            type: 'success',
            message: `Course "${createdCourse.title}" created with ${lessons.length} lesson${lessons.length === 1 ? '' : 's'}.`,
          });
          setView('courses');
        } catch (error) {
          console.error('Failed to create course:', error);
          const message =
            (error as any)?.response?.data?.error ||
            (error as any)?.response?.data?.detail ||
            'Failed to create course. Please try again.';
          setCourseCreationToast({
            type: 'error',
            message,
          });
        }
    };

    const handleDeleteCourse = async (courseId: number) => {
      try {
        await courseService.deleteCourse(courseId);
        await queryClient.invalidateQueries({ queryKey: COURSE_KEYS.lists() });
        await queryClient.invalidateQueries({ queryKey: COURSE_KEYS.my() });
        setView('courses');
        setCourseCreationToast({
          type: 'success',
          message: 'Course deleted successfully.',
        });
      } catch (error) {
        const message =
          (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.detail ||
          'Failed to delete course. Please try again.';
        setCourseCreationToast({
          type: 'error',
          message,
        });
      }
    };

    const handleUpdateCourseDetails = async (courseId: number, updates: Partial<Course>) => {
      try {
        await courseService.updateCourse(courseId, {
          title: updates.title,
          description: updates.description,
          isPublic: typeof updates.is_public === 'boolean' ? updates.is_public : updates.isPublic,
          lessons: [],
        });
        await queryClient.invalidateQueries({ queryKey: COURSE_KEYS.detail(courseId) });
        await queryClient.invalidateQueries({ queryKey: COURSE_KEYS.lists() });
        await queryClient.invalidateQueries({ queryKey: COURSE_KEYS.my() });
        setCourseCreationToast({
          type: 'success',
          message: 'Course details saved successfully.',
        });
      } catch (error) {
        const message =
          (error as any)?.response?.data?.title?.[0] ||
          (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.detail ||
          'Failed to save course details.';
        setCourseCreationToast({
          type: 'error',
          message,
        });
      }
    };
  
    const handleExamCreated = async (newExam: any) => {
      try {
        await createAssessmentMutation.mutateAsync({
          title: newExam.title,
          topic: newExam.topic || 'General',
          description: newExam.description || '',
          time_limit_minutes: newExam.time_limit_minutes ?? newExam.time ?? 30,
          questions_data: newExam.questions_data || [],
          is_public: typeof newExam.is_public === 'boolean' ? newExam.is_public : true,
          results_visibility: newExam.results_visibility ?? 'opt_in_public',
          ...(newExam.source_lesson ? { source_lesson: newExam.source_lesson } : {}),
        });
        // Ensure fresh data appears on the assessments page
        await queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.lists() });
        await queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.my() });
        await queryClient.refetchQueries({ queryKey: ASSESSMENT_KEYS.lists() });
        setView('assessments');
        setCourseCreationToast({
          type: 'success',
          message: 'Assessment saved successfully! It now appears in your list.',
        });
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 401) {
          setSessionExpiredNotice('Your session expired. Please log in again before creating assessments.');
          await queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.lists() });
          setView('assessments');
          return;
        }

        const backendMessage =
          error?.response?.data?.detail ||
          error?.response?.data?.error ||
          error?.response?.data?.non_field_errors?.[0];

        setCourseCreationToast({
          type: 'error',
          message:
            backendMessage ||
            'Failed to save assessment. Please check your connection and try again.',
        });

        // Do not create a fake local assessment here; user expects real persistence.
        setView('assessments');
      }
    };

    const handleInstallApp = async () => {
      if (!installEvent) return;
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setShowInstallPrompt(false);
      }
    };

    const handleRefreshToUpdate = () => {
      const registration = (window as any).__EDUREACH_SW_REG__ as ServiceWorkerRegistration | undefined;
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        return;
      }
      window.location.reload();
    };
  
    // Show loading spinner while checking authentication OR waiting for guest state to hydrate
    if (isLoading || !guestReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }
  
    // Public pages — no auth required
    if (location.pathname === '/join') {
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
          <JoinExamPage />
        </Suspense>
      );
    }

    if (location.pathname === '/terms') {
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="max-w-4xl mx-auto px-4 py-8">
              <a href="/" className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-6">
                ← Back to EduReach
              </a>
              <TermsOfServicePage />
            </div>
          </div>
        </Suspense>
      );
    }

    if (location.pathname === '/privacy') {
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="max-w-4xl mx-auto px-4 py-8">
              <a href="/" className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-6">
                ← Back to EduReach
              </a>
              <PrivacyPolicyPage />
            </div>
          </div>
        </Suspense>
      );
    }

    if (!user && !isGuest) {
      // First-time visitor: show the onboarding modal over the landing page
      if (!hasCompletedOnboarding()) {
        return (
          <>
            <LandingPage onEnterAsGuest={() => { enterGuestMode(); navigate(ROUTES.dashboard, { replace: true }); }} />
            <OnboardingModal
              mode="visitor"
              onComplete={() => setShowOnboarding(false)}
              onContinueAsGuest={() => {
                setShowOnboarding(false);
                enterGuestMode();
                navigate(ROUTES.dashboard, { replace: true });
              }}
              onSignUp={() => {
                setShowOnboarding(false);
                navigate('/login', { replace: true });
              }}
            />
          </>
        );
      }

      if (location.pathname === '/') {
        return <LandingPage onEnterAsGuest={() => { enterGuestMode(); navigate(ROUTES.dashboard, { replace: true }); }} />;
      }
      const isStudyGroupInvite =
        (location.pathname?.startsWith('/study-groups') && (location.search?.includes('join_group=') || location.search?.includes('join_token='))) ||
        /^\/study-groups\/\d+$/.test(location.pathname || '') ||
        (location.pathname === '/invite' && location.search?.includes('t='));

      // Save intended URL so we can redirect back after login
      const intendedPath = location.pathname + (location.search || '');
      const skipRedirectPaths = ['/', '/login', '/register', '/terms', '/privacy', '/join'];
      if (!skipRedirectPaths.includes(location.pathname)) {
        sessionStorage.setItem('edureach:post_login_redirect', intendedPath);
      }

      return (
        <>
          {sessionExpiredNotice && (
            <div className="fixed top-4 right-4 bg-amber-100 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg shadow-lg z-50">
              {sessionExpiredNotice}
            </div>
          )}
          {isStudyGroupInvite && (
            <div className="mx-4 mt-4 mb-2 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-200 text-center">
              Log in to join this study group. You will be added automatically after signing in.
            </div>
          )}
          {!isStudyGroupInvite && location.search?.includes('share_token=') && (
            <div className="mx-4 mt-4 mb-2 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-200 text-center">
              Log in or create an account to access this shared quiz. You will be taken there automatically after signing in.
            </div>
          )}
          <LoginScreen />
        </>
      );
    }

    // Guest whose 14-day trial has expired — force sign-up, no way around it
    if (!user && isGuest && guestTrialExpired) {
      return (
        <GuestSignUpModal
          reason="trial_expired"
          onSignUp={() => { exitGuestMode(); navigate('/', { replace: true }); }}
          onLogin={() => { exitGuestMode(); navigate('/', { replace: true }); }}
        />
      );
    }
  
    // Only admin panel is fully blocked for guests — all other routes are accessible
    // Write actions within each page show an inline nudge instead of blocking navigation

    const renderContent = () => {
      // Hard block only the admin panel
      if (isGuest && !user && currentView === 'admin_panel') {
        if (!guestModal) setTimeout(() => setGuestModal({ action: 'access the admin panel' }), 0);
        return <MySemesterPage onSelectUnit={(id) => setView('unit_detail', { unitId: id })} username="Guest" />;
      }

      switch (currentView) {
        case 'dashboard':
          return <MySemesterPage onSelectUnit={(id) => setView('unit_detail', { unitId: id })} username={user?.username ?? (user as any)?.email ?? undefined} />;
        case 'unit_detail':
          if (!selectedUnitId) {
            return <MySemesterPage onSelectUnit={(id) => setView('unit_detail', { unitId: id })} username={user?.username ?? (user as any)?.email ?? undefined} />;
          }
          return <UnitDetailPage unitId={selectedUnitId} onBack={() => setView('dashboard')} onSelectPaper={(id) => setView('exam_detail', { examId: id })} />;
        case 'courses':
          return <MyCoursesPage courses={courses} onSelectCourse={(id) => setView('course_detail', { courseId: id })} onNewCourse={() => isGuest && !user ? setGuestModal({ action: 'create a course' }) : setView('create_course')} userTier={userTier} currentUserId={user?.id} highlightedCourseId={recentlyCreatedCourseId ?? undefined} />;
        case 'create_course':
          return <CreateCoursePage onCourseCreated={handleCourseCreated} onCancel={() => setView('courses')} lessonLimit={limits.lessonsPerCourse} setView={setView} />;
        case 'course_detail':
           if (!selectedCourseId) {
             return <MyCoursesPage courses={courses} onSelectCourse={(id) => setView('course_detail', { courseId: id })} onNewCourse={() => setView('create_course')} userTier={userTier} currentUserId={user?.id} highlightedCourseId={recentlyCreatedCourseId ?? undefined} />;
           }
           const courseFromList = courses.find(c => c.id === selectedCourseId);
           const course = selectedCourseQuery.data ?? courseFromList;
           return course ? (
              <CourseDetailPage 
                  course={course} 
                  setView={setView} 
                  onStartLesson={(data) => { setSessionData(data); setView('learning_session', { state: { sessionData: data } }); }} 
                  onAddLesson={handleAddLessonToCourse}
                  userTier={userTier} 
                  currentUserId={user?.id}
                  assessments={assessments} 
                  onSelectExam={(id) => setView('exam_detail', { examId: id })} 
                  onUpdateCourse={handleUpdateCourseDetails}
                  onUpdateLesson={(cId, lId, updates) => {
                    queryClient.refetchQueries({ queryKey: COURSE_KEYS.detail(cId) });
                    queryClient.invalidateQueries({ queryKey: COURSE_KEYS.lists() });
                    queryClient.invalidateQueries({ queryKey: COURSE_KEYS.my() });
                  }}
                  onDeleteCourse={handleDeleteCourse}
              />
           ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Course not found</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-4">This course may have been removed or you don&apos;t have access.</p>
                <button onClick={() => setView('courses')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Back to Courses</button>
              </div>
           );
        case 'assessments':
           return <EnhancedAssessmentsPage
             assessments={assessments}
             onSelectExam={(id) => setView('exam_detail', { examId: id })}
             setView={setView}
             onBulkCreate={user?.tier === 'admin' ? () => setView('bulk_create_exam') : undefined}
             userTier={userTier}
             isLoading={assessmentsLoading}
             userProfile={user || undefined}
             tierUsage={usageData ?? {
               assessments_used: 0,
               assessments_limit: userTier === 'free' ? 5 : Infinity,
               resets_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
             }}
           />;
        case 'create_exam':
           return (
             <CreateExamPage
               onExamCreated={handleExamCreated}
               onExamUpdated={(updated) => {
                 queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.lists() });
                 queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.detail(updated.id) });
                 setView('exam_detail', { examId: updated.id });
               }}
               onCancel={() => setView('assessments')}
               userTier={userTier}
               courses={courses}
             />
           );
        case 'generate_ai_quiz':
           return <GenerateAIQuizPage onQuizCreated={handleExamCreated} onCancel={() => setView('assessments')} courses={courses} />;
         case 'exam_detail': {
           if (!selectedExamId) {
             return (
               <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center">
                 <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Assessment not found</h2>
                 <button onClick={() => setView('assessments')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Back to Assessments</button>
               </div>
             );
           }
           const examFromList = assessments.find(a => a.id === selectedExamId);
           const detailData = assessmentDetailQuery.data;
           // Prefer fresh detail data (has questions); fall back to list item while loading
           const exam = detailData ? mapApiAssessmentToUi(detailData) : (examFromList ?? null);
           // Still loading and we have nothing at all — show spinner
           if (!exam && (assessmentDetailQuery.isLoading || assessmentDetailQuery.isFetching)) {
             return (
               <div className="flex justify-center items-center py-20">
                 <div className="text-center">
                   <div className="inline-block w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                   <p className="text-slate-500 dark:text-slate-400">Loading assessment…</p>
                 </div>
               </div>
             );
           }
           // Pass both the list-item fallback (for title/meta) and the detail query state
           // ExamDetailPage handles its own detail fetch + error/retry UI internally
           return exam ? (
             <ExamDetailPage exam={exam} setView={setView} onFocusModeChange={setExamFocusMode} />
           ) : (
             <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center">
               <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Assessment not found</h2>
               <p className="text-slate-500 dark:text-slate-400 mb-4">It may have been removed or you don&apos;t have access.</p>
               <button onClick={() => setView('assessments')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Back to Assessments</button>
             </div>
           );
         }
        case 'community':
           return <CommunityView userTier={userTier} username={user?.username ?? (user as any)?.email ?? 'User'} />;
        case 'study_groups':
           return <StudyGroupsPage onGuestBlock={(action) => setGuestModal({ action })} isGuest={isGuest && !user} />;
        case 'billing':
           return <BillingPage currentTier={userTier} onSubscriptionActivated={(tier) => setUserTier(tier)} learnerType={learnerType} />;
        case 'profile':
           return <UserProfilePage />;
        case 'admin_panel':
           if (user?.tier !== 'admin') {
             return (
               <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center">
                 <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Access denied</h2>
                 <p className="text-slate-500 dark:text-slate-400 mb-4">This area is for platform administrators only.</p>
                 <button onClick={() => setView('dashboard')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Go to Dashboard</button>
               </div>
             );
           }
           return <AdminDashboard />;
        case 'analytics':
           return <AnalyticsDashboard userTier={userTier} currentUserId={user?.id} />;
        case 'bulk_create_exam':
           if (user?.tier !== 'admin') {
             setView('assessments');
             return null;
           }
           return <BulkCreateExamPage onCancel={() => setView('assessments')} onBatchCreated={() => setView('assessments')} />;
        case 'personal_sessions':
          return (
            <PersonalSessionsPage
              setView={setView}
              courses={courses.map(c => ({ ...c, progress: c.progress ?? 0 })) as any}
              onOpenSession={(session) => {
                setSessionData({ videoId: session.video_id, transcript: session.transcript ?? '' });
                setView('learning_session', { state: { sessionData: { videoId: session.video_id, transcript: session.transcript ?? '' } } });
              }}
            />
          );
        case 'setup_session':
           return <SetupSession onSessionCreated={async (data) => { 
             // Refresh courses after session is created (since a new personal course might have been created)
             console.log('onSessionCreated called with data:', data);
             console.log('Before invalidation, current courses:', courses);
             // Wait for the query to refetch before proceeding
             await queryClient.refetchQueries({ queryKey: COURSE_KEYS.lists() });
             console.log('Query refetched, new courses:', courses);
             setSessionData(data); 
             setView('learning_session', { state: { sessionData: data } }); 
           }} courses={courses} />;
        case 'learning_session': {
           const learningSessionData = (location.state as { sessionData?: SessionData } | null)?.sessionData ?? sessionData;
           if (learningSessionData) {
               return <LearningSession
                  videoId={learningSessionData.videoId}
                  transcript={learningSessionData.transcript}
                  courseId={learningSessionData.courseId || 0}
                  currentLesson={undefined}
                  onUpdateLesson={(cId, lId, updates) => {
                      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.lists() });
                  }}
                  onSaveAssessment={(assessment) => {
                      setLocalAssessments((prev) => [...prev, assessment]);
                  }}
                  isAIPanelOpen={learningAIOpen}
                  setIsAIPanelOpen={setLearningAIOpen}
                  onStartNewSession={(data) => {
                      const newSession: SessionData = { videoId: data.videoId, transcript: data.transcript, title: data.title };
                      setSessionData(newSession);
                      setView('learning_session', { state: { sessionData: newSession } });
                  }}
               />;
           }
           return (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center">
                <p className="text-slate-600 dark:text-slate-400 mb-4">No session data. Start a lesson from a course or the dashboard.</p>
                <button onClick={() => setView('dashboard')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Go to Dashboard</button>
              </div>
           );
        }
        case 'terms':
           return <TermsOfServicePage />;
        case 'privacy':
           return <PrivacyPolicyPage />;
        case 'join_exam':
           return <JoinExamPage />;
        case 'join_group': {
          // /invite?t=TOKEN → redirect to /study-groups?join_token=TOKEN
          const inviteToken = new URLSearchParams(location.search || '').get('t');
          if (inviteToken) {
            navigate(`/study-groups?join_token=${encodeURIComponent(inviteToken)}`, { replace: true });
          } else {
            navigate('/study-groups', { replace: true });
          }
          return null;
        }
        case 'exam_sessions': {
          const isEducator = learnerType === 'teacher' || learnerType === 'professional';
          if (!isEducator) { setView('dashboard'); return null; }
          return <ExamSessionsPage userAssessments={assessments.map(a => ({ id: a.id, title: a.title }))} />;
        }
        default:
          return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Page not found</h2>
              <button onClick={() => setView('dashboard')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Go to Dashboard</button>
            </div>
          );
      }
    };
  
    return (
      <>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-y-hidden">
        {/* Spacer that reserves sidebar width so content doesn't slide under the fixed sidebar */}
        <div className={`hidden lg:block flex-shrink-0 ${examFocusMode ? 'w-0' : isSidebarCollapsed ? 'w-20' : 'w-64'} transition-all duration-300`} />
        <Sidebar
          currentView={currentView}
          setView={setView}
          onLogout={async () => { await logout(); }}
          onNewSession={() => setView('setup_session')}
          isCollapsed={isSidebarCollapsed || examFocusMode}
          setIsCollapsed={setIsSidebarCollapsed}
          userTier={userTier}
          onTierChange={setUserTier}
          learnerType={learnerType}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          isDark={isDark}
          onToggleDark={toggleDark}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
           <header className="lg:hidden p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">EduReach</span>
                {isOffline && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    Offline
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Mobile notification bell */}
                <button
                  onClick={() => setNotifOpen(prev => !prev)}
                  className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notifications.filter(n => !readNotifIds.has(n.id)).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {notifications.filter(n => !readNotifIds.has(n.id)).length > 9 ? '9+' : notifications.filter(n => !readNotifIds.has(n.id)).length}
                    </span>
                  )}
                </button>
                <button
                  onClick={toggleDark}
                  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  {isDark ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                  )}
                </button>
                <button onClick={() => setIsMobileOpen(true)} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
              </div>
           </header>
           <main className={`flex-1 overflow-y-auto overflow-x-hidden ${currentView === 'learning_session' ? 'p-0 sm:p-4 lg:p-8' : 'p-4 sm:p-6 lg:p-8'}`}>
              {showInstallPrompt && installEvent && (
                <div className="mb-4 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 text-xs font-medium text-indigo-900 dark:text-indigo-100 flex items-center justify-between gap-3">
                  <span>Install EduReach for faster access and better offline support.</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleInstallApp}
                      className="rounded bg-indigo-600 text-white px-2.5 py-1 hover:bg-indigo-700"
                    >
                      Install
                    </button>
                    <button
                      onClick={() => setShowInstallPrompt(false)}
                      className="rounded border border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-200 px-2.5 py-1 hover:bg-indigo-100 dark:hover:bg-indigo-800/40"
                    >
                      Not now
                    </button>
                  </div>
                </div>
              )}
              {/* Trial banner — shown to users on active trial, dismissible per session */}
              {!trialBannerDismissed && user?.is_trial_active && user.trial_days_remaining != null && currentView !== 'learning_session' && (
                <TrialBanner
                  daysRemaining={user.trial_days_remaining}
                  onUpgradeClick={() => navigate(ROUTES.billing)}
                  onDismiss={() => setTrialBannerDismissed(true)}
                />
              )}
              {/* Guest banner — shown while browsing without an account */}
              {isGuest && !user && currentView !== 'learning_session' && (
                <div className="mb-3 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2.5 text-sm flex items-center justify-between gap-3">
                  <span className="text-indigo-800 dark:text-indigo-200">
                    <span className="font-semibold">Guest mode</span> — {guestDaysRemaining} day{guestDaysRemaining !== 1 ? 's' : ''} left in your free trial.
                  </span>
                  <button
                    onClick={() => { exitGuestMode(); navigate('/', { replace: true }); }}
                    className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    Sign up free
                  </button>
                </div>
              )}
              {/* SW update banner — kept as it requires user action */}
              {updateToastVisible && (
                <div className="mb-3 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 text-xs font-medium text-emerald-900 dark:text-emerald-100 flex items-center justify-between gap-3">
                  <span>A new version of EduReach is ready.</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        if (updateCountdownRef.current) clearTimeout(updateCountdownRef.current);
                        setUpdateToastVisible(false);
                        handleRefreshToUpdate();
                      }}
                      className="rounded bg-emerald-600 text-white px-2.5 py-1 hover:bg-emerald-700 font-semibold"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={() => {
                        if (updateCountdownRef.current) clearTimeout(updateCountdownRef.current);
                        setUpdateToastVisible(false);
                      }}
                      className="text-emerald-700 dark:text-emerald-300 hover:underline"
                    >
                      Later
                    </button>
                  </div>
                </div>
              )}
              {currentView !== 'learning_session' && (
                <div className="mb-4 flex items-center justify-end gap-3">
                  {/* Notification bell — desktop only (mobile header has its own) */}
                  <div className="relative hidden lg:block" data-notif-panel="1">
                    <button
                      onClick={() => setNotifOpen(prev => !prev)}
                      aria-label="Notifications"
                      className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {notifications.filter(n => !readNotifIds.has(n.id)).length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                          {notifications.filter(n => !readNotifIds.has(n.id)).length > 9 ? '9+' : notifications.filter(n => !readNotifIds.has(n.id)).length}
                        </span>
                      )}
                    </button>
                    {notifOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                          <span className="font-bold text-slate-800 dark:text-slate-100">Notifications</span>
                          {notifications.some(n => !readNotifIds.has(n.id)) && (
                            <button
                              onClick={() => {
                                notificationService.markAllRead().catch(() => {});
                                setReadNotifIds(new Set(notifications.map(n => n.id)));
                              }}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No notifications yet</p>
                          ) : (
                            notifications.map(n => {
                              const isRead = readNotifIds.has(n.id);
                              return (
                                <div
                                  key={n.id}
                                  className={`px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-opacity ${isRead ? 'opacity-50' : ''}`}
                                  onClick={() => {
                                    if (!isRead) {
                                      notificationService.markRead(n.id).catch(() => {});
                                      setReadNotifIds(prev => new Set([...prev, n.id]));
                                    }
                                    if (n.notif_type === 'missing_transcript') {
                                      setView('courses');
                                    } else if (n.assessment_id) {
                                      const path = n.share_token
                                        ? `/assessments/${n.assessment_id}?share_token=${n.share_token}`
                                        : `/assessments/${n.assessment_id}`;
                                      navigate(path);
                                    }
                                    setNotifOpen(false);
                                  }}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                      {n.notif_type === 'missing_transcript' ? '📋 ' : ''}{n.title}
                                    </p>
                                    {!isRead && <span className="mt-1 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                                  {n.notif_type === 'missing_transcript' && (
                                    <span className="inline-block mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">Tap to go to Courses →</span>
                                  )}
                                  {n.notif_type !== 'missing_transcript' && n.assessment_id && (
                                    <span className="inline-block mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">Tap to open challenge →</span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={toggleDark}
                    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="hidden lg:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    {isDark ? (
                      <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>Light mode</>
                    ) : (
                      <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>Dark mode</>
                    )}
                  </button>
                  {isOffline && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-amber-50 border-amber-200 text-amber-700">
                      Offline
                    </span>
                  )}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    aiStatus === 'up'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : aiStatus === 'down'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    AI: {aiStatus === 'up' ? 'Online' : aiStatus === 'down' ? 'Offline' : 'Checking'}
                  </span>
                </div>
              )}
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="inline-block w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">Loading…</p>
                    </div>
                  </div>
                }>
                  {renderContent()}
                </Suspense>
              </ErrorBoundary>
           </main>
        </div>
      </div>
      {/* Floating AI assistant — on learn page it toggles the inline AI panel instead of opening a popup */}
      <FloatingAIAssistant
        currentView={currentView}
        username={user?.username}
        onToggleLearningAI={() => setLearningAIOpen(prev => !prev)}
        isLearningAIPanelOpen={learningAIOpen}
        onNavigate={(view, params) => setView(view as any, params as any)}
      />
      {/* Guest restricted-action modal */}
      {guestModal && (
        <GuestSignUpModal
          reason="restricted"
          action={guestModal.action}
          onSignUp={() => { setGuestModal(null); exitGuestMode(); navigate('/', { replace: true }); }}
          onLogin={() => { setGuestModal(null); exitGuestMode(); navigate('/', { replace: true }); }}
          onDismiss={() => setGuestModal(null)}
        />
      )}
      {/* Post-auth onboarding: new users who haven't filled in their profile yet */}
      {showPostAuthOnboarding && user && (
        <PostAuthOnboardingModal
          initialFirstName={user.first_name || ''}
          initialLastName={user.last_name || ''}
          refreshUser={refreshUser}
          onComplete={() => setShowPostAuthOnboarding(false)}
        />
      )}
      {/* Onboarding for logged-in users who haven't completed it (3-slide, no CTA) */}
      {showOnboarding && user && !showPostAuthOnboarding && (
        <OnboardingModal
          mode="returning"
          onComplete={() => setShowOnboarding(false)}
        />
      )}
      {/* Daily reminder — shown once per day to active guest users */}
      {shouldShowReminder && !user && !guestModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Top accent */}
            <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-0.5">
                    Day {14 - guestDaysRemaining + 1} of 14
                  </p>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {guestDaysRemaining <= 3
                      ? `Only ${guestDaysRemaining} day${guestDaysRemaining !== 1 ? 's' : ''} left on your free trial`
                      : 'Save your progress before it\'s gone'}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
                You're exploring EduReach without an account. Create a free account to save your results, track your progress, and keep access beyond your trial.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => { dismissReminder(); exitGuestMode(); navigate('/', { replace: true }); }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                >
                  Create free account
                </button>
                <button
                  onClick={dismissReminder}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Continue without account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
    );
  };

export default AppContent;

// const AppContent: React.FC = () => {
//     const { user, isLoading, isAuthenticated, logout } = useAuth();
//     const queryClient = useQueryClient();

//     // API hooks
//     const { data: apiCourses, isLoading: coursesLoading } = useCourses();
//     const { data: apiAssessments, isLoading: assessmentsLoading } = useAssessments();
//     const { data: apiPosts, isLoading: postsLoading } = usePosts();

//     const createCourseMutation = useCreateCourse();
//     const createAssessmentMutation = useCreateAssessment();
//     const createPostMutation = useCreatePost();
//     const toggleLikeMutation = useToggleLike();
//     const addCommentMutation = useAddComment();
//     const deletePostMutation = useDeletePost();

//     const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
//     const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//     const [currentView, setCurrentView] = useState<View>('dashboard');
//     const [sessionData, setSessionData] = useState<SessionData | null>(null);
//     const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
//     const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
//     const [pendingUpgradeTier, setPendingUpgradeTier] = useState<'learner' | 'pro' | 'pro_plus' | null>(null);

//     // Local state for user-created items (fallbacks when API is unavailable)
//     const [localAssessments, setLocalAssessments] = useState<typeof initialAssessments>([]);
//     const [localCommunityPosts, setLocalCommunityPosts] = useState<typeof initialPosts>([]);

//     // Admin view mode - allows admin to see site as different tiers
//     const [adminViewMode, setAdminViewMode] = useState<UserTier | null>(null);
    
//     // Get effective user tier (admin view mode or actual user tier)
//     const effectiveUserTier = user?.tier === 'admin' && adminViewMode ? adminViewMode : (user?.tier || 'free');
//     const isActualAdmin = user?.tier === 'admin';

//     // Single-course query for detail view
//     const selectedCourseQuery = useCourse(selectedCourseId ?? 0);

//     // Combine mock data with API data and local fallbacks
//     // Ensure API data is an array before spreading
//     const apiCoursesArray = Array.isArray(apiCourses) ? apiCourses : [];
//     const apiAssessmentsArray = Array.isArray(apiAssessments) ? apiAssessments : [];
//     const apiPostsArray = Array.isArray(apiPosts) ? apiPosts : [];

//     const courseMap = new Map<number, Course>();
//     [...initialCourses, ...apiCoursesArray].forEach((course) => {
//         if (course && typeof course.id === 'number') {
//             courseMap.set(course.id, course);
//         }
//     });
//     const courses = Array.from(courseMap.values());
//     const assessments = [...initialAssessments, ...apiAssessmentsArray, ...localAssessments];
//     const communityPosts = [...initialPosts, ...apiPostsArray, ...localCommunityPosts];
    
//     // Tier Limits
//     const TIER_LIMITS = {
//         free: { courses: 1, lessonsPerCourse: 5, assessments: 5 },
//         learner: { courses: 5, lessonsPerCourse: 25, assessments: 50 },
//         pro: { courses: Infinity, lessonsPerCourse: Infinity, assessments: Infinity },
//         pro_plus: { courses: Infinity, lessonsPerCourse: Infinity, assessments: Infinity },
//         admin: { courses: Infinity, lessonsPerCourse: Infinity, assessments: Infinity },
//     };
//     const limits = TIER_LIMITS[effectiveUserTier];
    
//     // Mock tier usage data (in real app, this would come from API)
//     const mockTierUsage = {
//         assessments_used: effectiveUserTier === 'free' ? 1 : effectiveUserTier === 'learner' ? 3 : 12,
//         assessments_limit: limits.assessments,
//         resets_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
//     };

//     const invalidateCourseQueries = async (courseId?: number) => {
//         const promises = [
//             queryClient.invalidateQueries({ queryKey: COURSE_KEYS.lists() }),
//             queryClient.invalidateQueries({ queryKey: COURSE_KEYS.my() }),
//         ];
//         if (courseId) {
//             promises.push(queryClient.invalidateQueries({ queryKey: COURSE_KEYS.detail(courseId) }));
//         }
//         await Promise.all(promises);
//     };

//     const handleAddLessonToCourse = async (courseId: number, lessonInput: NewLessonInput) => {
//         try {
//             await courseService.addLessonToCourse(courseId, {
//                 title: lessonInput.title,
//                 video_id: lessonInput.videoId,
//                 transcript: lessonInput.transcript ?? '',
//                 duration: lessonInput.duration ?? 'N/A',
//             });
//             await invalidateCourseQueries(courseId);
//         } catch (error) {
//             console.error('Failed to add lesson to course', error);
//             throw error;
//         }
//     };

//     const ensurePersonalCourseOnServer = async () => {
//         const result = await courseService.ensurePersonalCourse();
//         await invalidateCourseQueries(result.course.id);
//         return result.course;
//     };

//     if (isLoading) {
//         return (
//             <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800">
//                 <div className="text-center">
//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//                     <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
//                 </div>
//             </div>
//         );
//     }

//     if (!isAuthenticated) {
//         return <LoginScreen />;
//     }

//     const handleLogout = async () => {
//         await logout();
//         setCurrentView('dashboard');
//         setSessionData(null);
//     };

//     const handleTierChange = async (newTier: UserTier) => {
//         // Admin users can switch view mode to see site as different tiers
//         if (isActualAdmin) {
//             setAdminViewMode(newTier === 'admin' ? null : newTier);
//         } else {
//             // Regular users can upgrade their actual tier
//             try {
//                 await authService.upgradeTier(newTier);
//                 window.location.reload();
//             } catch (error) {
//                 console.error('Failed to upgrade tier:', error);
//                 alert('Failed to upgrade tier. Please try again.');
//             }
//         }
//     };
    
//     const handlePlanSelected = async (newTier: 'learner' | 'pro' | 'pro_plus') => {
//         setPendingUpgradeTier(newTier);
//         setCurrentView('billing');
//     };
    
//     const handleCourseCreated = async (newCourse: Omit<typeof courses[0], 'id' | 'progress'>) => {
//         try {
//             await createCourseMutation.mutateAsync({
//                 title: newCourse.title,
//                 description: newCourse.description,
//                 isPublic: newCourse.isPublic,
//                 lessons: newCourse.lessons.map(lesson => ({
//                     title: lesson.title,
//                     videoId: lesson.videoId,
//                     transcript: '',
//                     isCompleted: lesson.isCompleted,
//                     duration: lesson.duration,
//                     order: 0
//                 }))
//             });
//             setView('courses');
//         } catch (error) {
//             console.error('Failed to create course:', error);
//             setView('courses');
//         }
//     };
    
//     const handleExamCreated = async (newExam: Omit<typeof assessments[0], 'id' | 'status' | 'score'>) => {
//         try {
//             await createAssessmentMutation.mutateAsync({
//                 title: newExam.title,
//                 description: newExam.description,
//                 topic: newExam.topic,
//                 questions: [], // Will be populated from the quiz generation
//                 time_limit: newExam.time
//             });
//             setView('assessments');
//         } catch (error) {
//             console.error('Failed to create assessment:', error);
//             // Fallback to mock data
//             setLocalAssessments(prev => [...prev, { ...newExam, id: Date.now(), status: 'pending', score: '' }]);
//             setView('assessments');
//         }
//     };

//     const handlePostCreated = async (content: string) => {
//         try {
//             await createPostMutation.mutateAsync({ content });
//         } catch (error) {
//             console.error('Failed to create post:', error);
//             // Fallback to mock data
//             const newPost = {
//                 id: Date.now(),
//                 author: user?.username || 'Guest User',
//                 avatar: UserCircleIcon,
//                 time: 'Just now',
//                 content,
//                 likes: 0,
//                 comments: [],
//                 liked: false,
//             };
//             setLocalCommunityPosts(prev => [newPost, ...prev]);
//         }
//     };
    
//     const handleToggleLike = async (postId: number) => {
//         try {
//             await toggleLikeMutation.mutateAsync(postId);
//         } catch (error) {
//             console.error('Failed to toggle like:', error);
//             // Fallback to local state
//             setLocalCommunityPosts(posts => posts.map(p => {
//                 if (p.id === postId) {
//                     return { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 };
//                 }
//                 return p;
//             }));
//         }
//     };

//     const handleAddComment = async (postId: number, comment: string) => {
//         try {
//             await addCommentMutation.mutateAsync({ postId, data: { content: comment } });
//         } catch (error) {
//             console.error('Failed to add comment:', error);
//             // Fallback to local state
//             setLocalCommunityPosts(posts => posts.map(p => {
//                 if (p.id === postId) {
//                     const newComment = { author: user?.username || 'Guest User', content: comment };
//                     return { ...p, comments: [...p.comments, newComment]};
//                 }
//                 return p;
//             }));
//         }
//     };

//     const handleDeletePost = async (postId: number) => {
//         if (!isActualAdmin) return;
//         if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
//             try {
//                 await deletePostMutation.mutateAsync(postId);
//             } catch (error) {
//                 console.error('Failed to delete post:', error);
//                 // Fallback to local state
//                 setLocalCommunityPosts(posts => posts.filter(p => p.id !== postId));
//             }
//         }
//     };

//     const handleSessionCreated = async ({
//         videoId,
//         transcript,
//         title,
//         courseId = null,
//         lessonId,
//         attachToCourse = true,
//     }: SessionInitPayload) => {
//         const sessionTitle = title || 'Learning Session';
//         let resolvedCourseId = courseId;

//         if (attachToCourse) {
//             try {
//                 if (resolvedCourseId) {
//                     await handleAddLessonToCourse(resolvedCourseId, {
//                         title: sessionTitle,
//                         videoId,
//                         transcript,
//                     });
//                 } else {
//                     const personalCourse = await ensurePersonalCourseOnServer();
//                     resolvedCourseId = personalCourse.id;
//                     await handleAddLessonToCourse(resolvedCourseId, {
//                         title: sessionTitle,
//                         videoId,
//                         transcript,
//                     });
//                 }
//             } catch (error) {
//                 console.error('Failed to attach lesson to course', error);
//             }
//         }

//         setSessionData({
//             videoId,
//             transcript,
//             courseId: resolvedCourseId ?? undefined,
//             title: sessionTitle,
//             lessonId,
//         });
//         setCurrentView('learning_session');
//     };

//     const handleSelectCourse = (courseId: number) => {
//         setSelectedCourseId(courseId);
//         setCurrentView('course_detail');
//     };

//     const handleSelectExam = (examId: number) => {
//         setSelectedExamId(examId);
//         setCurrentView('exam_detail');
//     };

//     const navigateToCreateCourse = () => {
//         setCurrentView('create_course');
//     };

//     const renderContent = () => {
//         // Admin can access any view
        
//         switch (currentView) {
//             case 'admin_panel':
//                 return isActualAdmin ? <AdminDashboard stats={{ totalUsers: 1345, coursesCreated: 218, activeAssessments: 45 }} /> : <Dashboard onStartSession={() => setCurrentView('new_session')} onSelectCourse={handleSelectCourse} userTier={effectiveUserTier}/>;
//             case 'dashboard':
//                 return <Dashboard onStartSession={() => setCurrentView('new_session')} onSelectCourse={handleSelectCourse} userTier={effectiveUserTier} />;
//             case 'courses':
//                 // All users see all courses (public and their own)
//                 return <MyCoursesPage courses={courses} onSelectCourse={handleSelectCourse} onNewCourse={navigateToCreateCourse} userTier={effectiveUserTier} />;
//             case 'assessments':
//                 return <EnhancedAssessmentsPage assessments={assessments} onSelectExam={handleSelectExam} setView={setView} userTier={effectiveUserTier} tierUsage={mockTierUsage} />;
//             case 'community':
//                 return <CommunityPage posts={communityPosts} onPostCreated={handlePostCreated} onToggleLike={handleToggleLike} onAddComment={handleAddComment} userTier={effectiveUserTier} onDeletePost={handleDeletePost} />;
//             case 'study_groups':
//                 return <StudyGroupsPage />;
//             case 'new_session':
//                 return <SetupSession onSessionCreated={handleSessionCreated} courses={courses} />;
//             case 'create_course':
//                 return <CreateCoursePage onCourseCreated={handleCourseCreated} onCancel={() => setView('courses')} lessonLimit={999} setView={setView}/>;
//             case 'create_exam':
//                 return <EnhancedCreateExamPage onExamCreated={handleExamCreated} onCancel={() => setView('assessments')} userTier={effectiveUserTier} />;
//             case 'generate_ai_quiz':
//                 return <GenerateAIQuizPage onQuizCreated={handleExamCreated} onCancel={() => setView('assessments')} userTier={effectiveUserTier} />;
//             case 'pricing':
//                 return <PricingPage currentTier={effectiveUserTier} onSelectTier={handlePlanSelected} />;
//             case 'billing':
//                 return (
//                     <BillingPage
//                         requestedTier={pendingUpgradeTier}
//                         onSubscriptionActivated={() => {
//                             setPendingUpgradeTier(null);
//                             setCurrentView('dashboard');
//                         }}
//                     />
//                 );
//             case 'profile':
//                 return <UserProfilePage />;
//             case 'learning_session':
//                 if (sessionData) {
//                     const currentCourse = sessionData.courseId
//                         ? courses.find(c => c.id === sessionData.courseId)
//                         : undefined;
//                     const currentLesson = sessionData.lessonId && currentCourse
//                         ? currentCourse.lessons.find(l => l.id === sessionData.lessonId)
//                         : undefined;

//                     const handleUpdateLesson = async (cId: number, lId: number, updates: any) => {
//                         // For now, this is a placeholder - lessons are updated via backend
//                         // We'd need to add a lesson update endpoint call here
//                         await invalidateCourseQueries(cId);
//                     };

//                     const handleSaveAssessment = async (assessment: any) => {
//                         try {
//                             await createAssessmentMutation.mutateAsync(assessment);
//                         } catch (error) {
//                             console.error('Failed to save assessment:', error);
//                             setLocalAssessments(prev => [...prev, { ...assessment, id: Date.now() }]);
//                         }
//                     };

//                     return (
//                         <LearningSession
//                             videoId={sessionData.videoId}
//                             transcript={sessionData.transcript}
//                             courseId={sessionData.courseId || 0}
//                             currentLesson={currentLesson}
//                             onUpdateLesson={handleUpdateLesson}
//                             onSaveAssessment={handleSaveAssessment}
//                         />
//                     );
//                 }
//                 setCurrentView('new_session'); 
//                 return null;
//             case 'course_detail':
//                 if (!selectedCourseId) {
//                     setView('courses');
//                     return null;
//                 }

//                 if (selectedCourseQuery.isLoading) {
//                     return (
//                         <div className="flex items-center justify-center min-h-[400px]">
//                             <div className="text-center">
//                                 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
//                                 <p className="mt-4 text-gray-600 dark:text-gray-400">Loading course...</p>
//                             </div>
//                         </div>
//                     );
//                 }

//                 const mergedCourse = courses.find((c) => c.id === selectedCourseId) ?? selectedCourseQuery.data;

//                 if (!mergedCourse) {
//                     return (
//                         <div className="text-center">
//                             <h2 className="text-2xl font-bold">Course Not Found</h2>
//                             <button
//                                 onClick={() => setCurrentView('courses')}
//                                 className="mt-4 text-indigo-600 hover:underline"
//                             >
//                                 Return to Courses
//                             </button>
//                         </div>
//                     );
//                 }

//                 const handleUpdateCourse = async (courseId: number, updates: Partial<Course>) => {
//                     try {
//                         await courseService.updateCourse(courseId, updates);
//                         await invalidateCourseQueries(courseId);
//                     } catch (error) {
//                         console.error('Failed to update course:', error);
//                     }
//                 };

//                 return (
//                     <CourseDetailPage
//                         course={mergedCourse}
//                         setView={setView}
//                         onStartLesson={handleSessionCreated}
//                         onAddLesson={handleAddLessonToCourse}
//                         onUpdateCourse={handleUpdateCourse}
//                         userTier={effectiveUserTier}
//                         assessments={assessments}
//                         onSelectExam={handleSelectExam}
//                     />
//                 );
//             case 'exam_detail':
//                 if (selectedExamId) {
//                     const exam = assessments.find(e => e.id === selectedExamId);
//                     return <ExamDetailPage exam={exam!} setView={setView} />;
//                 }
//                 setView('assessments');
//                 return null;
//             default:
//                 return <Dashboard onStartSession={() => setCurrentView('new_session')} onSelectCourse={handleSelectCourse} userTier={effectiveUserTier} />;
//         }
//     };

//     return (
//         <div className="flex h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 text-gray-800 dark:text-gray-200">
//             <Sidebar 
//                 currentView={currentView}
//                 setView={setView}
//                 onLogout={handleLogout}
//                 onNewSession={() => {
//                     setCurrentView('new_session');
//                     setIsMobileMenuOpen(false);
//                 }}
//                 isCollapsed={isSidebarCollapsed}
//                 setIsCollapsed={setIsSidebarCollapsed}
//                 userTier={isActualAdmin ? 'admin' : effectiveUserTier}
//                 onTierChange={handleTierChange}
//                 isMobileOpen={isMobileMenuOpen}
//                 setIsMobileOpen={setIsMobileMenuOpen}
//             />
//             <main className="flex-1 overflow-y-auto lg:ml-0">
//                 {/* Mobile Header with Hamburger */}
//                 <div className="lg:hidden sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shadow-sm">
//                     <button
//                         onClick={() => setIsMobileMenuOpen(true)}
//                         className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400"
//                         aria-label="Open menu"
//                     >
//                         <MenuIcon className="w-6 h-6" />
//                     </button>
//                     <div className="flex items-center gap-2">
//                         <SparklesIcon className="w-6 h-6 text-blue-600" />
//                         <span className="text-lg font-bold text-gray-800 dark:text-white">EduReach</span>
//                     </div>
//                     <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-200 to-emerald-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
//                         <UserCircleIcon className="w-5 h-5 text-blue-700 dark:text-gray-300" />
//                     </div>
//                 </div>
                
//                 {/* Main Content */}
//                 <div className="p-4 sm:p-6 lg:p-8">
//                     <Suspense fallback={
//                         <div className="flex items-center justify-center min-h-[400px]">
//                             <div className="text-center">
//                                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
//                                 <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
//                             </div>
//                         </div>
//                     }>
//                         {renderContent()}
//                     </Suspense>
//                 </div>
//             </main>
//         </div>
//     );
// };


