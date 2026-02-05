import React, { useState } from 'react';
import { 
  useStudyGroups, 
  useCreateStudyGroup, 
  useJoinStudyGroup, 
  useLeaveStudyGroup,
  useStudyGroupPosts,
  useCreateStudyGroupPost,
  useStudyGroupMembers,
  useInviteStudyGroupMember,
  useStudyGroupChallenges,
  useCreateStudyGroupChallenge,
} from '../src/hooks/useStudyGroups';
import { StudyGroup } from '../services/studyGroupService';
import { useAssessments } from '../src/hooks/useAssessments';
import { Button } from './ui/Button';
import { UsersIcon } from './icons/UsersIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';

export const StudyGroupsPage: React.FC = () => {
  const { data: groupsData, isLoading } = useStudyGroups();
  const createGroupMutation = useCreateStudyGroup();
  const joinGroupMutation = useJoinStudyGroup();
  const leaveGroupMutation = useLeaveStudyGroup();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // State for detailed group view
  const [activeGroup, setActiveGroup] = useState<StudyGroup | null>(null);
  const [groupTab, setGroupTab] = useState<'overview' | 'members' | 'events' | 'invites'>('overview');
  const [inviteEmail, setInviteEmail] = useState('');
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [challengeStart, setChallengeStart] = useState('');
  const [challengeEnd, setChallengeEnd] = useState('');

  const createPostMutation = useCreateStudyGroupPost();
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

  const normalizedAssessments = Array.isArray(assessmentsData)
    ? assessmentsData
    : (assessmentsData && (assessmentsData as any).results && Array.isArray((assessmentsData as any).results)
        ? (assessmentsData as any).results
        : []);

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

  const enterGroup = (group: StudyGroup) => {
      setActiveGroup(group);
      setGroupTab('overview');
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

  // If a group is active, render the detailed dashboard
  if (activeGroup) {
      return (
        <div className="h-full flex flex-col">
            <button 
                onClick={() => setActiveGroup(null)} 
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
                        {['overview', 'members', 'events', 'invites'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setGroupTab(tab as any)}
                                className={`py-4 px-1 text-sm font-semibold border-b-2 transition-colors ${
                                    groupTab === tab 
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
                                <div className="space-y-4">
                                    {postsLoading ? (
                                        <p className="text-sm text-slate-500">Loading discussions...</p>
                                    ) : normalizedPosts.length === 0 ? (
                                        <p className="text-sm text-slate-500">No posts yet. Start the first discussion for this group.</p>
                                    ) : (
                                        normalizedPosts.slice(0, 3).map(post => (
                                            <div key={post.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                                <p className="font-semibold text-sm">{post.content}</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {post.author.username} • {new Date(post.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                    {/* Simple composer for new post */}
                                    <button
                                        onClick={async () => {
                                            const content = prompt('Start a new discussion');
                                            if (content && content.trim()) {
                                                await createPostMutation.mutateAsync({ groupId: activeGroup.id, content: content.trim() });
                                            }
                                        }}
                                        className="w-full px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                        New Discussion
                                    </button>
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
                                                        {m.username.substring(0,2).toUpperCase()}
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

                    {groupTab === 'events' && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <ClockIcon className="w-5 h-5 text-indigo-500" />
                                    Create Group Challenge
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        value={challengeTitle}
                                        onChange={(e) => setChallengeTitle(e.target.value)}
                                        placeholder="Challenge title"
                                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    />
                                    <select
                                        value={selectedAssessmentId}
                                        onChange={(e) => setSelectedAssessmentId(e.target.value)}
                                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    >
                                        <option value="">Link an assessment (optional)</option>
                                        {normalizedAssessments.map((assessment: any) => (
                                            <option key={assessment.id} value={assessment.id}>
                                                {assessment.title}
                                            </option>
                                        ))}
                                    </select>
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

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-bold mb-4">Active Challenges</h3>
                                {normalizedChallenges.length === 0 ? (
                                    <p className="text-sm text-slate-500">No challenges yet for this group.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {normalizedChallenges.map((challenge: any) => (
                                            <div key={challenge.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold">{challenge.title}</p>
                                                        {challenge.assessment_title && (
                                                            <p className="text-xs text-slate-500">Assessment: {challenge.assessment_title}</p>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-slate-500">
                                                        {challenge.start_date ? new Date(challenge.start_date).toLocaleString() : 'Anytime'}
                                                    </span>
                                                </div>
                                                {challenge.description && (
                                                    <p className="text-sm text-slate-600 mt-2">{challenge.description}</p>
                                                )}
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
                                <label className="block text-sm font-medium mb-2">Share Link</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={`https://edureach.app/groups/join/${activeGroup.id}`} 
                                        className="flex-1 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-500"
                                    />
                                    <Button onClick={() => alert("Link copied!")}>Copy</Button>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                                <label className="block text-sm font-medium mb-2">Invite by Email</label>
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
                                        await inviteMemberMutation.mutateAsync({ groupId: activeGroup.id, email: inviteEmail }); 
                                        setInviteEmail(''); 
                                      }}
                                    >
                                      {inviteMemberMutation.isPending ? 'Sending...' : 'Send Invite'}
                                    </Button>
                                </div>
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
                    <span className="font-medium">{group.is_public ? 'Public Group' : 'Private Group'}</span>
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
