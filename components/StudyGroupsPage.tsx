import React, { useEffect, useState } from 'react';
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
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../src/routes';

export const StudyGroupsPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [groupTab, setGroupTab] = useState<'overview' | 'discussions' | 'members' | 'leaderboard' | 'events' | 'invites'>('overview');
  const [inviteEmail, setInviteEmail] = useState('');
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [challengeStart, setChallengeStart] = useState('');
  const [challengeEnd, setChallengeEnd] = useState('');
  const [createChallengeExpanded, setCreateChallengeExpanded] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const createPostMutation = useCreateStudyGroupPost();
  const updatePostMutation = useUpdateStudyGroupPost();
  const deletePostMutation = useDeleteStudyGroupPost();
  const inviteMemberMutation = useInviteStudyGroupMember();
  const createChallengeMutation = useCreateStudyGroupChallenge();
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
  const filteredAssessmentsForChallenges = normalizedAssessments.filter((a: any) => {
    if (assessmentTypeFilter === 'all') return true;
    const kind = (a.assessment_type as 'quiz' | 'exam' | undefined) || 'exam';
    return kind === assessmentTypeFilter;
  });

  // Normalize groups data: backend may return either an array or a paginated object
  const groups: StudyGroup[] = Array.isArray(groupsData)
    ? groupsData
    : (groupsData && (groupsData as any).results && Array.isArray((groupsData as any).results)
      ? (groupsData as any).results
      : []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createGroupMutation.mutateAsync({ name, description });
    setName('');
    setDescription('');
    setIsCreateOpen(false);
  };

  const handleJoinToggle = (group: StudyGroup, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
      alert('Could not update group visibility. Please try again.');
    }
  };

  const enterGroup = (group: StudyGroup) => {
    setActiveGroup(group);
    setGroupTab('overview');
    navigate(ROUTES.studyGroupDetail(Number(group.id)), { replace: true });
  };

  const handleCreateChallenge = async () => {
    if (!activeGroupId || !challengeTitle.trim()) return;
    await createChallengeMutation.mutateAsync({
      group: Number(activeGroupId),
      title: challengeTitle.trim(),
      description: challengeDescription.trim() || undefined,
      assessment: selectedAssessmentId ? Number(selectedAssessmentId) : null,
      start_date: challengeStart || undefined,
      end_date: challengeEnd || null,
    });
    setChallengeTitle('');
    setChallengeDescription('');
    setSelectedAssessmentId('');
    setChallengeStart('');
    setChallengeEnd('');
  };

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
          <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-6">
            <div className="flex gap-6">
              {['overview', 'discussions', 'members', 'leaderboard', 'events', 'invites'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setGroupTab(tab as any)}
                  className={`py-4 px-1 text-sm font-semibold border-b-2 transition-colors ${groupTab === tab
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-yellow-500" />
                    Discussion Board
                  </h3>
                  {/* Inline composer */}
                  <div className="mb-4">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Start a new discussion..."
                      rows={3}
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
                  <div className="space-y-3 max-h-[320px] overflow-y-auto">
                    {postsLoading ? (
                      <p className="text-sm text-slate-500">Loading discussions...</p>
                    ) : normalizedPosts.length === 0 ? (
                      <p className="text-sm text-slate-500">No posts yet. Start the first discussion for this group.</p>
                    ) : (
                      normalizedPosts.map((post: { id: number; content: string; author?: { id?: number; username?: string }; created_at: string }) => (
                        <div key={post.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          {editingPostId === post.id ? (
                            <>
                              <textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                rows={2}
                                className="w-full px-2 py-1 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                              />
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={async () => {
                                    if (!editingContent.trim()) return;
                                    await updatePostMutation.mutateAsync({ postId: post.id, content: editingContent.trim() });
                                    setEditingPostId(null);
                                    setEditingContent('');
                                  }}
                                  disabled={updatePostMutation.isPending}
                                >
                                  Save
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => { setEditingPostId(null); setEditingContent(''); }}>
                                  Cancel
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{post.content}</p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-slate-500">
                                  {(post.author && (post.author as any).username) ?? 'Someone'} • {new Date(post.created_at).toLocaleString()}
                                </p>
                                {user && post.author && (post.author as any).id === user.id && (
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => { setEditingPostId(post.id); setEditingContent(post.content); }}
                                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (window.confirm('Delete this post?')) {
                                          await deletePostMutation.mutateAsync({ postId: post.id, groupId: activeGroup.id });
                                        }
                                      }}
                                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                                      disabled={deletePostMutation.isPending}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-green-500" />
                    Next Session
                  </h3>
                  <p className="text-sm text-slate-500">No upcoming sessions yet. Once events are scheduled for this group, they will show up here.</p>
                </div>
              </div>
            )}

            {groupTab === 'discussions' && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 max-w-2xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5 text-yellow-500" />
                  Discussion Board
                </h3>
                <div className="mb-4">
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Start a new discussion..."
                    rows={3}
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
                <div className="space-y-3 max-h-[420px] overflow-y-auto">
                  {postsLoading ? (
                    <p className="text-sm text-slate-500">Loading discussions...</p>
                  ) : normalizedPosts.length === 0 ? (
                    <p className="text-sm text-slate-500">No posts yet. Start the first discussion for this group.</p>
                  ) : (
                    normalizedPosts.map((post: { id: number; content: string; author?: { id?: number; username?: string }; created_at: string }) => (
                      <div key={post.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        {editingPostId === post.id ? (
                          <>
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              rows={2}
                              className="w-full px-2 py-1 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                            />
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={async () => {
                                  if (!editingContent.trim()) return;
                                  await updatePostMutation.mutateAsync({ postId: post.id, content: editingContent.trim() });
                                  setEditingPostId(null);
                                  setEditingContent('');
                                }}
                                disabled={updatePostMutation.isPending}
                              >
                                Save
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => { setEditingPostId(null); setEditingContent(''); }}>
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{post.content}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-slate-500">
                                {(post.author && (post.author as any).username) ?? 'Someone'} • {new Date(post.created_at).toLocaleString()}
                              </p>
                              {user && post.author && (post.author as any).id === user.id && (
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => { setEditingPostId(post.id); setEditingContent(post.content); }}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (window.confirm('Delete this post?')) {
                                        await deletePostMutation.mutateAsync({ postId: post.id, groupId: activeGroup.id });
                                      }
                                    }}
                                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                                    disabled={deletePostMutation.isPending}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))
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
                <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2">
                    <TrophyIcon className="w-5 h-5 text-amber-500" />
                    Group Rankings
                  </h3>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ranked by Total XP</span>
                </div>
                {membersLoading ? (
                  <div className="p-6 text-sm text-slate-500">Loading rankings...</div>
                ) : normalizedMembers.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500">No data available.</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {normalizedMembers
                      .slice()
                      .sort((a, b) => (b.xp_points || 0) - (a.xp_points || 0))
                      .map((m, i) => (
                        <div key={m.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex-shrink-0 w-8 text-center font-black text-slate-400">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </div>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                            {m.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {m.username}
                            </p>
                            <p className="text-xs font-semibold text-slate-500">
                              Level {m.level || 1}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                              {(m.xp_points || 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">TOTAL XP</p>
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
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 text-xs uppercase font-semibold">
                          <tr>
                            <th className="px-6 py-3">Student</th>
                            <th className="px-6 py-3">Attempts</th>
                            <th className="px-6 py-3">% Average</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {normalizedPerformance.map((row: any) => (
                            <tr key={row.user_id}>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                    {String(row.username || '')
                                      .substring(0, 2)
                                      .toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-800 dark:text-slate-100">
                                      {row.full_name || row.username}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {row.username}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-slate-700 dark:text-slate-200">
                                {row.attempt_count}
                              </td>
                              <td className="px-6 py-3 text-slate-700 dark:text-slate-200">
                                {typeof row.average_percentage === 'number'
                                  ? `${row.average_percentage.toFixed(1)}%`
                                  : '-'}
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
                    <div className="px-6 pb-6 pt-0 border-t border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <input
                          value={challengeTitle}
                          onChange={(e) => setChallengeTitle(e.target.value)}
                          placeholder="Challenge title"
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                              Link an assessment (optional)
                            </label>
                            <select
                              value={assessmentTypeFilter}
                              onChange={(e) => setAssessmentTypeFilter(e.target.value as any)}
                              className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                            >
                              <option value="all">All</option>
                              <option value="quiz">Quizzes</option>
                              <option value="exam">Exams</option>
                            </select>
                          </div>
                          <select
                            value={selectedAssessmentId}
                            onChange={(e) => setSelectedAssessmentId(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          >
                            <option value="">Choose assessment</option>
                            {filteredAssessmentsForChallenges.map((assessment: any) => (
                              <option key={assessment.id} value={assessment.id}>
                                {assessment.title} {assessment.assessment_type === 'exam' ? '• Exam' : '• Quiz'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          value={challengeStart}
                          onChange={(e) => setChallengeStart(e.target.value)}
                          type="datetime-local"
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                        <input
                          value={challengeEnd}
                          onChange={(e) => setChallengeEnd(e.target.value)}
                          type="datetime-local"
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>
                      <textarea
                        value={challengeDescription}
                        onChange={(e) => setChallengeDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="mt-4 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <Button
                        className="mt-4"
                        onClick={handleCreateChallenge}
                        disabled={createChallengeMutation.isPending}
                      >
                        Create Challenge
                      </Button>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold mb-4">Active Challenges</h3>
                  {normalizedChallenges.length === 0 ? (
                    <p className="text-sm text-slate-500">No challenges yet for this group.</p>
                  ) : (
                    <div className="space-y-3">
                      {normalizedChallenges.map((challenge: any) => (
                        <div key={challenge.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-semibold">{challenge.title}</p>
                              {challenge.assessment_title && (
                                <p className="text-xs text-slate-500">Assessment: {challenge.assessment_title}</p>
                              )}
                              {challenge.description && (
                                <p className="text-sm text-slate-600 mt-2">{challenge.description}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-xs text-slate-500">
                                {challenge.start_date ? new Date(challenge.start_date).toLocaleString() : 'Anytime'}
                              </span>
                              {challenge.assessment && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => navigate(`/assessments/${challenge.assessment}`)}
                                >
                                  Open assessment
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
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
                        const origin = typeof window !== 'undefined' ? window.location.origin : '';
                        const token = activeGroup.invite_token || '';
                        return token ? `${origin}/study-groups?join_token=${token}` : '';
                      })()}
                      className="flex-1 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-500"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      onClick={async () => {
                        if (!activeGroup.invite_token) {
                          alert('Invite token not available. Please refresh the page.');
                          return;
                        }
                        const origin = typeof window !== 'undefined' ? window.location.origin : '';
                        const url = `${origin}/study-groups?join_token=${activeGroup.invite_token}`;
                        try {
                          if (navigator.clipboard && window.isSecureContext) {
                            await navigator.clipboard.writeText(url);
                            alert('Invite link copied!');
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
                            alert(ok ? 'Invite link copied!' : 'Copy failed, please copy manually.');
                          }
                        } catch {
                          alert('Copy failed, please copy manually.');
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
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <Button
                      disabled={!inviteEmail || inviteMemberMutation.isPending}
                      onClick={async () => {
                        if (!inviteEmail) return;
                        try {
                          await inviteMemberMutation.mutateAsync({ groupId: activeGroup.id, email: inviteEmail });
                          alert(
                            'If this email belongs to an existing EduReach account, they have been added to the group and will see it in their Study Groups list.'
                          );
                          setInviteEmail('');
                        } catch (err: any) {
                          const detail = err?.response?.data?.detail;
                          if (detail) {
                            alert(detail);
                          } else {
                            alert('Could not add this email to the group. They may not have an EduReach account yet.');
                          }
                        }
                      }}
                    >
                      {inviteMemberMutation.isPending ? 'Adding…' : 'Add to group'}
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    This does not send an external email yet. It simply adds an existing EduReach user (matched by email) into this group.
                  </p>
                </div>
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
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <PlusCircleIcon className="w-4 h-4" />
          Create group
        </Button>
      </div>

      {isCreateOpen && (
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
          <Button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-2">
            <PlusCircleIcon className="w-4 h-4" />
            Start a group
          </Button>
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
