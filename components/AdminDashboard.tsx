import React from 'react';
import { UsersIcon } from './icons/UsersIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';

interface AdminDashboardProps {
    stats: {
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
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value.toLocaleString()}</p>
        </div>
    </div>
);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats }) => {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Platform overview and statistics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Users" value={stats.totalUsers} icon={UsersIcon} />
                <StatCard title="Courses Created" value={stats.coursesCreated} icon={BookOpenIcon} />
                <StatCard title="Active Assessments" value={stats.activeAssessments} icon={ClipboardCheckIcon} />
            </div>

            <div className="mt-12">
                 <h2 className="text-xl font-bold mb-4">Management Tools</h2>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg shadow-slate-900/5">
                    <p className="text-slate-600 dark:text-slate-300">
                        From here, you would typically access user management tables, content moderation queues, analytics reports, and platform settings.
                        <br /><br />
                        For this demo, you can:
                    </p>
                    <ul className="list-disc list-inside mt-4 space-y-2 text-slate-600 dark:text-slate-300">
                        <li>Navigate to the <span className="font-semibold text-indigo-600 dark:text-indigo-400">Courses</span> page to see all courses on the platform.</li>
                        <li>Visit the <span className="font-semibold text-indigo-600 dark:text-indigo-400">Community</span> page to moderate user posts.</li>
                    </ul>
                 </div>
            </div>
        </div>
    );
};
