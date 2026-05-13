import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../src/contexts/useAuth';
import { authService } from '../src/services/authService';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { ClockIcon } from './icons/ClockIcon';
import { UserTier } from '../App';

const PencilIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.929l-3 1 1-3a4 4 0 01.929-1.414z" />
  </svg>
);

const INTEREST_OPTIONS = [
  'Mathematics', 'Contest Mathematics', 'Programming', 'Science', 'Physics',
  'Chemistry', 'Biology', 'Engineering', 'Computer Science', 'Economics',
  'Business', 'Medicine', 'Law', 'History', 'English', 'Arts', 'Philosophy', 'Geography',
];

const LEARNER_TYPE_OPTIONS = [
  { value: 'high_school', label: '🏫 High school student' },
  { value: 'university',  label: '🎓 University student' },
  { value: 'teacher',     label: '👨‍🏫 Teacher or coach' },
  { value: 'professional', label: '💼 Working professional' },
];

const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// ── Tier config ──────────────────────────────────────────────────────────────

const tierConfig: Record<UserTier, { label: string; badge: string; cover: string; ring: string }> = {
  free:     { label: 'Free',     badge: 'bg-slate-500 text-white',    cover: 'from-slate-500 to-slate-700',   ring: 'ring-slate-400' },
  learner:  { label: 'Learner',  badge: 'bg-blue-600 text-white',     cover: 'from-blue-500 to-cyan-600',     ring: 'ring-blue-400' },
  pro:      { label: 'Pro',      badge: 'bg-violet-600 text-white',   cover: 'from-violet-500 to-purple-700', ring: 'ring-violet-400' },
  pro_plus: { label: 'Pro+',     badge: 'bg-amber-500 text-white',    cover: 'from-amber-400 to-orange-600',  ring: 'ring-amber-400' },
  admin:    { label: 'Admin',    badge: 'bg-rose-600 text-white',     cover: 'from-rose-500 to-pink-700',     ring: 'ring-rose-400' },
};

// ── Inline stat row ──────────────────────────────────────────────────────────

const StatRow: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; accent: string }> = ({ icon, label, value, accent }) => (
  <div className={`flex items-center gap-3 p-3 rounded-xl ${accent}`}>
    <div className="flex-shrink-0">{icon}</div>
    <div className="min-w-0">
      <div className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</div>
      <div className="text-lg font-black leading-tight">{value}</div>
    </div>
  </div>
);

// ── Field row ────────────────────────────────────────────────────────────────

const FieldRow: React.FC<{ label: string; display: React.ReactNode; input?: React.ReactNode; editing: boolean }> = ({ label, display, input, editing }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</label>
    {editing && input ? input : display}
  </div>
);

const displayVal = (v: string | null | undefined, fallback = '—') => (
  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-700 dark:text-slate-200 text-sm font-medium border border-transparent">
    {v || <span className="text-slate-400">{fallback}</span>}
  </div>
);

// ── Upload toast ─────────────────────────────────────────────────────────────

