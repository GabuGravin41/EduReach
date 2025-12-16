import React, { useState, useEffect } from 'react';
import { DiscussionFeed } from './DiscussionFeed';
import { DiscussionThread } from './DiscussionThread';
import { CreateThreadModal } from './CreateThreadModal';

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

interface ThreadData {
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
}

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

interface DiscussionsPageProps {
  courseId: number;
  currentUserId?: number;
  isInstructor?: boolean;
  apiBaseUrl?: string;
}

export const DiscussionsPage: React.FC<DiscussionsPageProps> = ({
  courseId,
  currentUserId,
  isInstructor = false,
  apiBaseUrl = 'http://localhost:8000/api',
}) => {
  const [view, setView] = useState<'feed' | 'thread'>('feed');
  const [threads, setThreads] = useState<ThreadPreview[]>([]);
  const [selectedThread, setSelectedThread] = useState<ThreadData | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'unanswered'>('recent');
  const [error, setError] = useState<string | null>(null);

  // Mock data for demo
  useEffect(() => {
    if (view === 'feed') {
        setIsLoading(true);
        setTimeout(() => {
            setThreads([
                {
                    id: 1,
                    title: "Help with useEffect dependency array",
                    author: { id: 1, username: "Alice" },
                    is_pinned: false,
                    reply_count: 2,
                    vote_count: 5,
                    views: 120,
                    created_at: new Date().toISOString()
                },
                {
                    id: 2,
                    title: "Course Resources Link Broken",
                    author: { id: 2, username: "Bob" },
                    is_pinned: true,
                    reply_count: 0,
                    vote_count: 10,
                    views: 300,
                    created_at: new Date(Date.now() - 86400000).toISOString()
                }
            ]);
            setIsLoading(false);
        }, 800);
    }
  }, [view, courseId]);

  // Create new thread
  const handleCreateThread = async (title: string, content: string) => {
    setIsCreating(true);
    // Mock API call
    setTimeout(() => {
        const newThread = {
            id: Date.now(),
            title,
            author: { id: currentUserId || 999, username: "You" },
            is_pinned: false,
            reply_count: 0,
            vote_count: 0,
            views: 0,
            created_at: new Date().toISOString()
        };
        setThreads([newThread, ...threads]);
        setIsCreating(false);
        setShowCreateModal(false);
    }, 1000);
  };

  const fetchThreadDetail = (threadId: number) => {
      setIsLoading(true);
      setTimeout(() => {
          setSelectedThread({
              id: threadId,
              title: "Help with useEffect dependency array",
              content: "I'm having trouble understanding when to add functions to the dependency array. Can someone explain?",
              author: { id: 1, username: "Alice" },
              is_pinned: false,
              views: 125,
              created_at: new Date().toISOString(),
              replies: [
                  {
                      id: 101,
                      author: { id: 3, username: "Charlie" },
                      content: "Generally, if your effect uses a value from the component scope (props, state, functions), it should be in the dependency array.",
                      is_verified: true,
                      is_accepted: true,
                      upvotes: 12,
                      user_upvoted: false,
                      created_at: new Date().toISOString()
                  }
              ]
          });
          setView('thread');
          setIsLoading(false);
      }, 800);
  }

  // Reply to thread
  const handleReply = async (content: string) => {
    if (!selectedThread) return;
    setIsReplying(true);
    setTimeout(() => {
        const newReply = {
            id: Date.now(),
            author: { id: currentUserId || 999, username: "You" },
            content,
            is_verified: false,
            is_accepted: false,
            upvotes: 0,
            user_upvoted: false,
            created_at: new Date().toISOString()
        };
        setSelectedThread({
            ...selectedThread,
            replies: [...selectedThread.replies, newReply]
        });
        setIsReplying(false);
    }, 1000);
  };

  // Upvote reply
  const handleUpvote = async (replyId: number) => {
    if (!selectedThread) return;
    // Optimistic update
    setSelectedThread({
        ...selectedThread,
        replies: selectedThread.replies.map(r => r.id === replyId ? { ...r, upvotes: r.upvotes + 1, user_upvoted: true } : r)
    });
  };

  // Mark reply as accepted
  const handleMarkAccepted = async (replyId: number) => {
    if (!selectedThread) return;
    setSelectedThread({
        ...selectedThread,
        replies: selectedThread.replies.map(r => r.id === replyId ? { ...r, is_accepted: true } : r)
    });
  };

  return (
    <div>
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg shadow-lg z-40">
          {error}
        </div>
      )}

      {/* Feed View */}
      {view === 'feed' && (
        <DiscussionFeed
          threads={threads}
          onThreadClick={fetchThreadDetail}
          onCreateThread={() => setShowCreateModal(true)}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={(query) => setSearchQuery(query)}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      )}

      {/* Thread Detail View */}
      {view === 'thread' && selectedThread && (
        <DiscussionThread
          thread={selectedThread}
          onBack={() => setView('feed')}
          onReply={handleReply}
          onUpvote={handleUpvote}
          onMarkAccepted={handleMarkAccepted}
          isLoading={isLoading}
          isReplying={isReplying}
          currentUserId={currentUserId}
          isInstructor={isInstructor}
        />
      )}

      {/* Create Thread Modal */}
      <CreateThreadModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateThread}
        isLoading={isCreating}
      />
    </div>
  );
};