import React, { useState, useEffect, useCallback } from 'react';
import { UserTier } from '../App';
import apiClient from '../src/services/api';
import { BarChart } from './charts/BarChart';
import { LineChart } from './charts/LineChart';
import { DonutChart } from './charts/DonutChart';
import { ActivityCalendar } from './charts/ActivityCalendar';
import { StatCard } from './charts/StatCard';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  userTier: UserTier;
  currentUserId?: number;
}

// Learner analytics payload
interface LearnerData {
  total_xp: number;
  avg_score: number;
  lessons_done: number;
  streak_days: number;
  xp_over_weeks: { label: string; value: number }[];
  xp_by_category: { label: string; value: number; color: string }[];
  score_by_topic: { label: string; value: number }[];
  activity_calendar: { date: string; count: number }[];
  course_progress: { title: string; progress: number; color?: string }[];
  xp_trend?: number;
  score_trend?: number;
  lessons_trend?: number;
}

// Instructor analytics payload
interface InstructorData {
  total_students: number;
  avg_completion: number;
  total_revenue: number;
  assessments_created: number;
  assessment_avg_scores: { label: string; value: number }[];
  score_distribution: { label: string; value: number; color: string }[];
  course_stats: {
    title: string;
    enrollments: number;
    completion_rate: number;
    revenue: number;
  }[];
  top_learners: { name: string; score: number; xp: number }[];
  students_trend?: number;
  revenue_trend?: number;
}

// Admin analytics payload
interface AdminData {
  total_users: number;
  total_courses: number;
  total_assessments: number;
  monthly_revenue: number;
  new_users_per_week: { label: string; value: number }[];
  tier_distribution: { label: string; value: number; color: string }[];
  weekly_attempts: { label: string; value: number }[];
  users_trend?: number;
  revenue_trend?: number;
}

type TabId = 'learning' | 'instructor' | 'platform';

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton helpers
// ─────────────────────────────────────────────────────────────────────────────

const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse ${className}`} />
);

const SkeletonStatCards: React.FC = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <SkeletonBox key={i} className="h-28" />
    ))}
  </div>
);

const SkeletonChart: React.FC<{ height?: string }> = ({ height = 'h-56' }) => (
  <SkeletonBox className={`w-full ${height}`} />
);

// ─────────────────────────────────────────────────────────────────────────────
// Card wrapper
// ─────────────────────────────────────────────────────────────────────────────

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 ${className}`}
  >
    {children}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{children}</h3>
);

// ─────────────────────────────────────────────────────────────────────────────
// SVG Icon helpers
// ─────────────────────────────────────────────────────────────────────────────

