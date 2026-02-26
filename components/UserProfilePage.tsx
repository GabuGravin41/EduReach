import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/contexts/useAuth';
import { authService, User } from '../src/services/authService';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { ClockIcon } from './icons/ClockIcon';
import { UserTier } from '../App';

const tierNames: Record<UserTier, string> = {
    free: 'Free Tier',
    learner: 'Learner Tier',
    pro: 'Pro Tier',
    pro_plus: 'Pro Plus Tier',
    admin: 'Admin'
};

const tierGradients: Record<UserTier, string> = {
    free: 'from-slate-500 to-slate-700',
    learner: 'from-emerald-500 to-teal-600',
    pro: 'from-indigo-500 to-purple-600',
    pro_plus: 'from-amber-400 to-orange-600',
    admin: 'from-rose-500 to-pink-600'
};

export const UserProfilePage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [saveMessage, setSaveMessage] = useState('');

    const [formData, setFormData] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        bio: user?.bio || '',
        show_xp_publicly: user?.show_xp_publicly ?? true
    });

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                bio: user.bio || '',
                show_xp_publicly: user.show_xp_publicly
            });
        }
    }, [user]);

    const handleSave = async () => {
        setSaveState('saving');
        setSaveMessage('');
        try {
            await authService.updateProfile(formData);
            await refreshUser();
            setSaveState('saved');
            setSaveMessage('Profile updated successfully.');
            setIsEditing(false);
        } catch (error: any) {
            setSaveState('error');
            setSaveMessage(error?.response?.data?.detail || 'Failed to update profile.');
        }
    };

    if (!user) return null;

    const safeTier: UserTier = (user?.tier && user.tier in tierNames) ? user.tier : 'free';
    const xpToNextLevel = 1000 - (user.xp_points % 1000);
    const progressToNextLevel = (user.xp_points % 1000) / 10;
    const hoursSpent = Math.floor(user.total_time_spent_seconds / 3600);
    const minutesLeft = Math.floor((user.total_time_spent_seconds % 3600) / 60);

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Profile Section */}
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className={`h-40 bg-gradient-to-r ${tierGradients[safeTier]} opacity-90`} />

                <div className="px-8 pb-8">
                    <div className="relative flex flex-col md:flex-row md:items-end -mt-16 gap-6">
                        <div className="relative group">
                            <div className={`w-36 h-36 rounded-3xl bg-slate-100 dark:bg-slate-900 border-8 border-white dark:border-slate-800 shadow-xl flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105`}>
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                                ) : (
                                    <UserCircleIcon className="w-24 h-24 text-slate-300 dark:text-slate-700" />
                                )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ring-4 ring-white dark:ring-slate-800">
                                {user.level}
                            </div>
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">
                                    {user.username}
                                </h1>
                                <span className={`inline-flex px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r ${tierGradients[safeTier]} shadow-sm`}>
                                    {tierNames[safeTier]}
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">
                                {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}` : 'Mystery Educator'}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-1.5xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95"
                                >
                                    Edit Profile
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleSave}
                                        disabled={saveState === 'saving'}
                                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-1.5xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                                    >
                                        {saveState === 'saving' ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-1.5xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Stats & Level */}
                <div className="space-y-8">
                    {/* Level Progress */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-amber-500" />
                                Your Rank
                            </h3>
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-lg">
                                LEVEL {user.level}
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-bold text-slate-600 dark:text-slate-400">{user.xp_points} XP Total</span>
                                <span className="font-bold text-slate-400">{xpToNextLevel} XP to Level {user.level + 1}</span>
                            </div>
                            <div className="h-4 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden p-1">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out shadow-sm shadow-indigo-500/50"
                                    style={{ width: `${progressToNextLevel}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mb-6">Learning Dashboard</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                                <TrophyIcon className="w-6 h-6 text-emerald-600 mb-2" />
                                <div className="text-2xl font-black text-slate-800 dark:text-white">{user.xp_points}</div>
                                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">Total XP</div>
                            </div>
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                                <ClockIcon className="w-6 h-6 text-blue-600 mb-2" />
                                <div className="text-2xl font-black text-slate-800 dark:text-white">{hoursSpent}h {minutesLeft}m</div>
                                <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-tighter">Time Invested</div>
                            </div>
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800/50">
                                <BookOpenIcon className="w-6 h-6 text-purple-600 mb-2" />
                                <div className="text-2xl font-black text-slate-800 dark:text-white">Active</div>
                                <div className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-tighter">Courses</div>
                            </div>
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                                <SparklesIcon className="w-6 h-6 text-amber-600 mb-2" />
                                <div className="text-2xl font-black text-slate-800 dark:text-white">{user.level}</div>
                                <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tighter">Knowledge Rank</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Personal Info */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">Profile Details</h3>
                            {saveMessage && (
                                <span className={`text-sm font-bold px-4 py-1.5 rounded-full ${saveState === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                                    }`}>
                                    {saveMessage}
                                </span>
                            )}
                        </div>

                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/20 selection:bg-indigo-100 dark:text-white transition-all"
                                        />
                                    ) : (
                                        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-slate-800 dark:text-white font-medium border border-transparent">
                                            {user.first_name || '—'}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/20 selection:bg-indigo-100 dark:text-white transition-all"
                                        />
                                    ) : (
                                        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-slate-800 dark:text-white font-medium border border-transparent">
                                            {user.last_name || '—'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/20 selection:bg-indigo-100 dark:text-white transition-all"
                                    />
                                ) : (
                                    <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-slate-800 dark:text-white font-medium border border-transparent">
                                        {user.email || '—'}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">About You</label>
                                {isEditing ? (
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        rows={4}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/20 selection:bg-indigo-100 dark:text-white transition-all resize-none"
                                        placeholder="Bio..."
                                    />
                                ) : (
                                    <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-slate-800 dark:text-white font-medium min-h-[120px] whitespace-pre-wrap leading-relaxed">
                                        {user.bio || 'Share something about your learning journey...'}
                                    </div>
                                )}
                            </div>

                            {/* Privacy Toggle */}
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-800 dark:text-white">Public Leaderboard Visibility</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Show your XP and Level in global rankings</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, show_xp_publicly: !formData.show_xp_publicly })}
                                    disabled={!isEditing}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData.show_xp_publicly ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                                        } ${!isEditing && 'opacity-50 cursor-not-allowed'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.show_xp_publicly ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
