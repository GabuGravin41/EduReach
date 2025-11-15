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

  // Fetch threads for the course
  const fetchThreads = async () => {
    if (!courseId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // First, ensure course channel exists
      const channelRes = await fetch(`${apiBaseUrl}/community/channels/`);
      if (!channelRes.ok) throw new Error('Failed to fetch channels');
      
      const channels = await channelRes.json();
      const courseChannel = channels.find((ch: any) => ch.course === courseId);
      
      if (!courseChannel) {
        // No discussions yet for this course
        setThreads([]);
        return;
      }

      // Fetch threads for this channel
      const threadsRes = await fetch(
        `${apiBaseUrl}/community/channels/${courseChannel.id}/threads/?search=${searchQuery}`
      );
      if (!threadsRes.ok) throw new Error('Failed to fetch threads');
      
      const threadsData = await threadsRes.json();
      setThreads(threadsData);
    } catch (err) {
      console.error('Error fetching threads:', err);
      setError(err instanceof Error ? err.message : 'Failed to load discussions');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch specific thread detail
  const fetchThreadDetail = async (threadId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/community/threads/${threadId}/`);
      if (!res.ok) throw new Error('Failed to fetch thread');
      
      const data = await res.json();
      setSelectedThread(data);
      setView('thread');
    } catch (err) {
      console.error('Error fetching thread:', err);
      setError(err instanceof Error ? err.message : 'Failed to load thread');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new thread
  const handleCreateThread = async (title: string, content: string) => {
    if (!courseId) {
      setError('Course ID is required');
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      // Ensure channel exists
      let channelRes = await fetch(`${apiBaseUrl}/community/channels/`);
      if (!channelRes.ok) throw new Error('Failed to fetch channels');
      
      const channels = await channelRes.json();
      let courseChannel = channels.find((ch: any) => ch.course === courseId);
      
      if (!courseChannel) {
        // Create channel if it doesn't exist
        const createChannelRes = await fetch(`${apiBaseUrl}/community/channels/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ course: courseId }),
        });
        if (!createChannelRes.ok) throw new Error('Failed to create channel');
        courseChannel = await createChannelRes.json();
      }

      // Create thread
      const res = await fetch(`${apiBaseUrl}/community/threads/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
        body: JSON.stringify({
          channel: courseChannel.id,
          title,
          content,
        }),
      });

      if (!res.ok) throw new Error('Failed to create thread');
      
      const newThread = await res.json();
      setThreads([newThread, ...threads]);
      setShowCreateModal(false);
      setSelectedThread(newThread);
      setView('thread');
    } catch (err) {
      console.error('Error creating thread:', err);
      setError(err instanceof Error ? err.message : 'Failed to create thread');
    } finally {
      setIsCreating(false);
    }
  };

  // Reply to thread
  const handleReply = async (content: string) => {
    if (!selectedThread) return;

    setIsReplying(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/community/replies/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
        body: JSON.stringify({
          thread: selectedThread.id,
          content,
        }),
      });

      if (!res.ok) throw new Error('Failed to post reply');
      
      const newReply = await res.json();
      setSelectedThread({
        ...selectedThread,
        replies: [...selectedThread.replies, newReply],
      });
    } catch (err) {
      console.error('Error posting reply:', err);
      setError(err instanceof Error ? err.message : 'Failed to post reply');
    } finally {
      setIsReplying(false);
    }
  };

  // Upvote reply
  const handleUpvote = async (replyId: number) => {
    if (!selectedThread) return;

    try {
      const res = await fetch(`${apiBaseUrl}/community/replies/${replyId}/upvote/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
      });

      if (!res.ok) throw new Error('Failed to upvote');
      
      const data = await res.json();
      setSelectedThread({
        ...selectedThread,
        replies: selectedThread.replies.map((r) =>
          r.id === replyId
            ? {
                ...r,
                upvotes: data.upvotes,
                user_upvoted: data.user_upvoted,
              }
            : r
        ),
      });
    } catch (err) {
      console.error('Error upvoting:', err);
      setError(err instanceof Error ? err.message : 'Failed to upvote');
    }
  };

  // Mark reply as accepted
  const handleMarkAccepted = async (replyId: number) => {
    if (!selectedThread) return;

    try {
      const res = await fetch(`${apiBaseUrl}/community/replies/${replyId}/mark_as_accepted/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
      });

      if (!res.ok) throw new Error('Failed to mark as accepted');
      
      const data = await res.json();
      setSelectedThread({
        ...selectedThread,
        replies: selectedThread.replies.map((r) =>
          r.id === replyId
            ? {
                ...r,
                is_accepted: data.is_accepted,
              }
            : r
        ),
      });
    } catch (err) {
      console.error('Error marking as accepted:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark as accepted');
    }
  };

  // Initial load
  useEffect(() => {
    if (view === 'feed') {
      fetchThreads();
    }
  }, [view, courseId]);

  // Show error toast
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
          onSearchChange={(query) => {
            setSearchQuery(query);
            // Debounce search
            const timer = setTimeout(fetchThreads, 300);
            return () => clearTimeout(timer);
          }}
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
