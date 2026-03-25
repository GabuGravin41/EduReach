import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/contexts/useAuth';
import { authService } from '../src/services/authService';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { ClockIcon } from './icons/ClockIcon';
import { UserTier } from '../App';

// Pencil icon (inline, no external dependency)
const PencilIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.929l-3 1 1-3a4 4 0 01.929-1.414z" />
  </svg>
);

// ── Tier config ──────────────────────────────────────────────────────────────

const tierConfig: Record<UserTier, { label: string; badge: string; cover: string }> = {
  free:     { label: 'Free',     badge: 'bg-slate-500 text-white',                  cover: 'from-slate-500 to-slate-700' },
  learner:  { label: 'Learner',  badge: 'bg-blue-600 text-white',                   cover: 'from-blue-500 to-cyan-600' },
  pro:      { label: 'Pro',      badge: 'bg-violet-600 text-white',                 cover: 'from-violet-500 to-purple-700' },
  pro_plus: { label: 'Pro+',     badge: 'bg-amber-500 text-white',                  cover: 'from-amber-400 to-orange-600' },
  admin:    { label: 'Admin',    badge: 'bg-rose-600 text-white',                   cover: 'from-rose-500 to-pink-700' },
};

// ── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color: string; // tailwind bg + text classes
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <div className={`flex flex-col items-center justify-center p-4 rounded-2xl ${color} gap-1`}>
    <div className="mb-1">{icon}</div>
    <div className="text-2xl font-black leading-none">{value}</div>
    <div className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</div>
  </div>
);

