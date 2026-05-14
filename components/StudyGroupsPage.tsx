import React, { useEffect, useRef, useState, useCallback } from 'react';
import apiClient from '../src/services/api';
import { useQueryClient } from '@tanstack/react-query';
import {
  useStudyGroups,
  useCreateStudyGroup,
  useJoinStudyGroup,
  useJoinStudyGroupByToken,
  useLeaveStudyGroup,
  useStudyGroupPosts,
  useCreateStudyGroupPost,
  useUpdateStudyGroupPost,
  useDeleteStudyGroupPost,
  useStudyGroupMembers,
  useInviteStudyGroupMember,
  useStudyGroupChallenges,
  useCreateStudyGroupChallenge,
  useStudyGroupPerformance,
  useUpdateStudyGroup,
  useDeleteStudyGroup,
  useBulkEnroll,
  STUDY_GROUP_KEYS,
} from '../src/hooks/useStudyGroups';
import { useAuth } from '../src/contexts/useAuth';
import { StudyGroup } from '../src/services/studyGroupService';
import { useAssessments } from '../src/hooks/useAssessments';
import { Button } from './ui/Button';
import { UsersIcon } from './icons/UsersIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../src/routes';
import { useToast } from '../src/contexts/ToastContext';
import { useGuestNudge } from '../src/hooks/useGuestNudge';
import { GuestNudge } from './GuestNudge';

// ── Exam Results Modal ───────────────────────────────────────────────────────

interface Submission {
  id: number;
  user: { id: number; username: string; first_name: string; last_name: string };
  status: string;
  score: string;
  percentage: number;
  time_taken_minutes: number | null;
  tab_switches: number;
  submitted_at: string | null;
}

