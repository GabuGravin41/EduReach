import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { UsersIcon } from './icons/UsersIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { API_CONFIG, API_ENDPOINTS } from '../src/config/api';
import apiClient from '../src/services/api';
import { BarChart } from './charts/BarChart';
import { StatCard } from './charts/StatCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TierDistribution {
    tier: string;
    count: number;
    percentage: number;
}

interface ActivityTrendPoint {
    week: string;
    new_users: number;
    attempts: number;
    lessons_completed: number;
}

interface AdminAnalytics {
    user_stats: {
        total: number;
        by_tier: Record<string, number>;
        new_this_month: number;
        active_last_30_days: number;
    };
    content_stats: {
        total_courses: number;
        total_lessons: number;
        total_assessments: number;
        total_attempts: number;
    };
    revenue_stats: {
        total_all_time: number;
        this_month: number;
        last_month: number;
    };
    activity_trend: ActivityTrendPoint[];
    tier_distribution: TierDistribution[];
}

// Legacy fallback shape from users/admin/stats endpoint
interface AdminStats {
    total_users: number;
    courses_created: number;
    active_assessments: number;
}

interface AdminDashboardProps {
    stats?: {
        totalUsers: number;
        coursesCreated: number;
        activeAssessments: number;
    };
}

// ---------------------------------------------------------------------------
// Tier colour mapping
// ---------------------------------------------------------------------------
const TIER_COLORS: Record<string, string> = {
    free: 'bg-slate-400',
    learner: 'bg-blue-500',
    pro: 'bg-indigo-500',
    pro_plus: 'bg-purple-600',
    admin: 'bg-rose-500',
};

const TIER_LABELS: Record<string, string> = {
    free: 'Free',
    learner: 'Learner',
    pro: 'Pro',
    pro_plus: 'Pro Plus',
    admin: 'Admin',
};

