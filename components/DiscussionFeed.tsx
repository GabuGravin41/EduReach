import React, { useState } from 'react';

interface ThreadPreview {
  id: number;
  title: string;
  author: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  };
  is_pinned: boolean;
  reply_count: number;
  vote_count: number;
  views: number;
  created_at: string;
}

interface DiscussionFeedProps {
  threads: ThreadPreview[];
  onThreadClick: (threadId: number) => void;
  onCreateThread: () => void;
  isLoading?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  sortBy?: 'recent' | 'popular' | 'unanswered';
  onSortChange?: (sort: 'recent' | 'popular' | 'unanswered') => void;
}

export const DiscussionFeed: React.FC<DiscussionFeedProps> = ({
  threads,
  onThreadClick,
  onCreateThread,
  isLoading = false,
  searchQuery = '',
  onSearchChange,
  sortBy = 'recent',
  onSortChange,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getAuthorName = (author: ThreadPreview['author']) => {
    if (author.first_name || author.last_name) {
      return `${author.first_name || ''} ${author.last_name || ''}`.trim();
    }
    return author.username;
  };

  const sortedThreads = [...threads].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === 'popular') {
      return b.vote_count - a.vote_count || b.reply_count - a.reply_count;
    } else if (sortBy === 'unanswered') {
      return a.reply_count - b.reply_count;
    }
    return 0;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading discussions...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Create Button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Course Discussions
        </h2>
        <button
          onClick={onCreateThread}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
        >
          Ask Question
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/5 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange?.(e.target.value as 'recent' | 'popular' | 'unanswered')}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
            <option value="unanswered">Unanswered</option>
          </select>
        </div>
      </div>

      {/* Threads List */}
      <div className="space-y-4">
        {sortedThreads.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/5 p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {searchQuery
                ? 'No discussions found matching your search'
                : 'No discussions yet. Be the first to ask a question!'}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateThread}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
              >
                Start a Discussion
              </button>
            )}
          </div>
        ) : (
          sortedThreads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => onThreadClick(thread.id)}
              className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/5 p-6 cursor-pointer transition-all hover:shadow-xl hover:shadow-slate-900/10 ${
                thread.is_pinned ? 'border-l-4 border-yellow-500' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Stats */}
                <div className="flex flex-col items-center justify-start text-center min-w-fit">
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {thread.reply_count}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {thread.reply_count === 1 ? 'Reply' : 'Replies'}
                  </div>
                  <div className="mt-2 text-lg font-bold text-slate-700 dark:text-slate-300">
                    {thread.vote_count}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Helpful
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {thread.is_pinned && (
                      <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded">
                        Pinned
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    {thread.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Asked by <span className="font-semibold">{getAuthorName(thread.author)}</span> ·{' '}
                    {formatDate(thread.created_at)} · {thread.views} views
                  </p>

                  {/* Status Badge */}
                  {thread.reply_count === 0 && (
                    <div className="inline-block px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded">
                      Unanswered
                    </div>
                  )}
                </div>

                {/* Chevron */}
                <div className="text-slate-400 dark:text-slate-600 mt-1">
                  →
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