const ExamResultsModal: React.FC<{
  challenge: any;
  onClose: () => void;
  onResultsToggled: () => void;
}> = ({ challenge, onClose, onResultsToggled }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [releasingResults, setReleasingResults] = useState(false);
  const [released, setReleased] = useState(challenge.results_released ?? false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`study-groups/challenges/${challenge.id}/submissions/`);
      setSubmissions(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  }, [challenge.id]);

  useEffect(() => { load(); }, [load]);

  const markWithAI = async (submissionId: number) => {
    setMarkingId(submissionId);
    try {
      await apiClient.post(`assessments/${challenge.assessment}/run-grading/`, { attempt_id: submissionId });
      await load();
    } catch { /* ignore, grading is async */ }
    setMarkingId(null);
  };

  const markAllWithAI = async () => {
    setMarkingAll(true);
    const ungraded = submissions.filter(s => s.status === 'submitted');
    for (const s of ungraded) {
      try { await apiClient.post(`assessments/${challenge.assessment}/run-grading/`, { attempt_id: s.id }); } catch { /* continue */ }
    }
    await load();
    setMarkingAll(false);
  };

  const toggleRelease = async () => {
    setReleasingResults(true);
    try {
      const res = await apiClient.patch(`study-groups/challenges/${challenge.id}/release-results/`);
      setReleased(res.data.results_released);
      onResultsToggled();
    } catch { /* ignore */ }
    setReleasingResults(false);
  };

  const ungradedCount = submissions.filter(s => s.status === 'submitted').length;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{challenge.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex-wrap">
          <div className="flex gap-2">
            {ungradedCount > 0 && (
              <button
                onClick={markAllWithAI}
                disabled={markingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                {markingAll ? 'Marking…' : `Mark All with AI (${ungradedCount})`}
              </button>
            )}
            <button
              onClick={load}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Refresh
            </button>
          </div>
          <button
            onClick={toggleRelease}
            disabled={releasingResults}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              released
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300'
                : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300'
            }`}
          >
            {releasingResults ? 'Updating…' : released ? '✓ Results Published — Hide' : '📤 Publish Results to Students'}
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-rose-600 text-center py-8">{error}</p>
          ) : submissions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No submissions yet.</p>
          ) : (
            <div className="space-y-2">
              {submissions.map((s, i) => {
                const name = [s.user.first_name, s.user.last_name].filter(Boolean).join(' ') || s.user.username;
                const pct = s.percentage != null ? Math.round(Number(s.percentage)) : null;
                const isGraded = s.status === 'graded';
                return (
                  <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-black flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{name}</p>
                      <p className="text-xs text-slate-500">@{s.user.username}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {s.tab_switches > 0 && (
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                          ⚠️ {s.tab_switches} tab switch{s.tab_switches !== 1 ? 'es' : ''}
                        </span>
                      )}
                      {isGraded && pct != null ? (
                        <span className={`text-sm font-black px-2.5 py-0.5 rounded-lg ${
                          pct >= 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : pct >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                        }`}>
                          {pct}%
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                          {s.status === 'submitted' ? 'Awaiting mark' : s.status}
                        </span>
                      )}
                      {s.status === 'submitted' && (
                        <button
                          onClick={() => markWithAI(s.id)}
                          disabled={markingId === s.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-semibold disabled:opacity-50"
                        >
                          <SparklesIcon className="w-3 h-3" />
                          {markingId === s.id ? '…' : 'Mark'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ranked results preview (if released) */}
        {released && submissions.filter(s => s.status === 'graded').length > 0 && (
          <div className="px-6 pb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Ranked Results (visible to students)</h3>
            <div className="space-y-2">
              {[...submissions]
                .filter(s => s.status === 'graded')
                .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))
                .map((s, i) => {
                  const name = [s.user.first_name, s.user.last_name].filter(Boolean).join(' ') || s.user.username;
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <span className="text-lg w-6 text-center">{medals[i] ?? `#${i + 1}`}</span>
                      <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{name}</span>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{Math.round(Number(s.percentage))}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

interface StudyGroupsPageProps {
  isGuest?: boolean;
  onGuestBlock?: (action: string) => void;
}

export const StudyGroupsPage: React.FC<StudyGroupsPageProps> = ({ isGuest = false, onGuestBlock }) => {
  const { guardAction, nudgeProps } = useGuestNudge();
  const navigate = useNavigate();
  const toast = useToast();
  const location = useLocation();
  const { user } = useAuth();
  const { data: groupsData, isLoading } = useStudyGroups();
  const createGroupMutation = useCreateStudyGroup();
  const joinGroupMutation = useJoinStudyGroup();
  const joinGroupByTokenMutation = useJoinStudyGroupByToken();
  const leaveGroupMutation = useLeaveStudyGroup();
  const updateGroupMutation = useUpdateStudyGroup();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // State for detailed group view
  const [activeGroup, setActiveGroup] = useState<StudyGroup | null>(null);
  const [groupTab, setGroupTab] = useState<'overview' | 'members' | 'leaderboard' | 'events' | 'invites'>('overview');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [challengeStart, setChallengeStart] = useState('');
  const [challengeEnd, setChallengeEnd] = useState('');
  const [createChallengeExpanded, setCreateChallengeExpanded] = useState(false);
  const [challengeExamMode, setChallengeExamMode] = useState(false);
  const [examResultsChallenge, setExamResultsChallenge] = useState<any | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  type PostTab = { id: number; content: string; author: string; created_at: string };
  const [openPostTabs, setOpenPostTabs] = useState<PostTab[]>([]);
  const [activeRightPanel, setActiveRightPanel] = useState<'session' | number>('session');

  const openPostInPanel = (post: { id: number; content: string; author?: { username?: string }; created_at: string }) => {
    const tab: PostTab = { id: post.id, content: post.content, author: (post.author as any)?.username ?? 'Someone', created_at: post.created_at };
    setOpenPostTabs(prev => prev.find(t => t.id === post.id) ? prev : [...prev, tab]);
    setActiveRightPanel(post.id);
  };

  const closePostTab = (postId: number) => {
    setOpenPostTabs(prev => prev.filter(t => t.id !== postId));
    setActiveRightPanel(prev => prev === postId ? 'session' : prev);
  };

  const createPostMutation = useCreateStudyGroupPost();
  const updatePostMutation = useUpdateStudyGroupPost();
  const deletePostMutation = useDeleteStudyGroupPost();
  const deleteGroupMutation = useDeleteStudyGroup();
  const inviteMemberMutation = useInviteStudyGroupMember();
  const createChallengeMutation = useCreateStudyGroupChallenge();
  const bulkEnrollMutation = useBulkEnroll();
  const [bulkCount, setBulkCount] = useState('10');
  const [bulkPrefix, setBulkPrefix] = useState('');
  const [bulkResults, setBulkResults] = useState<{ username: string; password: string }[] | null>(null);
  const { data: assessmentsData = [] } = useAssessments();

  const activeGroupId = activeGroup?.id;
  const { data: groupPosts = [], isLoading: postsLoading } = useStudyGroupPosts(
    activeGroupId ? Number(activeGroupId) : 0
  );
  const { data: members = [], isLoading: membersLoading } = useStudyGroupMembers(
    activeGroupId ? Number(activeGroupId) : 0
  );
  const { data: challengesData = [] } = useStudyGroupChallenges(
    activeGroupId ? Number(activeGroupId) : 0
  );
  const { data: performanceData = [], isLoading: performanceLoading } = useStudyGroupPerformance(
    activeGroupId ? Number(activeGroupId) : 0
  );
  const [pendingJoinGroupId, setPendingJoinGroupId] = useState<number | null>(null);
  const [pendingJoinToken, setPendingJoinToken] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const queryClient = useQueryClient();

  // Track processed join requests to prevent infinite loops
  const processedTokens = React.useRef<Set<string>>(new Set());
  const processedGroupIds = React.useRef<Set<number>>(new Set());

  const normalizedPosts = Array.isArray(groupPosts)
    ? groupPosts
    : (groupPosts && (groupPosts as any).results && Array.isArray((groupPosts as any).results)
      ? (groupPosts as any).results
      : []);

  const normalizedMembers = Array.isArray(members)
    ? members
    : (members && (members as any).results && Array.isArray((members as any).results)
      ? (members as any).results
      : []);

  const normalizedChallenges = Array.isArray(challengesData)
    ? challengesData
    : (challengesData && (challengesData as any).results && Array.isArray((challengesData as any).results)
      ? (challengesData as any).results
      : []);

  const normalizedPerformance = Array.isArray(performanceData)
    ? performanceData
    : (performanceData && (performanceData as any).results && Array.isArray((performanceData as any).results)
      ? (performanceData as any).results
      : []);

  const normalizedAssessments = Array.isArray(assessmentsData)
    ? assessmentsData
    : (assessmentsData && (assessmentsData as any).results && Array.isArray((assessmentsData as any).results)
      ? (assessmentsData as any).results
      : []);
  const [assessmentTypeFilter, setAssessmentTypeFilter] = useState<'all' | 'quiz' | 'exam'>('all');
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [assessmentPickerOpen, setAssessmentPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const filteredAssessmentsForChallenges = normalizedAssessments.filter((a: any) => {
    if (assessmentTypeFilter !== 'all') {
      const kind = (a.assessment_type as 'quiz' | 'exam' | undefined) || 'exam';
      if (kind !== assessmentTypeFilter) return false;
    }
    if (assessmentSearch.trim()) {
      return a.title?.toLowerCase().includes(assessmentSearch.trim().toLowerCase());
    }
    return true;
  });

  // Normalize groups data: backend may return either an array or a paginated object
  const groups: StudyGroup[] = Array.isArray(groupsData)
    ? groupsData
    : (groupsData && (groupsData as any).results && Array.isArray((groupsData as any).results)
      ? (groupsData as any).results
      : []);

  const userTier: string = (user as any)?.tier ?? 'free';
  const userCreatedGroups = groups.filter(g => user && g.creator && g.creator.id === user.id);
  const userMemberGroups = groups.filter(g => g.is_member);

  // Tier create limits: free=0, starter=3, pro/admin=unlimited
  const CREATE_LIMITS: Record<string, number | null> = { free: 0, starter: 3, pro: null, admin: null };
  // Tier join limits: free=2, starter=7, pro/admin=unlimited
  const JOIN_LIMITS: Record<string, number | null>   = { free: 2, starter: 7, pro: null, admin: null };

  const createLimit = CREATE_LIMITS[userTier] ?? 0;
  const joinLimit   = JOIN_LIMITS[userTier] ?? null;

  const canCreate  = (user as any)?.is_staff || (createLimit === null) || (createLimit > 0 && userCreatedGroups.length < createLimit);
  const atCreateLimit = !canCreate;
  const atJoinLimit   = joinLimit !== null && userMemberGroups.length >= joinLimit && !(user as any)?.is_staff;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createGroupMutation.mutateAsync({ name, description });
      setName('');
      setDescription('');
      setIsCreateOpen(false);
      toast.success('Study group created!');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create group.');
      setIsCreateOpen(false);
    }
  };

  const handleJoinToggle = (group: StudyGroup, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (guardAction('join a study group — you need an account so the group can track you')) return;
    if (group.is_member) {
      leaveGroupMutation.mutate(Number(group.id));
    } else {
      joinGroupMutation.mutate(Number(group.id));
    }
  };

  const handleVisibilityToggle = async (group: StudyGroup, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isOwner = user && group.creator && user.id === group.creator.id;
    if (!isOwner) {
      return;
    }

    const nextIsPublic = !group.is_public;
    const message = nextIsPublic
      ? 'Make this group public? It will be easier for others to discover and join.'
      : 'Make this group private? New members will only be able to join if you invite them directly or share a link.';

    const confirmed = window.confirm(message);
    if (!confirmed) return;

    try {
      await updateGroupMutation.mutateAsync({
        id: group.id,
        payload: { is_public: nextIsPublic },
      });
    } catch (err) {
      console.error('Failed to update group visibility', err);
      toast.error('Could not update group visibility. Please try again.');
    }
  };

  const enterGroup = (group: StudyGroup) => {
    setActiveGroup(group);
    setGroupTab('overview');
    navigate(ROUTES.studyGroupDetail(Number(group.id)), { replace: true });
  };

  const handleCreateChallenge = async () => {
    if (!activeGroupId || !challengeTitle.trim()) return;
    try {
      await createChallengeMutation.mutateAsync({
        group: Number(activeGroupId),
        title: challengeTitle.trim(),
        description: challengeDescription.trim() || undefined,
        assessment: selectedAssessmentId ? Number(selectedAssessmentId) : null,
        start_date: challengeStart || undefined,
        end_date: challengeEnd || null,
        exam_mode: challengeExamMode,
      });
      setChallengeTitle('');
      setChallengeDescription('');
      setSelectedAssessmentId('');
      setChallengeStart('');
      setChallengeEnd('');
      setChallengeExamMode(false);
      setCreateChallengeExpanded(false);
      toast.success('Challenge created!');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create challenge. Only group creators can do this.');
    }
  };

  // Close assessment picker when clicking outside
  useEffect(() => {
    if (!assessmentPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setAssessmentPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [assessmentPickerOpen]);

  // Resolve group id from URL: either ?join_group=1 or /study-groups/1 (legacy)
  // OR: ?join_token=abcd1234 (new token-based invite)
  const urlGroupId = (() => {
    const params = new URLSearchParams(location.search || '');
    const fromQuery = params.get('join_group');
    if (fromQuery) {
      const n = Number(fromQuery);
      if (!Number.isNaN(n) && n > 0) return n;
    }
    const pathMatch = location.pathname.match(/^\/study-groups\/(\d+)$/);
    if (pathMatch) {
      const n = parseInt(pathMatch[1], 10);
      if (n > 0) return n;
    }
    return null;
  })();

  const urlInviteToken = (() => {
    const params = new URLSearchParams(location.search || '');
    const token = params.get('join_token');
    return token || null;
  })();

  // Handle token-based invite: join_token query param
  useEffect(() => {
    const token = urlInviteToken;
    if (!token) return;
    if (!user) return; // wait until user is logged in

    // Guard: don't process the same token more than once per mount
    if (processedTokens.current.has(token)) return;
    if (pendingJoinToken === token) return;

    setJoinMessage(null);
    setPendingJoinToken(token);
    processedTokens.current.add(token);

    joinGroupByTokenMutation
      .mutateAsync(token)
      .then(async (result) => {
        await queryClient.refetchQueries({ queryKey: STUDY_GROUP_KEYS.lists() });
        const groupId = result.group_id;
        setJoinMessage({
          type: 'success',
          text: "You've joined this study group. The group will open below.",
        });
        const targetPath = ROUTES.studyGroupDetail(groupId);
        if (location.pathname !== targetPath) {
          navigate(targetPath, { replace: true });
        }
      })
      .catch((err: any) => {
        console.error('Failed to join group via token', err);
        const detail = err?.response?.data?.detail;
        setJoinMessage({
          type: 'error',
          text:
            typeof detail === 'string'
              ? detail
              : 'Could not join this group. Please try again or open the link when you have a stable connection.',
        });
        // Do NOT reset pendingJoinToken here, as it would cause the effect to re-run if token is still in URL
        navigate(ROUTES.studyGroups, { replace: true });
      });
  }, [urlInviteToken, user, joinGroupByTokenMutation, pendingJoinToken, queryClient, navigate, location.pathname]);

  // Remove the problematic auto-open effect for tokens that was resetting the guard


  // Handle invite-by-URL: join_group query param or /study-groups/:id path
  useEffect(() => {
    const idNum = urlGroupId;
    if (!idNum) return;
    if (!user) return; // wait until user is logged in

    // Guard: don't process the same group ID join more than once per mount
    if (processedGroupIds.current.has(idNum)) return;

    const targetPath = ROUTES.studyGroupDetail(idNum);

    // If we're already on this group's page and it is active, avoid re-running
    if (location.pathname === targetPath && activeGroup && Number(activeGroup.id) === idNum) {
      processedGroupIds.current.add(idNum); // Mark as done since we are already there
      return;
    }

    const group = groups.find((g) => Number(g.id) === idNum);
    if (group?.is_member) {
      setActiveGroup(group);
      setGroupTab('overview');
      setJoinMessage(null);
      processedGroupIds.current.add(idNum);
      if (location.pathname !== targetPath) {
        navigate(targetPath, { replace: true });
      }
      return;
    }

    if (pendingJoinGroupId === idNum) return;

    setJoinMessage(null);
    setPendingJoinGroupId(idNum);
    processedGroupIds.current.add(idNum);

    joinGroupMutation
      .mutateAsync(idNum)
      .then(async () => {
        await queryClient.refetchQueries({ queryKey: STUDY_GROUP_KEYS.lists() });
        setJoinMessage({ type: 'success', text: "You've joined this study group. The group will open below." });
        if (location.pathname !== targetPath) {
          navigate(targetPath, { replace: true });
        }
      })
      .catch((err: any) => {
        console.error('Failed to join group from invite link', err);
        const detail = err?.response?.data?.detail;
        setJoinMessage({
          type: 'error',
          text: typeof detail === 'string' ? detail : 'Could not join this group. Please try again or open the link when you have a stable connection.',
        });
        // Do NOT reset pendingJoinGroupId here
        navigate(ROUTES.studyGroups, { replace: true });
      });
  }, [urlGroupId, user, groups, joinGroupMutation, pendingJoinGroupId, queryClient, navigate, location.pathname, activeGroup]);


  // If a group is active, render the detailed dashboard
  if (activeGroup) {
    const isMember = activeGroup.is_member || (user && activeGroup.creator && user.id === activeGroup.creator.id);

    if (!isMember) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden max-w-4xl mx-auto my-12 text-center">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6">
            <UsersIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">Membership Required</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
            You've reached <span className="font-bold text-slate-800 dark:text-slate-200">{activeGroup.name}</span>.
            Join this group to participate in discussions, take on challenges, and collaborate with other learners.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button
              variant="secondary"
              className="px-8"
              onClick={() => {
                setActiveGroup(null);
                navigate(ROUTES.studyGroups);
              }}
            >
              Back to All Groups
            </Button>
            <Button
              variant="primary"
              className="px-8 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none"
              onClick={() => handleJoinToggle(activeGroup)}
              disabled={joinGroupMutation.isPending}
            >
              {joinGroupMutation.isPending ? 'Joining...' : 'Join Group Now'}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        {joinMessage && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 flex items-center justify-between gap-3 ${joinMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
          >
            <p className="text-sm font-medium">{joinMessage.text}</p>
            <button type="button" onClick={() => setJoinMessage(null)} className="shrink-0 px-3 py-1.5 rounded-md border border-current opacity-80 hover:opacity-100 text-sm font-medium">
              Dismiss
            </button>
          </div>
        )}
        <button
          onClick={() => {
            setActiveGroup(null);
            navigate(ROUTES.studyGroups);
          }}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 mb-4 w-fit"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          Back to All Groups
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col flex-1">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">{activeGroup.name}</h1>
                <p className="opacity-90 max-w-2xl">{activeGroup.description}</p>
                <div className="flex gap-4 mt-4 text-sm font-medium">
                  <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                    <UsersIcon className="w-4 h-4" /> {activeGroup.member_count} Members
                  </span>
                  {activeGroup.course_title && (
                    <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                      <BookOpenIcon className="w-4 h-4" /> {activeGroup.course_title}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => { handleJoinToggle(activeGroup); setActiveGroup(null); }}>
                Leave Group
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex overflow-x-auto scrollbar-hide px-4 sm:px-6 gap-1 sm:gap-4">
              {(['overview', 'members', 'leaderboard', 'events', 'invites'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setGroupTab(tab as any); setInviteStatus(null); }}
                  className={`flex-shrink-0 py-3.5 px-3 sm:px-1 text-sm font-semibold border-b-2 transition-colors capitalize whitespace-nowrap ${groupTab === tab
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/30">
            {groupTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-6 h-full">
                {/* ── LEFT: Discussion board ── */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
                    <SparklesIcon className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Discussion Board</h3>
                    <span className="ml-auto text-xs text-slate-400">{normalizedPosts.length} post{normalizedPosts.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Composer */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Start a new discussion…"
                      rows={2}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                    <Button
                      onClick={async () => {
                        const content = newPostContent.trim();
                        if (!content) return;
                        await createPostMutation.mutateAsync({ groupId: activeGroup.id, content });
                        setNewPostContent('');
                      }}
                      disabled={!newPostContent.trim() || createPostMutation.isPending}
                      variant="primary"
                      size="sm"
                      className="mt-2"
                    >
                      {createPostMutation.isPending ? 'Posting...' : 'Post'}
                    </Button>
                  </div>

                  {/* Post list */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {postsLoading ? (
                      <p className="text-sm text-slate-500 p-4">Loading discussions...</p>
                    ) : normalizedPosts.length === 0 ? (
                      <p className="text-sm text-slate-500 p-4">No posts yet. Start the first discussion.</p>
                    ) : (
                      normalizedPosts.map((post: { id: number; content: string; author?: { id?: number; username?: string }; created_at: string }) => (
                        <div key={post.id} className="group relative">
                          {editingPostId === post.id ? (
                            <div className="p-3">
                              <textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                rows={3}
                                className="w-full px-2 py-1 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                              />
                              <div className="flex gap-2 mt-2">
                                <Button size="sm" variant="primary"
                                  onClick={async () => {
                                    if (!editingContent.trim()) return;
                                    await updatePostMutation.mutateAsync({ postId: post.id, content: editingContent.trim() });
                                    setEditingPostId(null); setEditingContent('');
                                  }}
                                  disabled={updatePostMutation.isPending}
                                >Save</Button>
                                <Button size="sm" variant="secondary" onClick={() => { setEditingPostId(null); setEditingContent(''); }}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors cursor-pointer"
                              onClick={() => openPostInPanel(post)}
                            >
                              <p className="text-sm text-slate-800 dark:text-slate-200 line-clamp-2 font-medium">{post.content}</p>
                              <div className="flex items-center justify-between mt-1.5">
                                <p className="text-xs text-slate-400">
                                  {(post.author as any)?.username ?? 'Someone'} · {new Date(post.created_at).toLocaleDateString()}
                                </p>
                                {user && post.author && (post.author as any).id === user.id && (
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                    <button type="button" onClick={() => { setEditingPostId(post.id); setEditingContent(post.content); }} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                                    <button type="button" onClick={async () => { if (window.confirm('Delete this post?')) await deletePostMutation.mutateAsync({ postId: post.id, groupId: activeGroup.id }); }} className="text-xs text-rose-600 hover:underline" disabled={deletePostMutation.isPending}>Delete</button>
                                  </div>
                                )}
                              </div>
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 dark:text-indigo-700 opacity-0 group-hover:opacity-100 text-xs transition-opacity">Open →</span>
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ── RIGHT: Tabbed panel ── */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden mt-4 lg:mt-0">
                  {/* Tab bar */}
                  <div className="flex items-center gap-0 border-b border-slate-200 dark:border-slate-700 overflow-x-auto flex-shrink-0 bg-slate-50 dark:bg-slate-900/40">
                    {/* Fixed: Next Session tab */}
                    <button
                      type="button"
                      onClick={() => setActiveRightPanel('session')}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                        activeRightPanel === 'session'
                          ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800'
                          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      Next Session
                    </button>
                    {/* Dynamic post tabs */}
                    {openPostTabs.map(tab => (
                      <div key={tab.id} className={`flex-shrink-0 flex items-center gap-1 pl-3 pr-1 py-3 border-b-2 transition-colors ${
                        activeRightPanel === tab.id
                          ? 'border-indigo-500 bg-white dark:bg-slate-800'
                          : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}>
                        <button
                          type="button"
                          onClick={() => setActiveRightPanel(tab.id)}
                          className={`text-xs font-medium max-w-[120px] truncate ${activeRightPanel === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                          title={tab.content}
                        >
                          {tab.author}: {tab.content.slice(0, 20)}{tab.content.length > 20 ? '…' : ''}
                        </button>
                        <button
                          type="button"
                          onClick={() => closePostTab(tab.id)}
                          className="ml-1 w-4 h-4 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Panel content */}
                  <div className="flex-1 overflow-y-auto p-5">
                    {activeRightPanel === 'session' ? (
                      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                        <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No upcoming sessions</p>
                        <p className="text-xs text-slate-400 mt-1">Once events are scheduled, they will appear here.</p>
                      </div>
                    ) : (
                      (() => {
                        const post = openPostTabs.find(t => t.id === activeRightPanel);
                        if (!post) return null;
                        return (
                          <div>
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {post.author.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{post.author}</p>
                                <p className="text-[10px] text-slate-400">{new Date(post.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {openPostTabs.length === 0 && activeRightPanel === 'session' && (
                    <div className="px-5 pb-4 text-xs text-slate-400 text-center">
                      Click any post on the left to open it here
                    </div>
                  )}
                </div>
              </div>
            )}

            {groupTab === 'members' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {membersLoading ? (
                  <div className="p-6 text-sm text-slate-500">Loading members...</div>
                ) : normalizedMembers.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500">No members found for this group.</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {normalizedMembers.map(m => (
                        <tr key={m.id}>
                          <td className="px-6 py-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 flex items-center justify-center font-bold text-xs">
                              {m.username.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium">{m.username}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {groupTab === 'leaderboard' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                      <TrophyIcon className="w-5 h-5 text-amber-500" />
                      Group Rankings
                    </h3>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ranked by Total XP</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                    <LightbulbIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-indigo-800/80 dark:text-indigo-200/80 leading-relaxed">
                      <strong>How this works:</strong> XP shown here is exclusively earned by interacting with material inside this study group. Any XP you earn here will also be added to your overall global leaderboard progress!
                    </p>
                  </div>
                </div>
                {membersLoading ? (
                  <div className="p-6 text-sm text-slate-500">Loading rankings...</div>
                ) : normalizedMembers.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500">No data available.</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {normalizedMembers
                      .slice()
                      .sort((a, b) => (b.xp_points || 0) - (a.xp_points || 0))
                      .map((m, i) => (
                        <div key={m.id} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex-shrink-0 w-7 text-center font-black text-slate-400 text-sm">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                            {m.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-sm">
                              {m.username}
                            </p>
                            <p className="text-xs font-semibold text-slate-500">
                              Level {m.level || 1}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-black text-indigo-600 dark:text-indigo-400">
                              {(m.xp_points || 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">XP</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <div className="border-t border-slate-200 dark:border-slate-700 mt-4">
                  <div className="p-4 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">
                      Assessment Performance in this Group
                    </h3>
                    <span className="text-xs text-slate-500">
                      Based on graded attempts for linked challenges
                    </span>
                  </div>
                  {performanceLoading ? (
                    <div className="p-6 text-sm text-slate-500">Loading assessment performance...</div>
                  ) : normalizedPerformance.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500">
                      No graded attempts yet for assessments linked to this group.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 text-xs uppercase font-semibold sticky top-0">
                          <tr>
                            <th className="px-4 py-2">Student</th>
                            <th className="px-4 py-2">Attempts</th>
                            <th className="px-4 py-2">Avg %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {normalizedPerformance.map((row: any) => (
                            <tr key={row.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 flex-shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                    {String(row.username || '').substring(0, 2).toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                                    {row.full_name || row.username}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{row.attempt_count}</td>
                              <td className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-200">
                                {typeof row.average_percentage === 'number' ? `${row.average_percentage.toFixed(1)}%` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
            {groupTab === 'events' && (
              <div className="space-y-6">
                {user && activeGroup.creator && user.id === activeGroup.creator.id && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCreateChallengeExpanded((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <ClockIcon className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                      Create Group Challenge
                    </h3>
                    <ChevronDownIcon
                      className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform duration-200 ${createChallengeExpanded ? 'rotate-180' : ''
                        }`}
                    />
                  </button>
                  {createChallengeExpanded && (
                    <div className="px-6 pb-6 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-5">
                      {/* Title */}
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Challenge Title <span className="text-rose-400">*</span></label>
                        <input
                          value={challengeTitle}
                          onChange={(e) => setChallengeTitle(e.target.value)}
                          placeholder="e.g. Weekend Biology Sprint"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition text-sm"
                        />
                      </div>

                      {/* Assessment Picker */}
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Linked Assessment <span className="text-slate-400 font-normal text-xs">(optional)</span>
                        </label>

                        {/* Selected chip */}
                        {selectedAssessmentId ? (() => {
                          const sel = normalizedAssessments.find((a: any) => String(a.id) === selectedAssessmentId);
                          if (!sel) return null;
                          const qCount = sel.question_count ?? sel.questions?.length ?? 0;
                          const isExam = sel.assessment_type === 'exam';
                          return (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700">
                              <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isExam ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'}`}>
                                {isExam ? 'E' : 'Q'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{sel.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{isExam ? 'Exam' : 'Quiz'}{qCount ? ` · ${qCount} questions` : ''}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedAssessmentId('')}
                                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                                aria-label="Remove assessment"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          );
                        })() : (
                          /* Picker trigger + dropdown */
                          <div className="relative" ref={pickerRef}>
                            <button
                              type="button"
                              onClick={() => setAssessmentPickerOpen(o => !o)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm"
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              <span>Search and link an assessment…</span>
                            </button>

                            {assessmentPickerOpen && (
                              <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                                {/* Search input */}
                                <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                                  <div className="relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    <input
                                      autoFocus
                                      value={assessmentSearch}
                                      onChange={(e) => setAssessmentSearch(e.target.value)}
                                      placeholder="Search assessments…"
                                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
                                    />
                                  </div>
                                </div>

                                {/* Type filter tabs */}
                                <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                                  {(['all', 'quiz', 'exam'] as const).map(tab => (
                                    <button
                                      key={tab}
                                      type="button"
                                      onClick={() => setAssessmentTypeFilter(tab)}
                                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${assessmentTypeFilter === tab ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                    >
                                      {tab === 'all' ? 'All' : tab === 'quiz' ? 'Quizzes' : 'Exams'}
                                    </button>
                                  ))}
                                  <span className="ml-auto text-xs text-slate-400">{filteredAssessmentsForChallenges.length} result{filteredAssessmentsForChallenges.length !== 1 ? 's' : ''}</span>
                                </div>

                                {/* Results list */}
                                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedAssessmentId(''); setAssessmentPickerOpen(false); setAssessmentSearch(''); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                    </div>
                                    <span className="italic">No assessment — open challenge</span>
                                  </button>

                                  {filteredAssessmentsForChallenges.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-sm text-slate-400">
                                      <svg className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                      No assessments match "{assessmentSearch}"
                                    </div>
                                  ) : filteredAssessmentsForChallenges.map((assessment: any) => {
                                    const qCount = assessment.question_count ?? assessment.questions?.length ?? 0;
                                    const isExam = assessment.assessment_type === 'exam';
                                    return (
                                      <button
                                        key={assessment.id}
                                        type="button"
                                        onClick={() => { setSelectedAssessmentId(String(assessment.id)); setAssessmentPickerOpen(false); setAssessmentSearch(''); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group"
                                      >
                                        <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isExam ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'}`}>
                                          {isExam ? 'E' : 'Q'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">{assessment.title}</p>
                                          <p className="text-xs text-slate-400">{isExam ? 'Exam' : 'Quiz'}{qCount ? ` · ${qCount} questions` : ''}</p>
                                        </div>
                                        <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Date range */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Starts</label>
                          <input
                            value={challengeStart}
                            onChange={(e) => setChallengeStart(e.target.value)}
                            type="datetime-local"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Ends</label>
                          <input
                            value={challengeEnd}
                            onChange={(e) => setChallengeEnd(e.target.value)}
                            type="datetime-local"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition text-sm"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Description <span className="text-slate-400 font-normal text-xs">(optional)</span></label>
                        <textarea
                          value={challengeDescription}
                          onChange={(e) => setChallengeDescription(e.target.value)}
                          placeholder="What's this challenge about? Any special rules or goals?"
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition text-sm resize-none"
                        />
                      </div>

                      {/* Exam mode toggle */}
                      <button
                        type="button"
                        onClick={() => setChallengeExamMode(v => !v)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                          challengeExamMode
                            ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20'
                            : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/30 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">🔒</span>
                          <div className="text-left">
                            <div className={`text-sm font-bold ${challengeExamMode ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'}`}>
                              Exam Mode
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Disables AI hints, logs tab switches, teacher controls results
                            </div>
                          </div>
                        </div>
                        <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${challengeExamMode ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${challengeExamMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                      </button>

                      <Button
                        onClick={handleCreateChallenge}
                        disabled={createChallengeMutation.isPending || !challengeTitle.trim()}
                        className="w-full"
                      >
                        {createChallengeMutation.isPending ? 'Creating…' : 'Create Challenge'}
                      </Button>
                    </div>
                  )}
                </div>
                )}

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold mb-4">Active Challenges</h3>
                  {normalizedChallenges.length === 0 ? (
                    <p className="text-sm text-slate-500">No challenges yet for this group.</p>
                  ) : (
                    <div className="space-y-3">
                      {normalizedChallenges.map((challenge: any) => {
                        const isGroupCreator = user && activeGroup?.creator && user.id === activeGroup.creator.id;
                        return (
                          <div key={challenge.id} className={`p-4 rounded-xl border ${challenge.exam_mode ? 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="font-bold text-slate-800 dark:text-white">{challenge.title}</p>
                                  {challenge.exam_mode && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-700">
                                      🔒 Exam Mode
                                    </span>
                                  )}
                                  {challenge.exam_mode && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                                      challenge.results_released
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
                                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700'
                                    }`}>
                                      {challenge.results_released ? '✓ Results published' : '⏳ Results pending'}
                                    </span>
                                  )}
                                </div>
                                {challenge.assessment_title && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">Assessment: {challenge.assessment_title}</p>
                                )}
                                {challenge.description && (
                                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{challenge.description}</p>
                                )}
                                <p className="text-xs text-slate-400 mt-1">
                                  {challenge.start_date ? new Date(challenge.start_date).toLocaleString() : 'Anytime'}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                {challenge.assessment && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => navigate(`/assessments/${challenge.assessment}`)}
                                  >
                                    Open
                                  </Button>
                                )}
                                {isGroupCreator && challenge.exam_mode && challenge.assessment && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setExamResultsChallenge(challenge)}
                                  >
                                    📋 Submissions
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {groupTab === 'invites' && (
              <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold mb-2">Invite Friends</h3>
                <p className="text-slate-500 mb-6">Grow your study group by inviting peers to join.</p>

                <div className="mb-8">
                  <label className="block text-sm font-medium mb-2">Share invite link</label>
                  <p className="text-xs text-slate-500 mb-2">
                    Share this link with anyone to let them join <span className="font-semibold">{activeGroup.name}</span> instantly.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={(() => {
                        const base = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
                        const token = activeGroup.invite_token || '';
                        return token ? `${base}/invite?t=${token}` : '';
                      })()}
                      className="flex-1 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-500"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      onClick={async () => {
                        if (!activeGroup.invite_token) {
                          toast.error('Invite token not available. Please refresh the page.');
                          return;
                        }
                        const base = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
                        const url = `${base}/invite?t=${activeGroup.invite_token}`;
                        try {
                          if (navigator.clipboard && window.isSecureContext) {
                            await navigator.clipboard.writeText(url);
                            toast.success('Invite link copied!');
                          } else {
                            const textarea = document.createElement('textarea');
                            textarea.value = url;
                            textarea.style.position = 'fixed';
                            textarea.style.left = '-9999px';
                            document.body.appendChild(textarea);
                            textarea.focus();
                            textarea.select();
                            const ok = document.execCommand('copy');
                            document.body.removeChild(textarea);
                            if (ok) toast.success('Invite link copied!');
                            else toast.error('Copy failed — please copy the link manually.');
                          }
                        } catch {
                          toast.error('Copy failed — please copy the link manually.');
                        }
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Anyone who opens this link while signed in will be added to this group and taken straight here. If they are not signed in, they will be asked to log in first.
                  </p>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                  <label className="block text-sm font-medium mb-2">Invite by email (existing EduReach account)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="email"
                      placeholder="friend@university.edu"
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); setInviteStatus(null); }}
                      onKeyDown={(e) => e.key === 'Enter' && inviteEmail && !inviteMemberMutation.isPending && (e.currentTarget.form as any)?.requestSubmit?.()}
                      className="flex-1 p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <Button
                      disabled={!inviteEmail || inviteMemberMutation.isPending}
                      onClick={async () => {
                        if (!inviteEmail) return;
                        setInviteStatus(null);
                        try {
                          await inviteMemberMutation.mutateAsync({ groupId: activeGroup.id, email: inviteEmail });
                          setInviteStatus({ type: 'success', message: 'Added! They will see this group in their Study Groups list.' });
                          setInviteEmail('');
                        } catch (err: any) {
                          const detail = err?.response?.data?.detail;
                          setInviteStatus({ type: 'error', message: detail || 'No EduReach account found with that email.' });
                        }
                      }}
                    >
                      {inviteMemberMutation.isPending ? 'Adding…' : 'Add to group'}
                    </Button>
                  </div>
                  {inviteStatus && (
                    <p className={`mt-2 text-sm font-medium ${inviteStatus.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {inviteStatus.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    This does not send an external email yet. It simply adds an existing EduReach user (matched by email) into this group.
                  </p>
                </div>

                {/* ── Bulk enroll (creator only) ──────────────────────────── */}
                {user && activeGroup.creator && user.id === activeGroup.creator.id && (
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-6 mt-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">⚡</span>
                      <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">Bulk Enroll (Contest Mode)</h4>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                      Create temporary accounts for contest participants. Distribute the credentials to participants — they log in with username + password.
                    </p>
                    <div className="flex flex-wrap gap-3 mb-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Username prefix</label>
                        <input
                          type="text"
                          placeholder="e.g. imo2025"
                          value={bulkPrefix}
                          onChange={(e) => setBulkPrefix(e.target.value.replace(/[^a-z0-9_-]/gi, ''))}
                          maxLength={20}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm w-40"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Number of accounts (max 200)</label>
                        <input
                          type="number"
                          min={1}
                          max={200}
                          value={bulkCount}
                          onChange={(e) => setBulkCount(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm w-28"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          disabled={bulkEnrollMutation.isPending || !bulkPrefix.trim() || Number(bulkCount) < 1 || Number(bulkCount) > 200}
                          onClick={async () => {
                            try {
                              const result = await bulkEnrollMutation.mutateAsync({
                                groupId: activeGroup.id,
                                count: Number(bulkCount),
                                prefix: bulkPrefix.trim(),
                              });
                              setBulkResults(result.accounts);
                              toast.success(`Created ${result.created} accounts!`);
                            } catch (err: any) {
                              const detail = err?.response?.data?.detail;
                              toast.error(typeof detail === 'string' ? detail : 'Bulk enroll failed.');
                            }
                          }}
                        >
                          {bulkEnrollMutation.isPending ? 'Creating…' : 'Create Accounts'}
                        </Button>
                      </div>
                    </div>
                    {bulkResults && bulkResults.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {bulkResults.length} accounts created — share these credentials:
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const text = bulkResults.map(a => `${a.username}\t${a.password}`).join('\n');
                              navigator.clipboard?.writeText(text).then(() => toast.success('Copied to clipboard!'));
                            }}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            Copy all (TSV)
                          </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                              <tr>
                                <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Username</th>
                                <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Password</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulkResults.map((a, i) => (
                                <tr key={i} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                  <td className="px-3 py-1.5 font-mono">{a.username}</td>
                                  <td className="px-3 py-1.5 font-mono">{a.password}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                          Save these credentials now — passwords will not be shown again.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Group Billing section (creator only) ─────────────────── */}
                {user && activeGroup.creator && user.id === activeGroup.creator.id && (
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-6 mt-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">💳</span>
                      <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">Group Billing</h4>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                      Upgrade all members of this group to premium access in one payment — no individual subscriptions needed.
                    </p>

                    {activeGroup.bulk_payment_active ? (
                      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                          <span>✓</span>
                          <span>Bulk billing is active for this group</span>
                        </div>
                        {activeGroup.bulk_payment_expires_at && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-500">
                            All {activeGroup.member_count} members have premium access until{' '}
                            {new Date(activeGroup.bulk_payment_expires_at).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric',
                            })}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                          Contact <a href="mailto:edu.reach.co@gmail.com" className="text-indigo-600 dark:text-indigo-400 underline">edu.reach.co@gmail.com</a> to renew or adjust seats.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {[
                            { icon: '👥', label: 'Whole group upgrade', desc: 'One payment covers all members' },
                            { icon: '💰', label: 'Volume discounts', desc: 'Lower cost per seat at scale' },
                            { icon: '📊', label: 'Admin dashboard', desc: 'Track usage across your group' },
                            { icon: '🎓', label: 'Institution support', desc: 'Works for schools and academies' },
                          ].map(({ icon, label, desc }) => (
                            <div key={label} className="flex items-start gap-2">
                              <span className="flex-shrink-0">{icon}</span>
                              <div>
                                <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs">{label}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <a
                          href="mailto:edu.reach.co@gmail.com?subject=Group%20Billing%20Inquiry%20-%20EduReach&body=Hi%2C%20I%27d%20like%20to%20upgrade%20my%20study%20group%20to%20bulk%20billing.%0A%0AGroup%20name%3A%20"
                          className="block w-full text-center py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors mt-2"
                        >
                          Contact Us for Group Pricing
                        </a>
                        <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
                          We'll respond within 24 hours with a tailored quote.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Danger zone (creator only) ─────────────────────────── */}
                {user && activeGroup.creator && user.id === activeGroup.creator.id && (
                <div className="border-t border-rose-100 dark:border-rose-900/40 pt-6 mt-6">
                  <h4 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-3">Danger Zone</h4>
                  <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Delete this group</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Permanently removes the group, all posts, and member data. This cannot be undone.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={deleteGroupMutation.isPending}
                      onClick={async () => {
                        if (!window.confirm(`Delete "${activeGroup.name}"? This is permanent and cannot be undone.`)) return;
                        await deleteGroupMutation.mutateAsync(activeGroup.id);
                        setActiveGroup(null);
                      }}
                      className="flex-shrink-0 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                    >
                      {deleteGroupMutation.isPending ? 'Deleting…' : 'Delete Group'}
                    </button>
                  </div>
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT VIEW (List of groups)
  return (
    <div className="space-y-6">
      {joinMessage && (
        <div
          className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-3 ${joinMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
        >
          <p className="text-sm font-medium">{joinMessage.text}</p>
          <button type="button" onClick={() => setJoinMessage(null)} className="shrink-0 px-3 py-1.5 rounded-md border border-current opacity-80 hover:opacity-100 text-sm font-medium">
            Dismiss
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">Study Groups</h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Join peers learning the same topics, share questions, and stay accountable.
          </p>
          {/* Tier usage hint */}
          {user && !((user as any)?.is_staff) && userTier !== 'pro' && userTier !== 'admin' && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {userTier === 'free'
                ? `Free plan · ${userMemberGroups.length}/${JOIN_LIMITS.free} groups joined · creating groups requires Starter`
                : `Starter plan · ${userMemberGroups.length}/${JOIN_LIMITS.starter} joined · ${userCreatedGroups.length}/${createLimit} created`}
            </p>
          )}
        </div>
        {atCreateLimit ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5">
            <span className="text-sm text-amber-700 dark:text-amber-300">
              {userTier === 'free' ? 'Free plan: create groups not available' : `Starter limit: ${createLimit} groups reached`}
            </span>
            <button
              onClick={() => navigate('/billing')}
              className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
            >
              {userTier === 'free' ? 'Upgrade to Starter' : 'Upgrade to Pro'}
            </button>
          </div>
        ) : (
          <Button onClick={() => guardAction('create a study group') || setIsCreateOpen(true)} className="flex items-center gap-2">
            <PlusCircleIcon className="w-4 h-4" />
            Create group
          </Button>
        )}
      </div>
      <GuestNudge {...nudgeProps} />

      {examResultsChallenge && (
        <ExamResultsModal
          challenge={examResultsChallenge}
          onClose={() => setExamResultsChallenge(null)}
          onResultsToggled={() => {
            // Refresh challenges list so badge updates
            setExamResultsChallenge(c => c ? { ...c, results_released: !c.results_released } : null);
          }}
        />
      )}

      {isCreateOpen && !atCreateLimit && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Group name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., KU React Study Circle"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={3}
              placeholder="What will this group focus on? How often will you meet?"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createGroupMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
            <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm">Loading study groups...</p>
          </div>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-3 text-sm sm:text-base">
            No study groups yet. Be the first to create one for your course or topic.
          </p>
          {atCreateLimit ? (
            <button onClick={() => navigate('/billing')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
              Upgrade to create groups
            </button>
          ) : (
            <Button onClick={() => guardAction('create a study group') || setIsCreateOpen(true)} className="inline-flex items-center gap-2">
              <PlusCircleIcon className="w-4 h-4" />
              Start a group
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex flex-col h-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                    {group.name}
                  </h2>
                  {group.course_title && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 font-medium">
                      <BookOpenIcon className="w-3 h-3" />
                      <span>{group.course_title}</span>
                    </div>
                  )}
                </div>
                {group.is_member && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">MEMBER</span>
                )}
              </div>

              <div className="flex-1">
                {group.description ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4">{group.description}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic mb-4">No description provided.</p>
                )}
              </div>

              <div className="mt-auto border-t border-slate-100 dark:border-slate-700 pt-4">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4">
                  <span className="inline-flex items-center gap-1">
                    <UsersIcon className="w-4 h-4" />
                    {group.member_count}/{group.max_members} members
                  </span>
                  {user && group.creator && user.id === group.creator.id ? (
                    <button
                      type="button"
                      onClick={(e) => handleVisibilityToggle(group, e)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-semibold ${group.is_public
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-200'
                        : 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200'
                        }`}
                      title="Click to toggle between public and private"
                    >
                      {group.is_public ? 'Public • click to make private' : 'Private • click to make public'}
                    </button>
                  ) : (
                    <span className="font-medium">{group.is_public ? 'Public Group' : 'Private Group'}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  {group.is_member ? (
                    <Button className="flex-1" onClick={() => enterGroup(group)}>
                      Enter Group
                    </Button>
                  ) : atJoinLimit ? (
                    <button
                      type="button"
                      onClick={() => navigate('/billing')}
                      className="flex-1 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm font-semibold hover:bg-amber-100 transition-colors"
                    >
                      {userTier === 'free' ? 'Upgrade to join more' : 'Upgrade to Pro'}
                    </button>
                  ) : (
                    <Button className="flex-1" onClick={(e) => handleJoinToggle(group, e)} isLoading={joinGroupMutation.isPending}>
                      Join Group
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
