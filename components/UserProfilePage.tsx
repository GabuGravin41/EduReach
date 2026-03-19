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
        learning_goal: user?.learning_goal || '',
        learner_type: user?.learner_type || '',
        interests: user?.interests || '',
        show_xp_publicly: user?.show_xp_publicly ?? true
    });

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                bio: user.bio || '',
                learning_goal: user.learning_goal || '',
                learner_type: user.learner_type || '',
                interests: user.interests || '',
                show_xp_publicly: user.show_xp_publicly
            });
        }
    }, [user]);

    const handleSave = async () => {
        setSaveState('saving');
        setSaveMessage('');
        try {
            await authService.updateProfile({
                ...formData,
                learning_goal: formData.learning_goal || undefined,
                learner_type: formData.learner_type || undefined,
                interests: formData.interests || undefined
            });
            await refreshUser();
            setSaveState('saved');
            setSaveMessage('Profile updated successfully.');
            setIsEditing(false);
        } catch (error: any) {
            setSaveState('error');
            setSaveMessage(error?.response?.data?.detail || 'Failed to update profile.');
        }
    };

    const avatarUrl = user?.avatar ? authService.getMediaUrl(user.avatar) : null;
    const coverUrl = user?.profile_cover ? authService.getMediaUrl(user.profile_cover) : null;

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('avatar', file);
        try {
            await authService.updateProfile(fd);
            await refreshUser();
        } catch (err: any) {
            setSaveMessage(err?.response?.data?.detail || 'Failed to update photo.');
        }
        e.target.value = '';
    };

    const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('profile_cover', file);
        try {
            await authService.updateProfile(fd);
            await refreshUser();
        } catch (err: any) {
            setSaveMessage(err?.response?.data?.detail || 'Failed to update cover.');
        }
        e.target.value = '';
    };

    const handleRemoveCover = async () => {
        try {
            await authService.updateProfile({ profile_cover: null } as any);
            await refreshUser();
        } catch (err: any) {
            setSaveMessage(err?.response?.data?.detail || 'Failed to remove cover.');
        }
    };

    if (!user) return null;

    const safeTier: UserTier = (user?.tier && user.tier in tierNames) ? user.tier : 'free';
    const xpToNextLevel = 1000 - (user.xp_points % 1000);
    const progressToNextLevel = (user.xp_points % 1000) / 10;
    const hoursSpent = Math.floor(user.total_time_spent_seconds / 3600);
    const minutesLeft = Math.floor((user.total_time_spent_seconds % 3600) / 60);

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Profile Section */}
            <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="relative h-32">
                    {coverUrl ? (
                        <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className={`w-full h-full bg-gradient-to-r ${tierGradients[safeTier]} opacity-90`} />
                    )}
                    <div className="absolute inset-0 flex items-center justify-end gap-2 p-3 bg-black/10">
                        <label className="px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-medium cursor-pointer shadow hover:bg-white transition-colors">
                            {coverUrl ? 'Change cover' : 'Add cover photo'}
                            <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                        </label>
                        {coverUrl && (
                            <button type="button" onClick={handleRemoveCover} className="px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-medium shadow hover:bg-white transition-colors">
                                Remove
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-6 pb-6">
                    <div className="relative flex flex-col md:flex-row md:items-end -mt-14 gap-5">
                        <div className="relative">
                            <label className="block cursor-pointer">
                                <div className={`w-28 h-28 rounded-xl bg-slate-100 dark:bg-slate-900 border-4 border-white dark:border-slate-800 shadow-sm flex items-center justify-center overflow-hidden`}>
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserCircleIcon className="w-20 h-20 text-slate-300 dark:text-slate-700" />
                                    )}
                                </div>
                                <span className="absolute bottom-0 left-0 right-0 text-xs font-medium text-center text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-slate-800 py-0.5 rounded-b-xl">Change photo</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                            </label>
                            <div className="absolute -bottom-1.5 -right-1.5 bg-indigo-600 text-white w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shadow ring-2 ring-white dark:ring-slate-800">
                                {user.level}
                            </div>
                        </div>

                        <div className="flex-1 space-y-1.5">
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                                    {user.username}
                                </h1>
                                <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r ${tierGradients[safeTier]} shadow-sm`}>
                                    {tierNames[safeTier]}
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                                {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : 'Add your name in Profile Details'}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95 text-sm"
                                >
                                    Edit Profile
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleSave}
                                        disabled={saveState === 'saving'}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 text-sm"
                                    >
                                        {saveState === 'saving' ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold hover:bg-slate-200 transition-all active:scale-95 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Stats & Level */}
                <div className="space-y-6">
                    {/* Level Progress */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4 text-amber-500" />
                                Your Rank
                            </h3>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2.5 py-0.5 rounded">
                                LEVEL {user.level}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs mb-0.5">
                                <span className="font-bold text-slate-600 dark:text-slate-400">{user.xp_points} XP Total</span>
                                <span className="font-bold text-slate-400">{xpToNextLevel} XP to Level {user.level + 1}</span>
                            </div>
                            <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded overflow-hidden p-0.5">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded transition-all duration-1000 ease-out"
                                    style={{ width: `${progressToNextLevel}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-base font-extrabold text-slate-800 dark:text-white mb-4">Learning Dashboard</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                                <TrophyIcon className="w-5 h-5 text-emerald-600 mb-1.5" />
                                <div className="text-xl font-black text-slate-800 dark:text-white">{user.xp_points}</div>
                                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">Total XP</div>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                <ClockIcon className="w-5 h-5 text-blue-600 mb-1.5" />
                                <div className="text-xl font-black text-slate-800 dark:text-white">{hoursSpent}h {minutesLeft}m</div>
                                <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-tighter">Time Invested</div>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800/50">
                                <BookOpenIcon className="w-5 h-5 text-purple-600 mb-1.5" />
                                <div className="text-xl font-black text-slate-800 dark:text-white">Active</div>
                                <div className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-tighter">Courses</div>
                            </div>
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/50">
                                <SparklesIcon className="w-5 h-5 text-amber-600 mb-1.5" />
                                <div className="text-xl font-black text-slate-800 dark:text-white">{user.level}</div>
                                <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tighter">Knowledge Rank</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Personal Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">Profile Details</h3>
                            {saveMessage && (
                                <span className={`text-xs font-bold px-3 py-1 rounded ${saveState === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                                    }`}>
                                    {saveMessage}
                                </span>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-0.5">First Name</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent selection:bg-indigo-100 dark:text-white transition-all text-sm"
                                        />
                                    ) : (
                                        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-slate-800 dark:text-white font-medium border border-transparent text-sm">
                                            {user.first_name || '—'}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-0.5">Last Name</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent selection:bg-indigo-100 dark:text-white transition-all text-sm"
                                        />
                                    ) : (
                                        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-slate-800 dark:text-white font-medium border border-transparent text-sm">
                                            {user.last_name || '—'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-0.5">Email Address</label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent selection:bg-indigo-100 dark:text-white transition-all text-sm"
                                    />
                                ) : (
                                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-slate-800 dark:text-white font-medium border border-transparent text-sm">
                                        {user.email || '—'}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-0.5">What brings you here</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.learning_goal}
                                        onChange={(e) => setFormData({ ...formData, learning_goal: e.target.value })}
                                        placeholder="e.g. school, career, exams, curious"
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white text-sm"
                                    />
                                ) : (
                                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-slate-800 dark:text-white font-medium border border-transparent text-sm">
                                        {user.learning_goal ? String(user.learning_goal) : '—'}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-0.5">I am a</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.learner_type}
                                        onChange={(e) => setFormData({ ...formData, learner_type: e.target.value })}
                                        placeholder="e.g. high_school, university, teacher, professional"
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white text-sm"
                                    />
                                ) : (
                                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-slate-800 dark:text-white font-medium border border-transparent text-sm">
                                        {user.learner_type ? String(user.learner_type).replace(/_/g, ' ') : '—'}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-0.5">Interests</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.interests}
                                        onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                                        placeholder="e.g. math, programming, languages (comma-separated)"
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white text-sm"
                                    />
                                ) : (
                                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-slate-800 dark:text-white font-medium border border-transparent text-sm">
                                        {user.interests ? String(user.interests) : '—'}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-0.5">About You</label>
                                {isEditing ? (
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent selection:bg-indigo-100 dark:text-white transition-all resize-none text-sm"
                                        placeholder="Bio..."
                                    />
                                ) : (
                                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-slate-800 dark:text-white font-medium min-h-[100px] whitespace-pre-wrap leading-relaxed text-sm">
                                        {user.bio || 'Share something about your learning journey...'}
                                    </div>
                                )}
                            </div>

                            {/* Privacy Toggle */}
                            <div className="pt-5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Public Leaderboard Visibility</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Show your XP and Level in global rankings</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, show_xp_publicly: !formData.show_xp_publicly })}
                                    disabled={!isEditing}
                                    className={`relative inline-flex h-6 w-11 items-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData.show_xp_publicly ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                                        } ${!isEditing && 'opacity-50 cursor-not-allowed'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded bg-white transition-transform ${formData.show_xp_publicly ? 'translate-x-6' : 'translate-x-1'
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
