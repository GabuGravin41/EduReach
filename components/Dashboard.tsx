import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../src/routes';
import { useQuery } from '@tanstack/react-query';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { PlayCircleIcon } from './icons/PlayCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { UserTier } from '../App';
import { AdminDashboard } from './AdminDashboard';
import { useCourses, useMyCourses } from '../src/hooks/useCourses';
import { useMyAssessments } from '../src/hooks/useAssessments';
import apiClient from '../src/services/api';
import { FeatureSpotlight } from './FeatureSpotlight';
import { getOnboardingPrefs, FIELD_LABELS } from '../src/hooks/useOnboardingPrefs';

interface DashboardProps {
  onStartSession: () => void;
  onSelectCourse: (courseId: number) => void;
  onGoToCreateExam?: () => void;
  userTier: UserTier;
  username?: string;
}

// ── Analytics types ────────────────────────────────────────────────────────
interface LearnerSummary {
  total_courses_enrolled: number;
  total_lessons_completed: number;
  total_assessments_taken: number;
  average_score: number;
  total_xp: number;
  current_level: number;
  streak_days: number;
}

interface RecentActivity {
  id: number;
  assessment_title: string;
  score_percentage: number;
  submitted_at: string | null;
  xp_earned: number;
}

interface TopicPerformance {
  topic: string;
  count: number;
  average_score: number;
}

interface LearnerAnalytics {
  summary: LearnerSummary;
  recent_activity: RecentActivity[];
  assessment_by_topic: TopicPerformance[];
  course_progress: {
    course_id: number;
    course_title: string;
    progress_percentage: number;
    completed_lessons: number;
    total_lessons: number;
    last_accessed: string | null;
  }[];
}

// ── Utility helpers ────────────────────────────────────────────────────────
const computeGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
};

/** Reactive greeting that refreshes every 60 s — works across midnight/noon boundaries. */
const useGreeting = (): string => {
  const [greeting, setGreeting] = useState(computeGreeting);
  useEffect(() => {
    const id = setInterval(() => setGreeting(computeGreeting()), 60_000);
    return () => clearInterval(id);
  }, []);
  return greeting;
};

/** Deterministic gradient from a string (hashes course title). */
const titleGradient = (title: string): string => {
  const palettes = [
    'from-violet-500 to-purple-700',
    'from-indigo-500 to-blue-700',
    'from-teal-500 to-emerald-700',
    'from-rose-500 to-pink-700',
    'from-amber-500 to-orange-700',
    'from-cyan-500 to-sky-700',
    'from-fuchsia-500 to-purple-700',
    'from-lime-500 to-green-700',
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0;
  return palettes[Math.abs(hash) % palettes.length];
};

const scoreColor = (pct: number): string => {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
};

const scoreTextColor = (pct: number): string => {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30';
  if (pct >= 60) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30';
  return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30';
};

const relativeTime = (isoStr: string | null): string => {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// ── Skeleton loaders ───────────────────────────────────────────────────────
const CourseSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden animate-pulse border border-slate-100 dark:border-slate-700">
    <div className="h-36 bg-slate-200 dark:bg-slate-700" />
    <div className="p-4 space-y-2.5">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
      <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-full" />
      <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
    </div>
  </div>
);

const StatSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 animate-pulse border border-slate-100 dark:border-slate-700">
    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-3" />
    <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
  </div>
);

