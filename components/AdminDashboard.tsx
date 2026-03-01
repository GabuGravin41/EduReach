import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { UsersIcon } from './icons/UsersIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { API_CONFIG, API_ENDPOINTS } from '../src/config/api';
import apiClient from '../src/services/api';

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

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg shadow-slate-900/5 flex items-center gap-6">
        <div className="p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
            <Icon className="w-8 h-8 text-indigo-500" />
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        </div>
    </div>
);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats: propsStats }) => {
    const { data: liveStats, isLoading, isError, error } = useQuery<AdminStats>({
        queryKey: ['admin', 'stats'],
        queryFn: async () => {
            const res = await apiClient.get(API_ENDPOINTS.ADMIN_STATS);
            return res.data;
        },
        staleTime: 60 * 1000,
    });

    const stats = liveStats
        ? { totalUsers: liveStats.total_users, coursesCreated: liveStats.courses_created, activeAssessments: liveStats.active_assessments }
        : propsStats ?? { totalUsers: 0, coursesCreated: 0, activeAssessments: 0 };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Platform overview and statistics.</p>
            </div>

            {isLoading && (
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-6">
                    <span className="inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    Loading live stats…
                </div>
            )}
            {isError && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-sm">
                    Could not load platform stats. {(error as any)?.response?.data?.error ?? (error as Error)?.message ?? 'Check your connection.'}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Users" value={stats.totalUsers} icon={UsersIcon} />
                <StatCard title="Courses Created" value={stats.coursesCreated} icon={BookOpenIcon} />
                <StatCard title="Active Assessments" value={stats.activeAssessments} icon={ClipboardCheckIcon} />
            </div>

            <div className="mt-12">
                 <h2 className="text-xl font-bold mb-4">User & data management</h2>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg shadow-slate-900/5 space-y-4">
                    <p className="text-slate-600 dark:text-slate-300">
                        Use the Django admin site to manage users (including promoting staff/superuser), tiers, payments, subscriptions, courses, creator earnings, and all platform data. You must be logged in as a staff/superuser on the backend.
                    </p>
                    <a
                        href={`${typeof window !== 'undefined' ? new URL(API_CONFIG.BASE_URL).origin : ''}/admin/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
                    >
                        Open Django Admin
                    </a>
                 </div>
                 <div className="mt-6 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg shadow-slate-900/5">
                    <h3 className="font-bold mb-2 text-slate-800 dark:text-slate-100">In the app</h3>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-sm">
                        <li>Use <span className="font-semibold text-indigo-600 dark:text-indigo-400">Courses</span> to see all courses on the platform.</li>
                        <li>Use <span className="font-semibold text-indigo-600 dark:text-indigo-400">Community</span> to moderate user posts.</li>
                        <li>Use the tier switcher in the sidebar to view the site as a different tier (e.g. Free, Learner).</li>
                    </ul>
                 </div>
            </div>
        </div>
    );
};