// ---------------------------------------------------------------------------
// Currency formatter
// ---------------------------------------------------------------------------
const fmtCurrency = (n: number): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl ${className}`} />
);

// ---------------------------------------------------------------------------
// AdminDashboard
// ---------------------------------------------------------------------------
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats: propsStats }) => {

    // ---- Primary: full analytics endpoint ----
    const {
        data: analytics,
        isLoading: analyticsLoading,
        isError: analyticsError,
    } = useQuery<AdminAnalytics>({
        queryKey: ['admin', 'analytics'],
        queryFn: async () => {
            const res = await apiClient.get('analytics/admin/');
            return res.data;
        },
        staleTime: 60 * 1000,
        retry: 1,
    });

    // ---- Fallback: legacy stats endpoint ----
    const {
        data: legacyStats,
        isLoading: legacyLoading,
        isError: legacyError,
    } = useQuery<AdminStats>({
        queryKey: ['admin', 'stats'],
        queryFn: async () => {
            const res = await apiClient.get(API_ENDPOINTS.ADMIN_STATS);
            return res.data;
        },
        staleTime: 60 * 1000,
        enabled: analyticsError, // only run if primary fails
    });

    const isLoading = analyticsLoading || (analyticsError && legacyLoading);
    const isError = analyticsError && legacyError;

    // Resolve stat values
    const totalUsers = analytics?.user_stats?.total ?? legacyStats?.total_users ?? propsStats?.totalUsers ?? 0;
    const totalCourses = analytics?.content_stats?.total_courses ?? legacyStats?.courses_created ?? propsStats?.coursesCreated ?? 0;
    const totalAssessments = analytics?.content_stats?.total_assessments ?? legacyStats?.active_assessments ?? propsStats?.activeAssessments ?? 0;
    const totalRevenue = analytics?.revenue_stats?.total_all_time ?? 0;
    const activeUsers = analytics?.user_stats?.active_last_30_days ?? 0;
    const newThisMonth = analytics?.user_stats?.new_this_month ?? 0;
    const totalAttempts = analytics?.content_stats?.total_attempts ?? 0;

    // Build bar chart data from activity trend (new users per week)
    const activityChartData = (analytics?.activity_trend ?? []).map(pt => ({
        label: pt.week.replace(/^\d{4}-W/, 'W'),
        value: pt.attempts,
    }));

    const newUsersChartData = (analytics?.activity_trend ?? []).map(pt => ({
        label: pt.week.replace(/^\d{4}-W/, 'W'),
        value: pt.new_users,
    }));

    // Tier distribution
    const tierDist: TierDistribution[] = analytics?.tier_distribution ?? [];
    const maxTierCount = Math.max(...tierDist.map(t => t.count), 1);

    return (
        <div className="space-y-8">

            {/* ------------------------------------------------------------------ */}
            {/* Header                                                              */}
            {/* ------------------------------------------------------------------ */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Platform overview and analytics.</p>
                </div>
                <a
                    href={`${typeof window !== 'undefined' ? new URL(API_CONFIG.BASE_URL).origin : ''}/admin/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    Django Admin
                    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
                        <path d="M3 3h10v10H3V3z" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 3V1M8 15v-2M3 8H1M15 8h-2" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                </a>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* Error banner                                                        */}
            {/* ------------------------------------------------------------------ */}
            {isError && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-sm">
                    Could not load platform analytics. Showing cached or placeholder data.
                </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* Stat cards                                                          */}
            {/* ------------------------------------------------------------------ */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Users"
                        value={totalUsers}
                        subtitle={`${newThisMonth} new this month`}
                        color="blue"
                        icon={<UsersIcon className="w-5 h-5" />}
                    />
                    <StatCard
                        title="Active Users (30d)"
                        value={activeUsers}
                        subtitle={totalUsers > 0 ? `${Math.round(activeUsers / totalUsers * 100)}% of all users` : undefined}
                        color="emerald"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        }
                    />
                    <StatCard
                        title="Courses & Assessments"
                        value={`${totalCourses} / ${totalAssessments}`}
                        subtitle={`${totalAttempts.toLocaleString()} total attempts`}
                        color="purple"
                        icon={<BookOpenIcon className="w-5 h-5" />}
                    />
                    <StatCard
                        title="Total Revenue"
                        value={fmtCurrency(totalRevenue)}
                        subtitle={analytics ? `${fmtCurrency(analytics.revenue_stats.this_month)} this month` : undefined}
                        color="amber"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* Charts row                                                          */}
            {/* ------------------------------------------------------------------ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Activity trend — assessment attempts per week */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
                    <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Assessment Activity</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Attempts submitted per week (last 12 weeks)</p>
                    {isLoading ? (
                        <Skeleton className="h-52" />
                    ) : activityChartData.length > 0 ? (
                        <BarChart data={activityChartData} color="#6366f1" height={220} unit="" />
                    ) : (
                        <div className="flex items-center justify-center h-40 text-slate-400 dark:text-slate-500 text-sm">
                            No activity data yet.
                        </div>
                    )}
                </div>

                {/* New users per week */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
                    <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">New Registrations</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">New users per week (last 12 weeks)</p>
                    {isLoading ? (
                        <Skeleton className="h-52" />
                    ) : newUsersChartData.length > 0 ? (
                        <BarChart data={newUsersChartData} color="#10b981" height={220} unit="" />
                    ) : (
                        <div className="flex items-center justify-center h-40 text-slate-400 dark:text-slate-500 text-sm">
                            No registration data yet.
                        </div>
                    )}
                </div>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* Tier distribution                                                   */}
            {/* ------------------------------------------------------------------ */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">User Tier Distribution</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Breakdown of users by subscription plan</p>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10" />)}
                    </div>
                ) : tierDist.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500">No tier data available.</p>
                ) : (
                    <div className="space-y-4">
                        {tierDist.map(row => (
                            <div key={row.tier}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {TIER_LABELS[row.tier] ?? row.tier}
                                    </span>
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        {row.count.toLocaleString()} · {row.percentage.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${TIER_COLORS[row.tier] ?? 'bg-indigo-500'}`}
                                        style={{ width: `${(row.count / maxTierCount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* Revenue detail                                                      */}
            {/* ------------------------------------------------------------------ */}
            {analytics && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Revenue — All Time</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fmtCurrency(analytics.revenue_stats.total_all_time)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Revenue — This Month</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(analytics.revenue_stats.this_month)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Revenue — Last Month</p>
                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{fmtCurrency(analytics.revenue_stats.last_month)}</p>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* Management links                                                    */}
            {/* ------------------------------------------------------------------ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Backend Management</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Use the Django admin site to manage users (including promoting staff/superuser), tiers, payments, subscriptions, courses, creator earnings, and all platform data.
                    </p>
                    <a
                        href={`${typeof window !== 'undefined' ? new URL(API_CONFIG.BASE_URL).origin : ''}/admin/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
                    >
                        Open Django Admin
                    </a>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3">In-App Tools</h3>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-500 mt-0.5">▸</span>
                            <span>Use <span className="font-semibold text-indigo-600 dark:text-indigo-400">Courses</span> to see all courses on the platform.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-500 mt-0.5">▸</span>
                            <span>Use <span className="font-semibold text-indigo-600 dark:text-indigo-400">Community</span> to moderate user posts.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-500 mt-0.5">▸</span>
                            <span>Use the tier switcher in the sidebar to preview the site as a different tier (Free, Learner, Pro).</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