// ── Field row ────────────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  display: React.ReactNode;
  input?: React.ReactNode;
  editing: boolean;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, display, input, editing }) => (
  <div className="space-y-1">
    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</label>
    {editing && input ? input : display}
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────

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
    show_xp_publicly: user?.show_xp_publicly ?? true,
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
        show_xp_publicly: user.show_xp_publicly,
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
        interests: formData.interests || undefined,
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

  const handleCancel = () => {
    setIsEditing(false);
    setSaveMessage('');
    setSaveState('idle');
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        bio: user.bio || '',
        learning_goal: user.learning_goal || '',
        learner_type: user.learner_type || '',
        interests: user.interests || '',
        show_xp_publicly: user.show_xp_publicly,
      });
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
      setSaveState('error');
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
      setSaveState('error');
    }
    e.target.value = '';
  };

  const handleRemoveCover = async () => {
    try {
      await authService.updateProfile({ profile_cover: null } as any);
      await refreshUser();
    } catch (err: any) {
      setSaveMessage(err?.response?.data?.detail || 'Failed to remove cover.');
      setSaveState('error');
    }
  };

  if (!user) return null;

  const safeTier: UserTier = (user?.tier && user.tier in tierConfig) ? user.tier : 'free';
  const tier = tierConfig[safeTier];

  const xpInCurrentLevel = user.xp_points % 1000;
  const progressPct = xpInCurrentLevel / 10; // 0-100
  const xpToNext = 1000 - xpInCurrentLevel;
  const hoursSpent = Math.floor((user.total_time_spent_seconds || 0) / 3600);
  const minutesLeft = Math.floor(((user.total_time_spent_seconds || 0) % 3600) / 60);

  // Parse interests into tags
  const interestTags = user.interests
    ? String(user.interests).split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // Input styling shorthand
  const inputCls = 'w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white text-sm transition-all';

  return (
    <div className="max-w-4xl mx-auto space-y-0 pb-12">

      {/* ── Hero: cover + avatar ──────────────────────────────────────── */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">

        {/* Cover photo area */}
        <div className="relative h-40">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-r ${tier.cover}`} />
          )}
          {/* Overlay actions (top-right) */}
          <div className="absolute top-3 right-3 flex gap-2">
            <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white text-xs font-semibold backdrop-blur-sm transition-colors">
              {coverUrl ? 'Change cover' : 'Add cover'}
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            </label>
            {coverUrl && (
              <button
                type="button"
                onClick={handleRemoveCover}
                className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white text-xs font-semibold backdrop-blur-sm transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          {/* Edit profile button — top-right when not editing */}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-white text-xs font-semibold shadow hover:bg-white dark:hover:bg-slate-700 transition-colors backdrop-blur-sm"
            >
              <PencilIcon className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Avatar overlapping cover */}
        <div className="px-6 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-10">
            {/* Avatar */}
            <div className="relative flex-none">
              <label className="block cursor-pointer group">
                <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 shadow-lg bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircleIcon className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-white dark:border-slate-800 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                  <PencilIcon className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
              {/* Level badge */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md ring-2 ring-white dark:ring-slate-800">
                {user.level}
              </div>
            </div>

            {/* Name + tier + bio */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {user.first_name || user.last_name
                    ? `${user.first_name} ${user.last_name}`.trim()
                    : user.username}
                </h1>
                <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-widest ${tier.badge}`}>
                  {tier.label}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">@{user.username}</p>
              {user.bio && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed max-w-lg">
                  {user.bio}
                </p>
              )}
            </div>

            {/* Save/Cancel buttons when editing */}
            {isEditing && (
              <div className="flex gap-2 pb-1 flex-shrink-0">
                <button
                  onClick={handleSave}
                  disabled={saveState === 'saving'}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow disabled:opacity-60"
                >
                  {saveState === 'saving' ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Status message */}
          {saveMessage && (
            <div className={`mt-3 text-xs font-bold px-3 py-2 rounded-lg inline-block ${
              saveState === 'error'
                ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}>
              {saveMessage}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <StatCard
          icon={<TrophyIcon className="w-5 h-5" />}
          label="XP Points"
          value={user.xp_points.toLocaleString()}
          color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
        />
        <StatCard
          icon={<SparklesIcon className="w-5 h-5" />}
          label="Level"
          value={user.level}
          color="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
        />
        <StatCard
          icon={<BookOpenIcon className="w-5 h-5" />}
          label="Time Invested"
          value={`${hoursSpent}h ${minutesLeft}m`}
          color="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
        />
        <StatCard
          icon={<ClockIcon className="w-5 h-5" />}
          label="XP to next level"
          value={xpToNext}
          color="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
        />
      </div>

      {/* ── XP progress bar ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mt-4 shadow-sm">
        <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
          <span>Level {user.level} — {xpInCurrentLevel} / 1000 XP</span>
          <span>{xpToNext} XP to Level {user.level + 1}</span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
      </div>

      {/* ── Profile details / edit panel ──────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mt-4 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
          {isEditing ? (
            <>
              <PencilIcon className="w-4 h-4 text-indigo-500" />
              Editing Profile
            </>
          ) : (
            'Profile Details'
          )}
        </h2>

        <div className="space-y-5">
          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow
              label="First Name"
              editing={isEditing}
              display={
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-800 dark:text-slate-100 font-medium text-sm border border-transparent">
                  {user.first_name || <span className="text-slate-400">—</span>}
                </div>
              }
              input={
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                  className={inputCls}
                  placeholder="First name"
                />
              }
            />
            <FieldRow
              label="Last Name"
              editing={isEditing}
              display={
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-800 dark:text-slate-100 font-medium text-sm border border-transparent">
                  {user.last_name || <span className="text-slate-400">—</span>}
                </div>
              }
              input={
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                  className={inputCls}
                  placeholder="Last name"
                />
              }
            />
          </div>

          {/* Email */}
          <FieldRow
            label="Email Address"
            editing={isEditing}
            display={
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-800 dark:text-slate-100 font-medium text-sm border border-transparent">
                {user.email || <span className="text-slate-400">—</span>}
              </div>
            }
            input={
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className={inputCls}
              />
            }
          />

          {/* Learning goal */}
          <FieldRow
            label="Learning Goal"
            editing={isEditing}
            display={
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-800 dark:text-slate-100 font-medium text-sm border border-transparent">
                {user.learning_goal
                  ? String(user.learning_goal)
                  : <span className="text-slate-400">Not set</span>}
              </div>
            }
            input={
              <input
                type="text"
                value={formData.learning_goal}
                onChange={e => setFormData({ ...formData, learning_goal: e.target.value })}
                placeholder="e.g. school, career, exams, curious"
                className={inputCls}
              />
            }
          />

          {/* Learner type */}
          <FieldRow
            label="I am a"
            editing={isEditing}
            display={
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-800 dark:text-slate-100 font-medium text-sm border border-transparent">
                {user.learner_type
                  ? String(user.learner_type).replace(/_/g, ' ')
                  : <span className="text-slate-400">Not set</span>}
              </div>
            }
            input={
              <input
                type="text"
                value={formData.learner_type}
                onChange={e => setFormData({ ...formData, learner_type: e.target.value })}
                placeholder="e.g. high_school, university, teacher, professional"
                className={inputCls}
              />
            }
          />

          {/* Interests — shown as colored tags in read mode */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Interests</label>
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={formData.interests}
                  onChange={e => setFormData({ ...formData, interests: e.target.value })}
                  placeholder="e.g. math, programming, languages (comma-separated)"
                  className={inputCls}
                />
                <p className="text-xs text-slate-400 mt-1">Separate topics with commas.</p>
              </>
            ) : (
              interestTags.length > 0 ? (
                <div className="flex flex-wrap gap-2 py-1">
                  {interestTags.map((tag, i) => {
                    const colors = [
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                      'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                      'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
                      'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
                    ];
                    return (
                      <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold ${colors[i % colors.length]}`}>
                        {tag}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-400 font-medium text-sm border border-transparent">
                  Not set
                </div>
              )
            )}
          </div>

          {/* Bio */}
          <FieldRow
            label="About You"
            editing={isEditing}
            display={
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-700 dark:text-slate-300 text-sm border border-transparent min-h-[80px] whitespace-pre-wrap leading-relaxed">
                {user.bio || <span className="text-slate-400 italic">Share something about your learning journey…</span>}
              </div>
            }
            input={
              <textarea
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                placeholder="Bio…"
                className={`${inputCls} resize-none`}
              />
            }
          />

          {/* XP visibility toggle */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">Public Leaderboard Visibility</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Show your XP and Level in global rankings</p>
            </div>
            <button
              type="button"
              onClick={() => isEditing && setFormData({ ...formData, show_xp_publicly: !formData.show_xp_publicly })}
              disabled={!isEditing}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                formData.show_xp_publicly ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
              } ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                  formData.show_xp_publicly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Member since */}
          {user.date_joined && (
            <p className="text-xs text-slate-400 dark:text-slate-500 pt-1">
              Member since {new Date(user.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
