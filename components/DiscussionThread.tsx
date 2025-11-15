import React, { useState } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ThreadReply {
  id: number;
  author: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  };
  content: string;
  is_verified: boolean;
  is_accepted: boolean;
  upvotes: number;
  user_upvoted: boolean;
  created_at: string;
}

interface DiscussionThreadProps {
  thread: {
    id: number;
    title: string;
    content: string;
    author: {
      id: number;
      username: string;
      first_name?: string;
      last_name?: string;
    };
    is_pinned: boolean;
    views: number;
    replies: ThreadReply[];
    created_at: string;
  };
  onBack: () => void;
  onReply: (content: string) => void;
  onUpvote: (replyId: number) => void;
  onMarkAccepted: (replyId: number) => void;
  isLoading?: boolean;
  isReplying?: boolean;
  currentUserId?: number;
  isInstructor?: boolean;
}

export const DiscussionThread: React.FC<DiscussionThreadProps> = ({
  thread,
  onBack,
  onReply,
  onUpvote,
  onMarkAccepted,
  isLoading = false,
  isReplying = false,
  currentUserId,
  isInstructor = false,
}) => {
  const [replyContent, setReplyContent] = useState('');

  const handleReplySubmit = () => {
    if (replyContent.trim()) {
      onReply(replyContent);
      setReplyContent('');
    }
  };

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

  const getAuthorName = (author: ThreadReply['author']) => {
    if (author.first_name || author.last_name) {
      return `${author.first_name || ''} ${author.last_name || ''}`.trim();
    }
    return author.username;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading discussion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-6"
      >
        <ChevronLeftIcon className="w-5 h-5" />
        Back to Discussions
      </button>

      {/* Thread Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/5 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {thread.is_pinned && (
                <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded">
                  Pinned
                </span>
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {thread.views} views
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {thread.title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Asked by <span className="font-semibold">{getAuthorName(thread.author)}</span> · {formatDate(thread.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Thread Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/5 p-6 mb-6">
        <div className="prose dark:prose-invert max-w-none">
          <MarkdownRenderer content={thread.content} />
        </div>
      </div>

      {/* Replies Section */}
      <div className="space-y-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {thread.replies.length} {thread.replies.length === 1 ? 'Reply' : 'Replies'}
        </h2>

        {thread.replies.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              No replies yet. Be the first to answer this question!
            </p>
          </div>
        ) : (
          thread.replies.map((reply) => (
            <div
              key={reply.id}
              className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/5 p-6 border-l-4 ${
                reply.is_accepted
                  ? 'border-green-500 bg-green-50 dark:bg-slate-800 dark:border-green-500'
                  : reply.is_verified
                    ? 'border-blue-500'
                    : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              {/* Reply Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {getAuthorName(reply.author)}
                    </p>
                    {reply.is_accepted && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                        <CheckCircleIcon className="w-3 h-3" />
                        Accepted Answer
                      </span>
                    )}
                    {reply.is_verified && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(reply.created_at)}
                  </p>
                </div>
              </div>

              {/* Reply Content */}
              <div className="prose dark:prose-invert max-w-none mb-4">
                <MarkdownRenderer content={reply.content} />
              </div>

              {/* Reply Actions */}
              <div className="flex items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => onUpvote(reply.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    reply.user_upvoted
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-sm font-semibold">Helpful • {reply.upvotes}</span>
                </button>

                {currentUserId === thread.author.id && !reply.is_accepted && (
                  <button
                    onClick={() => onMarkAccepted(reply.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-sm font-semibold"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Mark as Answer
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply Form */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/5 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          Add Your Answer
        </h3>
        <textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder="Write your reply here... You can use markdown formatting!"
          className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          rows={4}
        />
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => setReplyContent('')}
            className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-semibold"
          >
            Clear
          </button>
          <button
            onClick={handleReplySubmit}
            disabled={!replyContent.trim() || isReplying}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isReplying && (
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {isReplying ? 'Posting...' : 'Post Reply'}
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          💡 Tip: Use **bold**, *italic*, `code`, and markdown for better formatting!
        </p>
      </div>
    </div>
  );
};
