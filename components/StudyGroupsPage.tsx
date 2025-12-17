import React, { useState } from 'react';
import { useStudyGroups, useCreateStudyGroup, useJoinStudyGroup, useLeaveStudyGroup } from '../src/hooks/useStudyGroups';
import { StudyGroup } from '../src/services/studyGroupService';
import { Button } from './ui/Button';
import { UsersIcon } from './icons/UsersIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

export const StudyGroupsPage: React.FC = () => {
  const { data: groups = [], isLoading } = useStudyGroups();
  const createGroupMutation = useCreateStudyGroup();
  const joinGroupMutation = useJoinStudyGroup();
  const leaveGroupMutation = useLeaveStudyGroup();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createGroupMutation.mutateAsync({ name, description });
    setName('');
    setDescription('');
    setIsCreateOpen(false);
  };

  const handleJoinToggle = (group: StudyGroup) => {
    if (group.is_member) {
      leaveGroupMutation.mutate(group.id);
    } else {
      joinGroupMutation.mutate(group.id);
    }
  };

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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex flex-col h-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {group.name}
                  </h2>
                  {group.course_title && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                      <BookOpenIcon className="w-3 h-3" />
                      <span>{group.course_title}</span>
                    </div>
                  )}
                </div>
              </div>
              {group.description && (
                <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-3">{group.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <UsersIcon className="w-4 h-4" />
                  {group.member_count}/{group.max_members} members
                </span>
                <span>{group.is_public ? 'Public' : 'Private'}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant={group.is_member ? 'secondary' : 'primary'}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleJoinToggle(group)}
                  isLoading={joinGroupMutation.isPending || leaveGroupMutation.isPending}
                >
                  {group.is_member ? 'Leave group' : 'Join group'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudyGroupsPage;