const UploadToast: React.FC<{ state: 'uploading' | 'success' | 'error'; message?: string }> = ({ state, message }) => {
  const cfg = {
    uploading: { bg: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300', text: 'Uploading…' },
    success:   { bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300', text: message || 'Photo updated!' },
    error:     { bg: 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-300', text: message || 'Upload failed.' },
  }[state];
  return (
    <div className={`text-xs font-bold px-3 py-2 rounded-lg border ${cfg.bg}`}>{cfg.text}</div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

export const UserProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
      setSaveMessage('Profile updated.');
      setUploadState('idle'); // clear any lingering photo toast so only one message shows
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

  const doUpload = async (fd: FormData) => {
    setUploadState('uploading');
    setUploadMessage('');
    try {
      await authService.updateProfile(fd);
      await refreshUser();
      setUploadState('success');
      setTimeout(() => setUploadState('idle'), 2500);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Upload failed. Try again.';
      setUploadState('error');
      setUploadMessage(msg);
      // Clear local previews on error so we don't show a photo that didn't save
      setAvatarPreview(null);
      setCoverPreview(null);
      setTimeout(() => setUploadState('idle'), 3500);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show local preview immediately — no waiting for server
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    const fd = new FormData();
    fd.append('avatar', file);
    await doUpload(fd);
    e.target.value = '';
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setCoverPreview(localUrl);
    const fd = new FormData();
    fd.append('profile_cover', file);
    await doUpload(fd);
    e.target.value = '';
  };

  const handleRemoveCover = async () => {
    setCoverPreview(null);
    setUploadState('uploading');
    try {
      await authService.updateProfile({ profile_cover: null } as any);
      await refreshUser();
      setUploadState('success');
      setUploadMessage('Cover removed.');
      setTimeout(() => setUploadState('idle'), 2000);
    } catch (err: any) {
      setUploadState('error');
      setUploadMessage(err?.response?.data?.detail || 'Failed to remove cover.');
      setTimeout(() => setUploadState('idle'), 3000);
    }
  };

  if (!user) return null;

  const safeTier: UserTier = (user?.tier && user.tier in tierConfig) ? user.tier : 'free';
  const tier = tierConfig[safeTier];

  const xpInCurrentLevel = user.xp_points % 1000;
  const progressPct = xpInCurrentLevel / 10;
  const xpToNext = 1000 - xpInCurrentLevel;
  const hoursSpent = Math.floor((user.total_time_spent_seconds || 0) / 3600);
  const minutesLeft = Math.floor(((user.total_time_spent_seconds || 0) % 3600) / 60);

  const interestTags = user.interests
    ? String(user.interests).split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const inputCls = 'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white text-sm transition-all';

  // Local previews take priority; fall back to server URL with cache-buster so re-uploads show immediately
  const serverAvatarUrl = user?.avatar ? authService.getMediaUrl(user.avatar) : null;
  const serverCoverUrl = user?.profile_cover ? authService.getMediaUrl(user.profile_cover) : null;
  const avatarUrl = avatarPreview ?? (serverAvatarUrl ? `${serverAvatarUrl}?v=${encodeURIComponent(user?.avatar ?? '')}` : null);
  const coverUrl = coverPreview ?? (serverCoverUrl ? `${serverCoverUrl}?v=${encodeURIComponent(user?.profile_cover ?? '')}` : null);

  return (
    <div className="max-w-6xl mx-auto pb-12 px-4">

      {/* ── Hero: cover + avatar ──────────────────────────────────────────── */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
        {/* Cover photo */}
        <div className="relative h-44">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setCoverPreview(null)}
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-r ${tier.cover}`} />
          )}
          {/* Cover actions */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white text-xs font-semibold backdrop-blur-sm transition-colors flex items-center gap-1.5"
            >
              <CameraIcon className="w-3.5 h-3.5" />
              {coverUrl ? 'Change cover' : 'Add cover'}
            </button>
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
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

          {/* Edit profile button */}
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

        {/* Avatar + name row */}
        <div className="px-6 pb-5">
          {/* Avatar pulls up into the cover */}
          <div className="flex items-end gap-4 -mt-12 sm:-mt-10">
            {/* Avatar */}
            <div className="relative flex-none">
              <label
                className={`block w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 shadow-lg bg-slate-100 dark:bg-slate-900 overflow-hidden ring-2 ${tier.ring} ring-offset-2 ring-offset-white dark:ring-offset-slate-800 cursor-pointer group`}
                title="Change profile photo"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user.username}
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    onError={() => setAvatarPreview(null)}
                  />
                ) : (
                  <UserCircleIcon className="w-full h-full text-slate-300 dark:text-slate-600 group-hover:opacity-70 transition-opacity" />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-full">
                  <CameraIcon className="w-6 h-6 text-white" />
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploadState === 'uploading'} />
              </label>
              {/* Level badge */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md ring-2 ring-white dark:ring-slate-800 pointer-events-none">
                {user.level}
              </div>
            </div>

            {/* Name + username row — bio goes below, not inline */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                  {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.username}
                </h1>
                <span className={`shrink-0 inline-flex px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-widest ${tier.badge}`}>
                  {tier.label}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">@{user.username}</p>
            </div>

            {/* Save/Cancel buttons */}
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

          {/* Bio — on its own row below the avatar+name, contained and styled cleanly */}
          {user.bio && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 max-w-2xl">
              {user.bio}
            </p>
          )}

          {/* Upload / save feedback */}
          <div className="mt-3 flex flex-wrap gap-2">
            {uploadState !== 'idle' && (
              <UploadToast state={uploadState} message={uploadMessage} />
            )}
            {saveMessage && (
              <div className={`text-xs font-bold px-3 py-2 rounded-lg inline-block border ${
                saveState === 'error'
                  ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}>
                {saveMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3-column body ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr_240px] gap-4 items-start">

        {/* ── LEFT: Stats ─────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-2">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Your Stats</h3>
            <StatRow
              icon={<TrophyIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              label="Total XP"
              value={user.xp_points.toLocaleString()}
              accent="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
            />
            <StatRow
              icon={<SparklesIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              label="Level"
              value={user.level}
              accent="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
            />
            <StatRow
              icon={<BookOpenIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
              label="Time Invested"
              value={`${hoursSpent}h ${minutesLeft}m`}
              accent="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
            />
            <StatRow
              icon={<ClockIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
              label="XP to Next Level"
              value={xpToNext}
              accent="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
            />
          </div>

          {/* XP progress bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2">
              <span>Lv {user.level}</span>
              <span>{xpInCurrentLevel} / 1000 XP</span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 text-center">
              {xpToNext} XP to Level {user.level + 1}
            </p>
          </div>
        </div>

        {/* ── CENTER: Profile details ──────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-sm font-black text-slate-800 dark:text-white mb-5 flex items-center gap-2 uppercase tracking-wide">
            {isEditing ? <><PencilIcon className="w-4 h-4 text-indigo-500" /> Editing Profile</> : 'Profile Details'}
          </h2>

          <div className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldRow
                label="First Name" editing={isEditing}
                display={displayVal(user.first_name)}
                input={<input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className={inputCls} placeholder="First name" />}
              />
              <FieldRow
                label="Last Name" editing={isEditing}
                display={displayVal(user.last_name)}
                input={<input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className={inputCls} placeholder="Last name" />}
              />
            </div>

            <FieldRow
              label="Email Address" editing={isEditing}
              display={displayVal(user.email)}
              input={<input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={inputCls} />}
            />

            <FieldRow
              label="Learning Goal" editing={isEditing}
              display={displayVal(user.learning_goal, 'Not set')}
              input={<input type="text" value={formData.learning_goal} onChange={e => setFormData({ ...formData, learning_goal: e.target.value })} placeholder="e.g. school, career, exams, curious" className={inputCls} />}
            />

            <FieldRow
              label="I am a" editing={isEditing}
              display={displayVal(
                LEARNER_TYPE_OPTIONS.find(o => o.value === user.learner_type)?.label
                  ?? (user.learner_type ? String(user.learner_type).replace(/_/g, ' ') : ''),
                'Not set'
              )}
              input={
                <select
                  value={formData.learner_type}
                  onChange={e => setFormData({ ...formData, learner_type: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select your role…</option>
                  {LEARNER_TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              }
            />

            {/* Interests */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Interests</label>
              {isEditing ? (
                <div className="flex flex-wrap gap-2 py-1">
                  {INTEREST_OPTIONS.map(option => {
                    const selected = formData.interests.split(',').map(s => s.trim()).filter(Boolean).includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          const current = formData.interests.split(',').map(s => s.trim()).filter(Boolean);
                          const next = selected
                            ? current.filter(t => t !== option)
                            : [...current, option];
                          setFormData({ ...formData, interests: next.join(', ') });
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                          selected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
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
                        <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold ${colors[i % colors.length]}`}>{tag}</span>
                      );
                    })}
                  </div>
                ) : displayVal('', 'Not set')
              )}
            </div>

            {/* Bio */}
            <FieldRow
              label="About You" editing={isEditing}
              display={
                <div className="px-3 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-700 dark:text-slate-300 text-sm border border-transparent min-h-[72px] whitespace-pre-wrap leading-relaxed">
                  {user.bio || <span className="text-slate-400 italic">Share something about your learning journey…</span>}
                </div>
              }
              input={<textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={4} placeholder="Bio…" className={`${inputCls} resize-none`} />}
            />
          </div>
        </div>

        {/* ── RIGHT: Tier + settings ───────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Tier card */}
          <div className={`bg-gradient-to-br ${tier.cover} rounded-2xl p-5 shadow-sm text-white`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Current Plan</p>
            <p className="text-2xl font-black">{tier.label}</p>
            <p className="text-xs opacity-75 mt-0.5">@{user.username}</p>
          </div>

          {/* Settings card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-4">

            {/* Leaderboard visibility */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">Public Leaderboard</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Show XP &amp; Level in rankings</p>
                </div>
                <button
                  type="button"
                  onClick={() => isEditing && setFormData({ ...formData, show_xp_publicly: !formData.show_xp_publicly })}
                  disabled={!isEditing}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    formData.show_xp_publicly ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                  } ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${formData.show_xp_publicly ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {!isEditing && (
                <p className="text-[10px] text-slate-400 mt-1">
                  {formData.show_xp_publicly ? '✓ Visible to others' : '✗ Hidden'}
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Username</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">@{user.username}</span>
              </div>
              {user.date_joined && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Member since</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {new Date(user.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">XP Points</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{user.xp_points.toLocaleString()}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
