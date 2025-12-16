
import React, { useState } from 'react';
import { useStudyGroups, useCreateStudyGroup, useJoinStudyGroup, useLeaveStudyGroup } from '../hooks/useStudyGroups';
import { StudyGroup } from '../services/studyGroupService';
import { Button } from './ui/Button';
import { UsersIcon } from './icons/UsersIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';

// Extended Study Group Interface for the detail view
interface StudyGroupDetail extends StudyGroup {
    upcomingEvents?: { id: string, title: string, time: string, attendees: number }[];
    members?: { id: string, name: string, role: string }[];
}

export const StudyGroupsPage: React.FC = () => {
  const { data: groups = [], isLoading } = useStudyGroups();
  const createGroupMutation = useCreateStudyGroup();
  const joinGroupMutation = useJoinStudyGroup();
  const leaveGroupMutation = useLeaveStudyGroup();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // State for detailed group view
  const [activeGroup, setActiveGroup] = useState<StudyGroupDetail | null>(null);
  const [groupTab, setGroupTab] = useState<'overview' | 'members' | 'events' | 'invites'>('overview');
  const [inviteEmail, setInviteEmail] = useState('');

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
      leaveGroupMutation.mutate(group.id);
    } else {
      joinGroupMutation.mutate(group.id);
    }
  };

  const enterGroup = (group: StudyGroup) => {
      // Mock fetching detailed data
      const detailedGroup: StudyGroupDetail = {
          ...group,
          upcomingEvents: [
              { id: 'e1', title: 'Weekly Code Review', time: 'Tomorrow, 5:00 PM', attendees: 4 },
              { id: 'e2', title: 'React Hooks Deep Dive', time: 'Saturday, 2:00 PM', attendees: 8 },
          ],
          members: [
              { id: 'm1', name: 'Alice_Dev', role: 'Admin' },
              { id: 'm2', name: 'Bob_Code', role: 'Member' },
              { id: 'm3', name: 'Charlie_JS', role: 'Member' },
              { id: 'm4', name: 'You', role: 'Member' }
          ]
      };
      setActiveGroup(detailedGroup);
      setGroupTab('overview');
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
                                className={`py-4 font-semibold text-sm capitalize border-b-2 transition-colors ${
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
                                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <p className="font-semibold text-sm">Best resources for useEffect?</p>
                                        <p className="text-xs text-slate-500 mt-1">Posted by Alice • 2h ago</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <p className="font-semibold text-sm">Can someone explain memoization?</p>
                                        <p className="text-xs text-slate-500 mt-1">Posted by Bob • 5h ago</p>
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full">View All Discussions</Button>
                                </div>
                             </div>

                             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <CalendarIcon className="w-5 h-5 text-green-500" />
                                    Next Session
                                </h3>
                                {activeGroup.upcomingEvents && activeGroup.upcomingEvents[0] ? (
                                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800">
                                        <h4 className="font-bold text-green-800 dark:text-green-300">{activeGroup.upcomingEvents[0].title}</h4>
                                        <div className="flex items-center gap-2 mt-2 text-sm text-green-700 dark:text-green-400">
                                            <ClockIcon className="w-4 h-4" />
                                            {activeGroup.upcomingEvents[0].time}
                                        </div>
                                        <Button className="mt-4 w-full" size="sm">Join Session</Button>
                                    </div>
                                ) : <p>No upcoming sessions.</p>}
                             </div>
                        </div>
                    )}

                    {groupTab === 'members' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 text-xs uppercase font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {activeGroup.members?.map(m => (
                                        <tr key={m.id}>
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                    {m.name.substring(0,2).toUpperCase()}
                                                </div>
                                                <span className="font-medium">{m.name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">{m.role}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {groupTab === 'events' && (
                         <div className="space-y-4">
                             <div className="flex justify-between items-center mb-4">
                                 <h3 className="text-xl font-bold">Upcoming Study Sessions</h3>
                                 <Button size="sm"><PlusCircleIcon className="w-4 h-4 mr-2"/> Schedule Event</Button>
                             </div>
                             {activeGroup.upcomingEvents?.map(event => (
                                 <div key={event.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                     <div className="flex items-center gap-4">
                                         <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg text-indigo-600">
                                             <CalendarIcon className="w-6 h-6" />
                                         </div>
                                         <div>
                                             <h4 className="font-bold text-lg">{event.title}</h4>
                                             <p className="text-slate-500 text-sm flex items-center gap-2">
                                                 <ClockIcon className="w-4 h-4" /> {event.time}
                                                 <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                 {event.attendees} Attending
                                             </p>
                                         </div>
                                     </div>
                                     <Button variant="outline">RSVP</Button>
                                 </div>
                             ))}
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
                                    <Button disabled={!inviteEmail} onClick={() => { alert(`Invite sent to ${inviteEmail}`); setInviteEmail(''); }}>Send Invite</Button>
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