// ── Sub-components ─────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string; // tailwind bg class for icon backdrop
  sub?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, accent, sub }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
    <div className={`p-3 rounded-xl ${accent} flex-shrink-0`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 truncate">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

/** Animated progress bar */
const ProgressBar: React.FC<{ pct: number }> = ({ pct }) => (
  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
    <div
      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
    />
  </div>
);

/** Enrolled course card with progress */
const EnrolledCourseCard: React.FC<{
  course: any;
  progressPct: number;
  lessonsDone: number;
  totalLessons: number;
  onSelect: (id: number) => void;
}> = ({ course, progressPct, lessonsDone, totalLessons, onSelect }) => {
  const grad = titleGradient(course.title ?? '');
  const done = progressPct >= 100;
  return (
    <div
      onClick={() => onSelect(course.id)}
      className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
    >
      {/* Thumbnail / gradient banner */}
      <div className={`h-36 bg-gradient-to-br ${grad} relative flex items-center justify-center`}>
        {course.thumbnail ? (
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <BookOpenIcon className="w-12 h-12 text-white/70 group-hover:scale-110 transition-transform" />
        )}
        {done && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircleIcon className="w-3 h-3" /> Done
          </div>
        )}
        <span className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
          {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <h3 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-2 leading-snug">
          {course.title}
        </h3>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
            <span>{lessonsDone}/{totalLessons} lessons</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{Math.round(progressPct)}%</span>
          </div>
          <ProgressBar pct={progressPct} />
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onSelect(course.id); }}
          className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${
            done
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
              : progressPct > 0
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-700'
          }`}
        >
          {done ? 'Review' : progressPct > 0 ? 'Continue' : 'Start'}
        </button>
      </div>
    </div>
  );
};

/** Public/discover course card */
const DiscoverCard: React.FC<{ course: any; onSelect: (id: number) => void }> = ({ course, onSelect }) => {
  const grad = titleGradient(course.title ?? '');
  return (
    <div
      onClick={() => onSelect(course.id)}
      className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
    >
      <div className={`h-32 bg-gradient-to-br ${grad} flex items-center justify-center`}>
        {course.thumbnail ? (
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <PlayCircleIcon className="w-10 h-10 text-white/70 group-hover:scale-110 transition-transform" />
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-2 leading-snug">
          {course.title}
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
          {course.description || 'No description.'}
        </p>
        {course.owner_username && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500">by {course.owner_username}</p>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(course.id); }}
          className="w-full mt-1 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white transition-colors"
        >
          Enroll
        </button>
      </div>
    </div>
  );
};

// ── Main Dashboard ─────────────────────────────────────────────────────────
export const Dashboard: React.FC<DashboardProps> = ({ onStartSession, onSelectCourse, onGoToCreateExam, userTier, username }) => {
  const navigate = useNavigate();
  const { data: apiCourses, isLoading: coursesLoading } = useCourses();
  const { data: myCourses, isLoading: myCoursesLoading } = useMyCourses();
  const { data: myAssessments, isLoading: assessmentsLoading } = useMyAssessments();

  // Analytics — graceful fallback on failure
  const analyticsQuery = useQuery<LearnerAnalytics>({
    queryKey: ['learner-analytics'],
    queryFn: async () => {
      const res = await apiClient.get('analytics/learner/');
      return res.data;
    },
    retry: 1,
    staleTime: 2 * 60 * 1000,
  });

  const analytics = analyticsQuery.data ?? null;
  const summary = analytics?.summary ?? null;
  const recentActivity = analytics?.recent_activity ?? [];
  const topicPerformance = useMemo(() => {
    if (!analytics?.assessment_by_topic?.length) return [];
    return [...analytics.assessment_by_topic]
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [analytics]);
  const courseProgressMap = useMemo(() => {
    const map = new Map<number, { pct: number; done: number; total: number; lastAccessed: string | null }>();
    if (analytics?.course_progress) {
      for (const cp of analytics.course_progress) {
        map.set(cp.course_id, {
          pct: cp.progress_percentage,
          done: cp.completed_lessons,
          total: cp.total_lessons,
          lastAccessed: cp.last_accessed,
        });
      }
    }
    return map;
  }, [analytics]);

  // Most recently accessed course for "Continue Learning" CTA
  const mostRecent = useMemo(() => {
    if (!analytics?.course_progress?.length) return null;
    return [...analytics.course_progress]
      .filter((cp) => cp.last_accessed)
      .sort((a, b) => new Date(b.last_accessed!).getTime() - new Date(a.last_accessed!).getTime())[0] ?? null;
  }, [analytics]);

  // Partition: enrolled vs discover
  const myCourseIds = new Set(Array.isArray(myCourses) ? myCourses.map((c: any) => c.id) : []);
  const publicCourses = Array.isArray(apiCourses)
    ? apiCourses
        .filter((c: any) => (c.is_public === true || c.isPublic === true) && !myCourseIds.has(c.id))
        .slice(0, 6)
    : [];

  // Personalised recommendations
  const recsQuery = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const res = await apiClient.get('recommendations/');
      return res.data as {
        assessments: any[];
        courses: any[];
        based_on: string[];
        is_personalised: boolean;
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const recs = recsQuery.data;

  // Lessons completed this week (naive from analytics, fallback to 0)
  const lessonsThisWeek = summary?.total_lessons_completed ?? 0;

  if (userTier === 'admin') {
    return <AdminDashboard stats={{ totalUsers: 1345, coursesCreated: 218, activeAssessments: 45 }} />;
  }

  const greeting = useGreeting();
  const displayName = username ? `, ${username}` : '';
  const streak = summary?.streak_days ?? 0;
  const xpToday = summary?.total_xp ?? 0;
  const enrolledCount = Array.isArray(myCourses) ? myCourses.length : 0;
  const assessmentsTaken = summary?.total_assessments_taken ?? 0;

  return (
    <div className="space-y-8">

      {/* ── Welcome hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white p-6 sm:p-8 shadow-lg">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 w-40 h-40 bg-white/5 rounded-full blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="space-y-1">
            <p className="text-white/70 text-sm font-medium uppercase tracking-widest">Dashboard</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {greeting}{displayName}! 👋
            </h1>
            <p className="text-white/75 text-sm sm:text-base max-w-md">
              {streak > 0
                ? `You're on a ${streak}-day streak — keep it up!`
                : 'Ready to learn something new today?'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 sm:flex-shrink-0">
            {mostRecent && (
              <button
                onClick={() => onSelectCourse(mostRecent.course_id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-bold hover:bg-indigo-50 transition-colors shadow-sm"
              >
                <PlayCircleIcon className="w-4 h-4" />
                Continue Learning
              </button>
            )}
            <button
              onClick={onStartSession}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-bold transition-colors border border-white/30"
            >
              <PlusCircleIcon className="w-4 h-4" />
              New Session
            </button>
          </div>
        </div>

        {/* ── Summary bar ── */}
        <div className="relative mt-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Day Streak', value: streak > 0 ? `${streak} 🔥` : '—', sub: 'consecutive days' },
            { label: 'Total XP', value: xpToday.toLocaleString(), sub: 'experience points' },
            { label: 'Lessons Done', value: lessonsThisWeek, sub: 'total completed' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
              <p className="text-lg sm:text-2xl font-extrabold">{value}</p>
              <p className="text-[10px] sm:text-xs text-white/70 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────── */}
      {analyticsQuery.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Courses Enrolled"
            value={enrolledCount}
            icon={<BookOpenIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            accent="bg-indigo-50 dark:bg-indigo-900/30"
          />
          <StatCard
            label="Assessments Taken"
            value={assessmentsTaken}
            icon={<ClipboardCheckIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
            accent="bg-violet-50 dark:bg-violet-900/30"
          />
          <StatCard
            label="Average Score"
            value={summary ? `${summary.average_score}%` : '—'}
            icon={<TrophyIcon className="w-5 h-5 text-amber-500" />}
            accent="bg-amber-50 dark:bg-amber-900/30"
            sub={summary?.average_score ? (summary.average_score >= 80 ? 'Great work!' : 'Keep practising') : undefined}
          />
          <StatCard
            label="Current Level"
            value={summary ? `Lvl ${summary.current_level}` : '—'}
            icon={<SparklesIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
            accent="bg-teal-50 dark:bg-teal-900/30"
            sub={summary ? `${summary.total_xp.toLocaleString()} XP total` : undefined}
          />
        </div>
      )}

      {/* ── Feature Spotlight ────────────────────────────────────────── */}
      <FeatureSpotlight
        onGoToAssessments={() => navigate(ROUTES.assessments)}
        onGoToSession={onStartSession}
        onGoToCreateExam={onGoToCreateExam ?? (() => navigate(ROUTES.createExam))}
      />

      {/* ── My Courses + Activity ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* My Courses — 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">My Courses</h2>
            {enrolledCount > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{enrolledCount} enrolled</span>
            )}
          </div>

          {myCoursesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CourseSkeleton /><CourseSkeleton />
            </div>
          ) : !Array.isArray(myCourses) || myCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-slate-700 text-center px-6">
              <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-900/30 mb-4">
                <BookOpenIcon className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Start your first course</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-xs">
                Explore the courses below and hit <strong>Enroll</strong> to begin learning.
              </p>
              <button
                onClick={() => navigate(ROUTES.courses)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
              >
                Browse Courses
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myCourses.map((course: any) => {
                const cp = courseProgressMap.get(course.id);
                const pct = cp?.pct ?? course.progress ?? 0;
                const done = cp?.done ?? 0;
                const total = cp?.total ?? course.lessons?.length ?? course.lesson_count ?? 0;
                return (
                  <EnrolledCourseCard
                    key={course.id}
                    course={course}
                    progressPct={pct}
                    lessonsDone={done}
                    totalLessons={total}
                    onSelect={onSelectCourse}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel: activity + next steps */}
        <div className="space-y-5">

          {/* Recent Assessments */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Recent Assessments</h3>
              <ClipboardCheckIcon className="w-4 h-4 text-slate-400" />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {assessmentsLoading || analyticsQuery.isLoading ? (
                <div className="p-5 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="flex flex-col items-center py-10 px-4 text-center">
                  <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-900/20 mb-3">
                    <ClipboardCheckIcon className="w-6 h-6 text-amber-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">No quizzes yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Take your first quiz to see your results here.</p>
                </div>
              ) : (
                <>
                  {recentActivity.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-extrabold ${scoreTextColor(a.score_percentage)}`}>
                        {Math.round(a.score_percentage)}%
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{a.assessment_title}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {a.xp_earned > 0 && <span className="text-amber-500 font-medium">+{a.xp_earned} XP · </span>}
                        {relativeTime(a.submitted_at)}
                      </p>
                    </div>
                    <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${scoreColor(a.score_percentage)}`} />
                  </div>
                  ))}
                  {/* Usage-triggered upgrade nudge — shown after ≥3 assessments on free tier */}
                  {userTier === 'free' && assessmentsTaken >= 3 && (
                    <div className="mx-5 mb-3 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-200 dark:border-indigo-700 p-3 flex items-start gap-3">
                      <SparklesIcon className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">You're on a roll!</p>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">Upgrade to Learner for unlimited assessments, AI tutoring & more.</p>
                      </div>
                      <button
                        onClick={() => navigate(ROUTES.billing)}
                        className="flex-shrink-0 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-2.5 py-1.5 transition-colors"
                      >
                        Upgrade
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Suggested next steps */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-indigo-500" />
              Suggested Next Steps
            </h3>
            <ul className="space-y-2.5">
              {mostRecent && (
                <li>
                  <button
                    onClick={() => onSelectCourse(mostRecent.course_id)}
                    className="w-full text-left flex items-start gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    <PlayCircleIcon className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 truncate">
                        Continue: {mostRecent.course_title}
                      </p>
                      <p className="text-[10px] text-indigo-500 dark:text-indigo-400">
                        {Math.round(mostRecent.progress_percentage)}% complete
                      </p>
                    </div>
                  </button>
                </li>
              )}
              {(summary?.total_assessments_taken ?? 0) === 0 && (
                <li className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-start gap-3">
                  <ClipboardCheckIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Take your first quiz</p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">Test your knowledge and earn XP</p>
                  </div>
                </li>
              )}
              {streak === 0 && (
                <li className="p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-start gap-3">
                  <ClockIcon className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">Build a daily streak</p>
                    <p className="text-[10px] text-teal-600 dark:text-teal-400">Study every day to unlock streak bonuses</p>
                  </div>
                </li>
              )}
              {enrolledCount === 0 && publicCourses.length > 0 && (
                <li className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-start gap-3">
                  <BookOpenIcon className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">Enroll in a course below</p>
                    <p className="text-[10px] text-violet-600 dark:text-violet-400">{publicCourses.length} courses available</p>
                  </div>
                </li>
              )}
            </ul>
          </div>

          {/* Subject Mastery */}
          {topicPerformance.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Subject Mastery</h3>
                <TrophyIcon className="w-4 h-4 text-amber-400" />
              </div>
              <div className="px-5 py-4 space-y-3">
                {topicPerformance.map((t) => (
                  <div key={t.topic}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[65%]">{t.topic}</span>
                      <span className={`text-xs font-bold ${
                        t.average_score >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                        : t.average_score >= 60 ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'
                      }`}>{Math.round(t.average_score)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          t.average_score >= 80 ? 'bg-emerald-500'
                          : t.average_score >= 60 ? 'bg-amber-500'
                          : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, t.average_score)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{t.count} attempt{t.count !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recommended for You ──────────────────────────────────────── */}
      {(recs?.assessments?.length ?? 0) > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {recs!.is_personalised ? 'Recommended for You' : 'Popular Assessments'}
              </h2>
              {recs!.is_personalised && recs!.based_on.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Based on: {recs!.based_on.slice(0, 4).join(', ')}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recs!.assessments.slice(0, 4).map((a: any) => (
              <div
                key={a.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/assessments/${a.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    a.assessment_type === 'quiz'
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                  }`}>
                    {a.assessment_type?.toUpperCase()}
                  </span>
                  {a.institution && (
                    <span className="text-[9px] text-slate-400 truncate max-w-[80px]">{a.institution}</span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">{a.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed">{a.description || a.topic}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-2">
                  <span>{a.question_count} questions</span>
                  <span>{a.time_limit_minutes} min</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Study Areas ───────────────────────────────────────────────── */}
      <StudyAreasWidget onGoToAssessments={() => navigate(ROUTES.assessments)} />

      {/* ── Discover Courses ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Discover Courses</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Public courses you haven't enrolled in yet</p>
          </div>
        </div>

        {coursesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <CourseSkeleton /><CourseSkeleton /><CourseSkeleton />
          </div>
        ) : publicCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center px-6">
            <div className="p-4 rounded-full bg-emerald-50 dark:bg-emerald-900/30 mb-4">
              <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">All caught up!</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
              You've enrolled in all available public courses. Check back soon for new content.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicCourses.map((course: any) => (
              <DiscoverCard key={course.id} course={course} onSelect={onSelectCourse} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── StudyAreasWidget ────────────────────────────────────────────────────────
const ALL_STUDY_AREAS = Object.entries(FIELD_LABELS).filter(([k]) => k !== 'other');

const StudyAreasWidget: React.FC<{ onGoToAssessments: () => void }> = ({ onGoToAssessments }) => {
  const prefs = getOnboardingPrefs();
  const userFields = prefs?.fields ?? [];
  const hasPrefs = userFields.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {hasPrefs ? 'Your Study Areas' : 'Study Areas — EduReach is for every field'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {hasPrefs
              ? `Showing content for ${userFields.map(f => FIELD_LABELS[f]?.label ?? f).join(', ')} — explore everything below`
              : 'Practice exams, quizzes, and AI tutoring for all disciplines'}
          </p>
        </div>
        <button
          onClick={onGoToAssessments}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0"
        >
          Browse all →
        </button>
      </div>

      {/* User's chosen fields — highlighted */}
      {hasPrefs && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {userFields.map(key => {
            const info = FIELD_LABELS[key];
            if (!info) return null;
            return (
              <button
                key={key}
                onClick={onGoToAssessments}
                className={`rounded-2xl border-2 p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${info.color}`}
              >
                <div className="text-2xl mb-2">{info.emoji}</div>
                <div className="text-sm font-bold leading-tight">{info.label}</div>
                <div className="text-xs opacity-70 mt-1">Exams & quizzes →</div>
              </button>
            );
          })}
        </div>
      )}

      {/* All other fields — compact grid */}
      <div className={`grid gap-2 ${hasPrefs ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
        {ALL_STUDY_AREAS
          .filter(([key]) => !userFields.includes(key))
          .map(([key, info]) => (
            <button
              key={key}
              onClick={onGoToAssessments}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-left text-xs hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all flex items-center gap-2"
            >
              <span className="text-base leading-none flex-shrink-0">{info.emoji}</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium leading-tight">{info.label}</span>
            </button>
          ))}
      </div>

      {/* "Don't see your field?" notice */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-200 dark:border-indigo-700/50 px-4 py-3 flex items-start gap-3">
        <span className="text-lg flex-shrink-0">🤖</span>
        <div className="text-sm">
          <span className="font-semibold text-indigo-800 dark:text-indigo-200">Don't see your exact subject?</span>
          <span className="text-indigo-700 dark:text-indigo-300"> The AI tutor works for any topic — start a learning session with any YouTube video in your field.</span>
          {' '}
          <button
            onClick={onGoToAssessments}
            className="text-indigo-600 dark:text-indigo-400 font-semibold underline text-xs"
          >
            Explore content →
          </button>
        </div>
      </div>
    </div>
  );
};