const Icon: React.FC<{ path: string; className?: string }> = ({ path, className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);

const ICONS = {
  xp: 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z',
  score: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  lessons: 'M12 6.25278V19.2528M12 6.25278C10.8321 5.47686 9.24649 5 7.5 5C5.75351 5 4.16789 5.47686 3 6.25278V19.2528C4.16789 18.4769 5.75351 18 7.5 18C9.24649 18 10.8321 18.4769 12 19.2528M12 6.25278C13.1679 5.47686 14.7535 5 16.5 5C18.2465 5 19.8321 5.47686 21 6.25278V19.2528C19.8321 18.4769 18.2465 18 16.5 18C14.7535 18 13.1679 18.4769 12 19.2528',
  streak: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  students: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 1 8 0 4 4 0 0 1-8 0z',
  revenue: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  completion: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3',
  assessments: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 1 8 0 4 4 0 0 1-8 0z',
  courses: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
};

// ─────────────────────────────────────────────────────────────────────────────
// Progress bar row
// ─────────────────────────────────────────────────────────────────────────────

const ProgressRow: React.FC<{ title: string; progress: number; color?: string }> = ({
  title,
  progress,
  color = '#3b82f6',
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[70%]">{title}</span>
      <span className="text-slate-500 dark:text-slate-400 font-semibold ml-2">{Math.round(progress)}%</span>
    </div>
    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Tabs component
// ─────────────────────────────────────────────────────────────────────────────

interface Tab {
  id: TabId;
  label: string;
}

const TabBar: React.FC<{
  tabs: Tab[];
  active: TabId;
  onChange: (id: TabId) => void;
}> = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl p-1 w-fit">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          active === tab.id
            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 gap-2">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 opacity-40">
      <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <p className="text-sm">{message}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Error state
// ─────────────────────────────────────────────────────────────────────────────

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4">
    <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7 text-rose-500">
        <circle cx={12} cy={12} r={10} />
        <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
      </svg>
    </div>
    <div className="text-center">
      <p className="text-slate-700 dark:text-slate-200 font-semibold">Could not load analytics</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{message}</p>
    </div>
    <button
      type="button"
      onClick={onRetry}
      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
    >
      Try again
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Tab panels
// ─────────────────────────────────────────────────────────────────────────────

const MyLearningTab: React.FC<{ data: LearnerData }> = ({ data }) => (
  <div className="space-y-6">
    {/* Row 1: Stat cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total XP"
        value={data.total_xp.toLocaleString()}
        subtitle="Experience points earned"
        trend={data.xp_trend}
        color="blue"
        icon={<Icon path={ICONS.xp} />}
      />
      <StatCard
        title="Avg Score"
        value={`${data.avg_score}%`}
        subtitle="Across all assessments"
        trend={data.score_trend}
        color="emerald"
        icon={<Icon path={ICONS.score} />}
      />
      <StatCard
        title="Lessons Done"
        value={data.lessons_done}
        subtitle="Lessons completed"
        trend={data.lessons_trend}
        color="purple"
        icon={<Icon path={ICONS.lessons} />}
      />
      <StatCard
        title="Streak Days"
        value={data.streak_days}
        subtitle="Current learning streak"
        color="amber"
        icon={<Icon path={ICONS.streak} />}
      />
    </div>

    {/* Row 2: XP over time + XP by category */}
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-3">
        <SectionTitle>XP Over the Last 12 Weeks</SectionTitle>
        {data.xp_over_weeks.length > 0 ? (
          <LineChart data={data.xp_over_weeks} color="#3b82f6" unit=" XP" fill={true} height={220} />
        ) : (
          <EmptyState message="No XP data yet. Start learning!" />
        )}
      </Card>
      <Card className="lg:col-span-2 flex flex-col items-center justify-center">
        <SectionTitle>XP by Category</SectionTitle>
        {data.xp_by_category.length > 0 ? (
          <DonutChart
            data={data.xp_by_category}
            size={190}
            centerLabel="Total XP"
            centerValue={data.total_xp.toLocaleString()}
          />
        ) : (
          <EmptyState message="No category data yet." />
        )}
      </Card>
    </div>

    {/* Row 3: Score by topic */}
    <Card>
      <SectionTitle>Average Score by Topic</SectionTitle>
      {data.score_by_topic.length > 0 ? (
        <BarChart data={data.score_by_topic} color="#10b981" unit="%" height={220} />
      ) : (
        <EmptyState message="No assessment scores yet." />
      )}
    </Card>

    {/* Row 4: Activity calendar */}
    <Card>
      <SectionTitle>Learning Activity — Last 90 Days</SectionTitle>
      <ActivityCalendar data={data.activity_calendar} />
    </Card>

    {/* Row 5: Course progress */}
    <Card>
      <SectionTitle>Course Progress</SectionTitle>
      {data.course_progress.length > 0 ? (
        <div className="space-y-4">
          {data.course_progress.map((c, i) => (
            <ProgressRow key={i} title={c.title} progress={c.progress} color={c.color} />
          ))}
        </div>
      ) : (
        <EmptyState message="You haven't enrolled in any courses yet." />
      )}
    </Card>
  </div>
);

const InstructorTab: React.FC<{ data: InstructorData }> = ({ data }) => (
  <div className="space-y-6">
    {/* Row 1: Stat cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Students"
        value={data.total_students.toLocaleString()}
        subtitle="Enrolled across all courses"
        trend={data.students_trend}
        color="blue"
        icon={<Icon path={ICONS.students} />}
      />
      <StatCard
        title="Avg Completion"
        value={`${data.avg_completion}%`}
        subtitle="Average course completion rate"
        color="emerald"
        icon={<Icon path={ICONS.completion} />}
      />
      <StatCard
        title="Total Revenue"
        value={`$${data.total_revenue.toLocaleString()}`}
        subtitle="All-time earnings"
        trend={data.revenue_trend}
        color="amber"
        icon={<Icon path={ICONS.revenue} />}
      />
      <StatCard
        title="Assessments"
        value={data.assessments_created}
        subtitle="Assessments created"
        color="purple"
        icon={<Icon path={ICONS.assessments} />}
      />
    </div>

    {/* Row 2: Bar + Donut */}
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-3">
        <SectionTitle>Assessment Average Scores</SectionTitle>
        {data.assessment_avg_scores.length > 0 ? (
          <BarChart data={data.assessment_avg_scores} color="#8b5cf6" unit="%" height={220} />
        ) : (
          <EmptyState message="No assessment data yet." />
        )}
      </Card>
      <Card className="lg:col-span-2 flex flex-col items-center justify-center">
        <SectionTitle>Score Distribution</SectionTitle>
        {data.score_distribution.length > 0 ? (
          <DonutChart
            data={data.score_distribution}
            size={190}
            centerLabel="Students"
            centerValue={data.total_students}
          />
        ) : (
          <EmptyState message="No score data yet." />
        )}
      </Card>
    </div>

    {/* Row 3: Course stats table */}
    <Card>
      <SectionTitle>Course Performance</SectionTitle>
      {data.course_stats.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100 dark:border-slate-700">
                <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400">Course</th>
                <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400 text-right">Enrolled</th>
                <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400 text-right">Completion</th>
                <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {data.course_stats.map((course, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 text-slate-700 dark:text-slate-200 font-medium max-w-[200px] truncate">
                    {course.title}
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300 text-right">
                    {course.enrollments.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        course.completion_rate >= 70
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : course.completion_rate >= 40
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-500 dark:text-rose-400'
                      }`}
                    >
                      {course.completion_rate}%
                    </span>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300 text-right">
                    ${course.revenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState message="No course data available." />
      )}
    </Card>

    {/* Row 4: Top learners */}
    <Card>
      <SectionTitle>Top Learners</SectionTitle>
      {data.top_learners.length > 0 ? (
        <div className="space-y-3">
          {data.top_learners.slice(0, 8).map((learner, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : i === 1
                    ? 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200'
                    : i === 2
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                }`}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                  {learner.name}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {learner.score}%
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {learner.xp.toLocaleString()} XP
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No learner data yet." />
      )}
    </Card>
  </div>
);

const PlatformTab: React.FC<{ data: AdminData }> = ({ data }) => (
  <div className="space-y-6">
    {/* Row 1: Stat cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Users"
        value={data.total_users.toLocaleString()}
        subtitle="Registered accounts"
        trend={data.users_trend}
        color="blue"
        icon={<Icon path={ICONS.users} />}
      />
      <StatCard
        title="Total Courses"
        value={data.total_courses.toLocaleString()}
        subtitle="Published on platform"
        color="emerald"
        icon={<Icon path={ICONS.courses} />}
      />
      <StatCard
        title="Assessments"
        value={data.total_assessments.toLocaleString()}
        subtitle="Active assessments"
        color="purple"
        icon={<Icon path={ICONS.assessments} />}
      />
      <StatCard
        title="Monthly Revenue"
        value={`$${data.monthly_revenue.toLocaleString()}`}
        subtitle="This month"
        trend={data.revenue_trend}
        color="amber"
        icon={<Icon path={ICONS.revenue} />}
      />
    </div>

    {/* Row 2: New users + Tier distribution */}
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-3">
        <SectionTitle>New Users Per Week</SectionTitle>
        {data.new_users_per_week.length > 0 ? (
          <LineChart data={data.new_users_per_week} color="#3b82f6" fill={true} height={220} />
        ) : (
          <EmptyState message="No user growth data." />
        )}
      </Card>
      <Card className="lg:col-span-2 flex flex-col items-center justify-center">
        <SectionTitle>Tier Distribution</SectionTitle>
        {data.tier_distribution.length > 0 ? (
          <DonutChart
            data={data.tier_distribution}
            size={190}
            centerLabel="Users"
            centerValue={data.total_users.toLocaleString()}
          />
        ) : (
          <EmptyState message="No tier data yet." />
        )}
      </Card>
    </div>

    {/* Row 3: Weekly attempts */}
    <Card>
      <SectionTitle>Weekly Assessment Attempts</SectionTitle>
      {data.weekly_attempts.length > 0 ? (
        <BarChart data={data.weekly_attempts} color="#6366f1" height={220} />
      ) : (
        <EmptyState message="No attempt data yet." />
      )}
    </Card>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const AnalyticsDashboard: React.FC<Props> = ({ userTier, currentUserId }) => {
  const isAdmin = userTier === 'admin';

  const [activeTab, setActiveTab] = useState<TabId>('learning');

  const [learnerData, setLearnerData] = useState<LearnerData | null>(null);
  const [learnerLoading, setLearnerLoading] = useState(false);
  const [learnerError, setLearnerError] = useState<string | null>(null);

  const [instructorData, setInstructorData] = useState<InstructorData | null>(null);
  const [instructorLoading, setInstructorLoading] = useState(false);
  const [instructorError, setInstructorError] = useState<string | null>(null);
  const [hasInstructorData, setHasInstructorData] = useState(false);

  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // ── fetch helpers ──────────────────────────────────────────────────────────

  const fetchLearner = useCallback(async () => {
    setLearnerLoading(true);
    setLearnerError(null);
    try {
      const res = await apiClient.get('analytics/learner/');
      setLearnerData(normalizeLearner(res.data));
    } catch (err: any) {
      setLearnerError(err?.response?.data?.detail ?? err?.message ?? 'Unknown error');
    } finally {
      setLearnerLoading(false);
    }
  }, []);

  const fetchInstructor = useCallback(async () => {
    setInstructorLoading(true);
    setInstructorError(null);
    try {
      const res = await apiClient.get('analytics/instructor/');
      const normalized = normalizeInstructor(res.data);
      setInstructorData(normalized);
      setHasInstructorData(normalized.assessments_created > 0 || normalized.total_students > 0);
    } catch (err: any) {
      if (err?.response?.status === 403 || err?.response?.status === 404) {
        setHasInstructorData(false);
      } else {
        setInstructorError(err?.response?.data?.detail ?? err?.message ?? 'Unknown error');
        setHasInstructorData(false);
      }
    } finally {
      setInstructorLoading(false);
    }
  }, []);

  const fetchAdmin = useCallback(async () => {
    if (!isAdmin) return;
    setAdminLoading(true);
    setAdminError(null);
    try {
      const res = await apiClient.get('analytics/admin/');
      setAdminData(normalizeAdmin(res.data));
    } catch (err: any) {
      setAdminError(err?.response?.data?.detail ?? err?.message ?? 'Unknown error');
    } finally {
      setAdminLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchLearner();
    fetchInstructor();
    if (isAdmin) fetchAdmin();
  }, [fetchLearner, fetchInstructor, fetchAdmin, isAdmin]);

  // ── tabs ───────────────────────────────────────────────────────────────────

  const tabs: Tab[] = [
    { id: 'learning', label: 'My Learning' },
    ...(hasInstructorData ? [{ id: 'instructor' as TabId, label: 'Instructor Stats' }] : []),
    ...(isAdmin ? [{ id: 'platform' as TabId, label: 'Platform' }] : []),
  ];

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track your learning progress and performance
          </p>
        </div>
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab content */}
      {activeTab === 'learning' && (
        <>
          {learnerLoading && (
            <div className="space-y-6">
              <SkeletonStatCards />
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <SkeletonChart height="h-64 lg:col-span-3" />
                <SkeletonChart height="h-64 lg:col-span-2" />
              </div>
              <SkeletonChart height="h-56" />
              <SkeletonChart height="h-40" />
            </div>
          )}
          {!learnerLoading && learnerError && (
            <ErrorState message={learnerError} onRetry={fetchLearner} />
          )}
          {!learnerLoading && !learnerError && learnerData && (
            <MyLearningTab data={learnerData} />
          )}
        </>
      )}

      {activeTab === 'instructor' && (
        <>
          {instructorLoading && (
            <div className="space-y-6">
              <SkeletonStatCards />
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <SkeletonChart height="h-64 lg:col-span-3" />
                <SkeletonChart height="h-64 lg:col-span-2" />
              </div>
              <SkeletonChart height="h-56" />
            </div>
          )}
          {!instructorLoading && instructorError && (
            <ErrorState message={instructorError} onRetry={fetchInstructor} />
          )}
          {!instructorLoading && !instructorError && instructorData && (
            <InstructorTab data={instructorData} />
          )}
        </>
      )}

      {activeTab === 'platform' && isAdmin && (
        <>
          {adminLoading && (
            <div className="space-y-6">
              <SkeletonStatCards />
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <SkeletonChart height="h-64 lg:col-span-3" />
                <SkeletonChart height="h-64 lg:col-span-2" />
              </div>
              <SkeletonChart height="h-56" />
            </div>
          )}
          {!adminLoading && adminError && (
            <ErrorState message={adminError} onRetry={fetchAdmin} />
          )}
          {!adminLoading && !adminError && adminData && (
            <PlatformTab data={adminData} />
          )}
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Normalizers — safely coerce API responses into our typed shapes
// ─────────────────────────────────────────────────────────────────────────────

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#14b8a6',
];
const TIER_COLORS: Record<string, string> = {
  free: '#94a3b8',
  learner: '#3b82f6',
  pro: '#8b5cf6',
  pro_plus: '#10b981',
  admin: '#f59e0b',
};
const SCORE_DIST_COLORS = ['#ef4444', '#f59e0b', '#10b981'];

function normalizeLearner(raw: any): LearnerData {
  // Backend response shape:
  //   { summary: {...}, score_history: [...], xp_history: [...],
  //     course_progress: [...], assessment_by_topic: [...],
  //     learning_calendar: [...], xp_by_category: [...] }
  const summary = raw?.summary ?? {};

  const xp_by_category = safeArr<any>(raw?.xp_by_category).map((d, i) => ({
    label: String(d.category ?? d.label ?? d.name ?? `Cat ${i + 1}`),
    value: safeNum(d.total_xp ?? d.value ?? d.xp),
    color: d.color ?? CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  // assessment_by_topic → score_by_topic
  const score_by_topic = safeArr<any>(raw?.assessment_by_topic ?? raw?.score_by_topic).map((d) => ({
    label: String(d.topic ?? d.label ?? 'Topic'),
    value: safeNum(d.average_score ?? d.avg_score ?? d.value),
  }));

  // xp_history → xp_over_weeks
  const xp_over_weeks = safeArr<any>(raw?.xp_history ?? raw?.xp_over_weeks).map((d) => ({
    label: String(d.week ?? d.label ?? '?'),
    value: safeNum(d.xp ?? d.value),
  }));

  // learning_calendar → activity_calendar
  const activity_calendar = safeArr<any>(raw?.learning_calendar ?? raw?.activity_calendar).map((d) => ({
    date: String(d.date),
    count: safeNum(d.count ?? d.value),
  }));

  // course_progress: backend returns { course_title, progress_percentage, ... }
  const course_progress = safeArr<any>(raw?.course_progress).map((d, i) => ({
    title: String(d.course_title ?? d.title ?? d.name ?? `Course ${i + 1}`),
    progress: safeNum(d.progress_percentage ?? d.progress ?? d.completion ?? 0),
    color: d.color ?? CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  return {
    total_xp: safeNum(summary.total_xp ?? raw?.total_xp),
    avg_score: safeNum(summary.average_score ?? summary.avg_score ?? raw?.avg_score),
    lessons_done: safeNum(summary.total_lessons_completed ?? summary.lessons_done ?? raw?.lessons_done),
    streak_days: safeNum(summary.streak_days ?? summary.streak ?? raw?.streak_days),
    xp_over_weeks,
    xp_by_category,
    score_by_topic,
    activity_calendar,
    course_progress,
    xp_trend: summary.xp_trend != null ? safeNum(summary.xp_trend) : undefined,
    score_trend: summary.score_trend != null ? safeNum(summary.score_trend) : undefined,
    lessons_trend: summary.lessons_trend != null ? safeNum(summary.lessons_trend) : undefined,
  };
}

function normalizeInstructor(raw: any): InstructorData {
  // Backend response shape:
  //   { course_stats: [...], assessment_stats: [...], revenue_summary: {...},
  //     top_learners: [...], summary: { total_courses, total_students, total_assessments, avg_completion_rate } }
  const summary = raw?.summary ?? {};
  const revSummary = raw?.revenue_summary ?? {};

  // assessment_stats → assessment_avg_scores (one bar per assessment)
  const assessment_avg_scores = safeArr<any>(raw?.assessment_stats ?? raw?.assessment_avg_scores).map((d) => ({
    label: String(d.title ?? d.label ?? 'Assessment'),
    value: safeNum(d.avg_score ?? d.value),
  }));

  // Build score distribution from the aggregated score_distribution across all assessments
  // Each assessment_stat has a score_distribution array; aggregate them
  const allDistBuckets: Record<string, number> = {};
  safeArr<any>(raw?.assessment_stats).forEach((stat) => {
    safeArr<any>(stat.score_distribution).forEach((bucket: any) => {
      const key = String(bucket.range ?? bucket.label ?? '?');
      allDistBuckets[key] = (allDistBuckets[key] ?? 0) + safeNum(bucket.count ?? bucket.value);
    });
  });

  const aggregatedDist = Object.entries(allDistBuckets).map(([label, count], i) => ({
    label,
    value: count,
    color: SCORE_DIST_COLORS[i % SCORE_DIST_COLORS.length],
  })).filter((d) => d.value > 0);

  // Fallback: flat score_distribution on raw (not used by current backend but kept for flexibility)
  const flatDist = safeArr<any>(raw?.score_distribution).map((d, i) => ({
    label: String(d.label ?? d.range ?? `Range ${i + 1}`),
    value: safeNum(d.value ?? d.count),
    color: d.color ?? SCORE_DIST_COLORS[i % SCORE_DIST_COLORS.length],
  }));

  const score_distribution =
    aggregatedDist.length > 0 ? aggregatedDist :
    flatDist.length > 0 ? flatDist :
    [
      { label: '0–59', value: 0, color: '#ef4444' },
      { label: '60–79', value: 0, color: '#f59e0b' },
      { label: '80–100', value: 0, color: '#10b981' },
    ];

  // course_stats: backend returns { course_id, title, enrolled_count, completion_rate, avg_progress, total_revenue }
  const course_stats = safeArr<any>(raw?.course_stats).map((d) => ({
    title: String(d.title ?? d.name ?? 'Course'),
    enrollments: safeNum(d.enrolled_count ?? d.enrollments ?? d.enrollment_count),
    completion_rate: safeNum(d.completion_rate ?? d.completion),
    revenue: safeNum(d.total_revenue ?? d.revenue),
  }));

  // top_learners: backend returns { username, total_xp, courses_enrolled, avg_score }
  const top_learners = safeArr<any>(raw?.top_learners).map((d) => ({
    name: String(d.username ?? d.name ?? 'Learner'),
    score: safeNum(d.avg_score ?? d.score),
    xp: safeNum(d.total_xp ?? d.xp),
  }));

  return {
    total_students: safeNum(summary.total_students ?? raw?.total_students),
    avg_completion: safeNum(summary.avg_completion_rate ?? summary.avg_completion ?? raw?.avg_completion),
    total_revenue: safeNum(revSummary.total_revenue ?? raw?.total_revenue),
    assessments_created: safeNum(summary.total_assessments ?? raw?.assessments_created),
    assessment_avg_scores,
    score_distribution,
    course_stats,
    top_learners,
    students_trend: summary.students_trend != null ? safeNum(summary.students_trend) : undefined,
    revenue_trend: summary.revenue_trend != null ? safeNum(summary.revenue_trend) : undefined,
  };
}

function normalizeAdmin(raw: any): AdminData {
  // Backend response shape:
  //   { user_stats: { total, by_tier, new_this_month, active_last_30_days },
  //     content_stats: { total_courses, total_lessons, total_assessments, total_attempts },
  //     revenue_stats: { total_all_time, this_month, last_month },
  //     activity_trend: [{ week, new_users, attempts, lessons_completed }],
  //     tier_distribution: [{ tier, count, percentage }] }
  const userStats = raw?.user_stats ?? {};
  const contentStats = raw?.content_stats ?? {};
  const revenueStats = raw?.revenue_stats ?? {};

  // activity_trend → new_users_per_week (one entry per week)
  const new_users_per_week = safeArr<any>(raw?.activity_trend ?? raw?.new_users_per_week).map((d) => ({
    label: String(d.week ?? d.label ?? '?'),
    value: safeNum(d.new_users ?? d.value ?? d.count),
  }));

  // tier_distribution: backend returns { tier, count, percentage }
  const tier_distribution = safeArr<any>(raw?.tier_distribution).map((d, i) => ({
    label: String(d.tier ?? d.label ?? `Tier ${i + 1}`),
    value: safeNum(d.count ?? d.value),
    color: d.color ?? TIER_COLORS[String(d.tier ?? d.label ?? '').toLowerCase()] ?? CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  // activity_trend → weekly_attempts
  const weekly_attempts = safeArr<any>(raw?.activity_trend ?? raw?.weekly_attempts).map((d) => ({
    label: String(d.week ?? d.label ?? '?'),
    value: safeNum(d.attempts ?? d.value ?? d.count),
  }));

  return {
    total_users: safeNum(userStats.total ?? raw?.total_users),
    total_courses: safeNum(contentStats.total_courses ?? raw?.total_courses),
    total_assessments: safeNum(contentStats.total_assessments ?? raw?.total_assessments),
    monthly_revenue: safeNum(revenueStats.this_month ?? raw?.monthly_revenue),
    new_users_per_week,
    tier_distribution,
    weekly_attempts,
    users_trend: userStats.users_trend != null ? safeNum(userStats.users_trend) : undefined,
    revenue_trend: revenueStats.revenue_trend != null ? safeNum(revenueStats.revenue_trend) : undefined,
  };
}
