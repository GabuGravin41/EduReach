import React, { useState, useEffect } from 'react';
import { DiscussionFeed } from './DiscussionFeed';
import { DiscussionThread } from './DiscussionThread';
import { CreateThreadModal } from './CreateThreadModal';
import apiClient from '../src/services/api';

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

  // Load threads for this course
  useEffect(() => {
    if (view === 'feed') {
      loadThreads();
    }
  }, [view, courseId]);

  const loadThreads = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get threads directly for this course
      const response = await apiClient.get(`/community/threads/?course_id=${courseId}`);
      setThreads(response.data.results || []);
    } catch (error: any) {
      console.error('Failed to load threads:', error);
      setError(error.response?.data?.detail || 'Failed to load discussions');
      setThreads([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new thread
  const handleCreateThread = async (title: string, content: string) => {
    try {
      setIsCreating(true);
      setError(null);

      // Create the thread directly with course_id
      const response = await apiClient.post('/community/threads/', {
        course_id: courseId,
        title,
        content
      });

      // Add to threads list
      setThreads(prev => [response.data, ...prev]);
      setShowCreateModal(false);
    } catch (error: any) {
      console.error('Failed to create thread:', error);
      setError(error.response?.data?.detail || 'Failed to create discussion');
    } finally {
      setIsCreating(false);
    }
  };

  const fetchThreadDetail = async (threadId: number) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get full thread details with replies
      const response = await apiClient.get(`/community/threads/${threadId}/`);
      setSelectedThread(response.data);
      setView('thread');
    } catch (error: any) {
      console.error('Failed to load thread details:', error);
      setError(error.response?.data?.detail || 'Failed to load discussion details');
    } finally {
      setIsLoading(false);
    }
  };

  // Reply to thread
  const handleReply = async (content: string) => {
    if (!selectedThread) return;

    try {
      setIsReplying(true);
      setError(null);

      // Create the reply
      const response = await apiClient.post('/community/replies/', {
        thread: selectedThread.id,
        content
      });

      // Update the thread with the new reply
      setSelectedThread(prev => prev ? {
        ...prev,
        replies: [...prev.replies, response.data]
      } : null);
    } catch (error: any) {
      console.error('Failed to create reply:', error);
      setError(error.response?.data?.detail || 'Failed to post reply');
    } finally {
      setIsReplying(false);
    }
  };

  // Upvote reply
  const handleUpvote = async (replyId: number) => {
    if (!selectedThread) return;

    try {
      // Call the upvote API
      const response = await apiClient.post(`/community/replies/${replyId}/upvote/`);

      // Update the reply in the thread
      setSelectedThread(prev => prev ? {
        ...prev,
        replies: prev.replies.map(reply =>
          reply.id === replyId
            ? {
                ...reply,
                upvotes: response.data.upvotes,
                user_upvoted: response.data.user_upvoted
              }
            : reply
        )
      } : null);
    } catch (error: any) {
      console.error('Failed to upvote reply:', error);
      setError(error.response?.data?.detail || 'Failed to upvote');
    }
  };

  // Mark reply as accepted
  const handleMarkAccepted = async (replyId: number) => {
    if (!selectedThread) return;

    try {
      const response = await apiClient.post(`/community/replies/${replyId}/mark_as_accepted/`);

      // Update the reply in the thread
      setSelectedThread(prev => prev ? {
        ...prev,
        replies: prev.replies.map(reply =>
          reply.id === replyId
            ? { ...reply, is_accepted: response.data.is_accepted }
            : reply
        )
      } : null);
    } catch (error: any) {
      console.error('Failed to mark reply as accepted:', error);
      setError(error.response?.data?.detail || 'Failed to mark reply as accepted');
    }
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
