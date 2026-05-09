import React, { useState, useEffect } from 'react';
import { TrophyIcon } from './icons/TrophyIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { HeartIcon } from './icons/HeartIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { discussionService, CourseChannel, DiscussionThread } from '../src/services/discussionService';
import { ThreadModal } from './ThreadModal';
import { useToast } from '../src/contexts/ToastContext';
import { TrashIcon } from './icons/TrashIcon';
import { HashIcon } from './icons/HashIcon';
import { TrendingIcon } from './icons/TrendingIcon';
import { UserTier } from '../App';
import { useCommunityLeaderboard, useCommunityTrendingTopics } from '../src/hooks/useCommunityAnalytics';
import { usePosts, useCreatePost, useToggleLike, useAddComment, useDeletePost } from '../src/hooks/useCommunity';
import { useGuestNudge } from '../src/hooks/useGuestNudge';
import { GuestNudge } from './GuestNudge';

// ---------------------------------------------------------------------------
// Time-ago helper
// ---------------------------------------------------------------------------
const timeAgo = (dateStr: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ---------------------------------------------------------------------------
// Avatar initials helper
// ---------------------------------------------------------------------------
const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

const AVATAR_GRADIENTS = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-purple-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-red-600',
    'from-cyan-500 to-blue-600',
];

const getAvatarGradient = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

// ---------------------------------------------------------------------------
// AvatarCircle
// ---------------------------------------------------------------------------
const AvatarCircle: React.FC<{ name: string; size?: 'sm' | 'md' | 'lg'; photoUrl?: string }> = ({
    name,
    size = 'md',
    photoUrl,
}) => {
    const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';
    if (photoUrl) {
        return (
            <img
                src={photoUrl}
                alt={name}
                className={`${sizeClass} rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-slate-800`}
            />
        );
    }
    return (
        <div
            className={`${sizeClass} rounded-full bg-gradient-to-br ${getAvatarGradient(name)} flex items-center justify-center flex-shrink-0 ring-2 ring-white dark:ring-slate-800 font-semibold text-white`}
        >
            {getInitials(name)}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Heart SVG icon (inline, fills red when liked)
// ---------------------------------------------------------------------------
const HeartSVG: React.FC<{ filled: boolean; className?: string }> = ({ filled, className = 'w-5 h-5' }) => (
    <svg
        viewBox="0 0 24 24"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.8}
        className={className}
        aria-hidden="true"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
        />
    </svg>
);

// ---------------------------------------------------------------------------
// ChatBubble SVG icon
// ---------------------------------------------------------------------------
const ChatBubbleSVG: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className={className}
        aria-hidden="true"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
    </svg>
);

// ---------------------------------------------------------------------------
// ExpandableText — caps at ~4 lines with "Show more" toggle
// ---------------------------------------------------------------------------
const ExpandableText: React.FC<{ text: string }> = ({ text }) => {
    const [expanded, setExpanded] = useState(false);
    const LIMIT = 280;
    const isLong = text.length > LIMIT;
    const display = !expanded && isLong ? text.slice(0, LIMIT) + '…' : text;
    return (
        <div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{display}</p>
            {isLong && (
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
                >
                    {expanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------
interface PostCardProps {
    post: any;
    username: string;
    userTier: UserTier;
    onToggleLike: (id: number) => void;
    onDeletePost: (id: number) => void;
    onAddComment: (postId: number, comment: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, username, userTier, onToggleLike, onDeletePost, onAddComment }) => {
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [commentInput, setCommentInput] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    const authorName: string = post.author_username ?? post.author ?? 'Unknown';
    const comments: any[] = post.comments ?? [];

    const handleSubmitComment = async () => {
        if (!commentInput.trim()) return;
        setSubmittingComment(true);
        try {
            await onAddComment(post.id, commentInput.trim());
            setCommentInput('');
        } finally {
            setSubmittingComment(false);
        }
    };

    return (
        <article className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-shadow hover:shadow-md">
            {/* Post header */}
            <div className="flex items-start justify-between p-5 pb-3">
                <div className="flex items-center gap-3">
                    <AvatarCircle name={authorName} photoUrl={post.avatar} />
                    <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">{authorName}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {post.created_at ? timeAgo(post.created_at) : post.time ?? ''}
                        </p>
                    </div>
                </div>
                {(userTier === 'admin' || post.author_username === username) && (
                    <button
                        onClick={() => onDeletePost(post.id)}
                        title="Delete post"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Post content */}
            <div className="px-5 pb-3">
                <ExpandableText text={post.content} />
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-5 px-5 py-3 border-t border-slate-100 dark:border-slate-700/60">
                <button
                    onClick={() => onToggleLike(post.id)}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-all duration-150 active:scale-125 ${
                        post.liked || post.is_liked
                            ? 'text-rose-500'
                            : 'text-slate-500 dark:text-slate-400 hover:text-rose-500'
                    }`}
                    aria-label={post.liked || post.is_liked ? 'Unlike' : 'Like'}
                >
                    <HeartSVG filled={!!(post.liked || post.is_liked)} />
                    <span>{post.likes ?? post.like_count ?? 0}</span>
                </button>

                <button
                    onClick={() => setCommentsOpen(v => !v)}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    aria-expanded={commentsOpen}
                >
                    <ChatBubbleSVG />
                    <span>{post.comment_count ?? comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}</span>
                </button>
            </div>

            {/* Collapsible comments */}
            {commentsOpen && (
                <div className="px-5 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/20">
                    {/* Existing comments */}
                    {comments.length > 0 ? (
                        <div className="space-y-3 pt-3">
                            {comments.map((c: any, i: number) => (
                                <div key={c.id ?? i} className="flex gap-2.5">
                                    <AvatarCircle name={c.author ?? 'User'} size="sm" />
                                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{c.author ?? 'User'}</span>
                                            {c.created_at && (
                                                <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{c.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500 pt-3">No comments yet. Be the first!</p>
                    )}

                    {/* Comment input */}
                    <div className="flex gap-2.5 pt-1">
                        <AvatarCircle name={username} size="sm" />
                        <div className="flex-1 flex gap-2">
                            <input
                                value={commentInput}
                                onChange={e => setCommentInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
                                placeholder="Write a comment…"
                                className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                            />
                            <button
                                onClick={handleSubmitComment}
                                disabled={!commentInput.trim() || submittingComment}
                                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                            >
                                {submittingComment ? '…' : 'Reply'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
};

// ---------------------------------------------------------------------------
// PostComposer
// ---------------------------------------------------------------------------
const PostComposer: React.FC<{ username: string; onSubmit: (content: string) => void }> = ({ username, onSubmit }) => {
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handlePost = async () => {
        if (!content.trim() || submitting) return;
        setSubmitting(true);
        try {
            await onSubmit(content.trim());
            setContent('');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
            <div className="flex gap-3">
                <AvatarCircle name={username} />
                <div className="flex-1">
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Share something with the community..."
                        rows={3}
                        className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600 resize-none text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                    />
                    <div className="flex justify-end mt-2">
                        <button
                            onClick={handlePost}
                            disabled={!content.trim() || submitting}
                            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                        >
                            {submitting ? 'Posting…' : 'Post'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Post {
    id: number;
    author: string;
    avatar: React.ElementType;
    time: string;
    content: string;
    likes: number;
    comments: { author: string; content: string }[];
    liked: boolean;
    channel?: string;
}

interface CommunityPageProps {
    posts: Post[];
    onPostCreated: (content: string) => void;
    onToggleLike: (postId: number) => void;
    onAddComment: (postId: number, comment: string) => void;
    userTier: UserTier;
    onDeletePost: (postId: number) => void;
    userScore: number;
    username: string;
}

// ---------------------------------------------------------------------------
// CommunityPage
// ---------------------------------------------------------------------------
export const CommunityPage: React.FC<CommunityPageProps> = ({
    posts: propPosts,
    onPostCreated,
    onToggleLike,
    onAddComment,
    userTier,
    onDeletePost,
    userScore,
    username,
}) => {
    const [newPostContent, setNewPostContent] = useState('');
    const { guardAction, nudgeProps } = useGuestNudge();

    // Discussion channels
    const [communityChannel, setCommunityChannel] = useState<CourseChannel | null>(null);
    const [courseChannels, setCourseChannels] = useState<CourseChannel[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
    const [threads, setThreads] = useState<DiscussionThread[]>([]);
    const [threadsLoading, setThreadsLoading] = useState(false);
    const [selectedThread, setSelectedThread] = useState<DiscussionThread | null>(null);
    const [showComposer, setShowComposer] = useState(false);
    const [newThreadTitle, setNewThreadTitle] = useState('');
    const [newThreadContent, setNewThreadContent] = useState('');
    const [composerError, setComposerError] = useState('');
    const [composerLoading, setComposerLoading] = useState(false);
    const toast = useToast();

    // Real API hooks
    const { data: apiPosts = [] } = usePosts();
    const createPostMutation = useCreatePost();
    const toggleLikeMutation = useToggleLike();
    const addCommentMutation = useAddComment();
    const deletePostMutation = useDeletePost();

    // Community analytics
    const { data: leaderboardData } = useCommunityLeaderboard();
    const { data: apiTrendingTopics = [] } = useCommunityTrendingTopics();

    // Load channels
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [community, allChannels] = await Promise.all([
                    discussionService.getCommunityChannel(),
                    discussionService.listChannels(),
                ]);
                if (!mounted) return;
                setCommunityChannel(community);
                setCourseChannels(allChannels.filter(c => c.course !== null));
                setSelectedChannelId(community.id);
            } catch (err) {
                console.error('Failed to load community channel', err);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Load threads when channel changes
    useEffect(() => {
        if (!selectedChannelId) return;
        let mounted = true;
        setThreadsLoading(true);
        (async () => {
            try {
                const th = await discussionService.getChannelThreads(selectedChannelId);
                if (!mounted) return;
                setThreads(th || []);
            } catch (err) {
                console.error('Failed to load threads for channel', selectedChannelId, err);
                if (mounted) setThreads([]);
            } finally {
                if (mounted) setThreadsLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [selectedChannelId]);

    const staticTrendingTopics = ['#NextJS14', '#RustLang', '#AI_Ethics', '#WebAssembly'];
    const leaderboard = leaderboardData?.top_users ?? [];
    const userRank = leaderboardData?.user_rank;
    const userStats = leaderboardData?.user_stats;
    const trendingTopics = apiTrendingTopics.length > 0
        ? apiTrendingTopics.map((t: any) => t.tag)
        : staticTrendingTopics;

    const activeChannelName = (() => {
        if (!selectedChannelId) return 'Community';
        if (communityChannel && selectedChannelId === communityChannel.id) return 'Community';
        const ch = courseChannels.find(c => c.id === selectedChannelId);
        return ch?.display_name ?? ch?.course_title ?? 'Channel';
    })();

    // Merge API posts with prop posts, prefer API posts if available
    const displayPosts: any[] = apiPosts.length > 0 ? apiPosts : propPosts;

    // Post stats this week
    const postsThisWeek = apiPosts.filter((p: any) => {
        if (!p.created_at) return false;
        const diff = Date.now() - new Date(p.created_at).getTime();
        return diff < 7 * 24 * 60 * 60 * 1000;
    }).length;

    const handleCreatePost = async (content: string) => {
        if (!content.trim()) return;
        if (guardAction('post to the community')) return;
        try {
            if (createPostMutation.mutateAsync) {
                await createPostMutation.mutateAsync({ content });
            } else {
                onPostCreated(content);
            }
        } catch {
            onPostCreated(content);
        }
    };

    const handleToggleLike = (postId: number) => {
        if (toggleLikeMutation.mutate) {
            toggleLikeMutation.mutate(postId);
        } else {
            onToggleLike(postId);
        }
    };

    const handleAddComment = async (postId: number, comment: string) => {
        if (guardAction('comment on posts')) return;
        if (addCommentMutation.mutateAsync) {
            await addCommentMutation.mutateAsync({ postId, data: { content: comment } });
        } else {
            onAddComment(postId, comment);
        }
    };

    const handleDeletePost = (postId: number) => {
        if (deletePostMutation.mutate) {
            deletePostMutation.mutate(postId);
        } else {
            onDeletePost(postId);
        }
    };

    const handleCreateThread = async () => {
        if (!newThreadTitle.trim() || !newThreadContent.trim() || !selectedChannelId) return;
        if (guardAction('start a discussion thread')) return;
        setComposerLoading(true);
        setComposerError('');
        try {
            const created = await discussionService.createThread({
                channel: selectedChannelId,
                title: newThreadTitle.trim(),
                content: newThreadContent.trim(),
            });
            setThreads(prev => [created, ...prev]);
            setShowComposer(false);
            setNewThreadTitle('');
            setNewThreadContent('');
            toast.success('Thread posted!');
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Failed to create thread';
            setComposerError(msg);
            toast.error(msg);
        } finally {
            setComposerLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6">

            {/* ------------------------------------------------------------------ */}
            {/* Left Sidebar — Channels                                             */}
            {/* ------------------------------------------------------------------ */}
            <div className="w-full md:w-64 flex-shrink-0 space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-1">
                        Channels
                    </h3>
                    <nav className="space-y-0.5">
                        {communityChannel && (
                            <button
                                key={communityChannel.id}
                                onClick={() => setSelectedChannelId(communityChannel.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                                    selectedChannelId === communityChannel.id
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                            >
                                <HashIcon className="w-4 h-4 opacity-50 shrink-0" />
                                Community
                            </button>
                        )}
                        {courseChannels.length > 0 && (
                            <>
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide px-3 pt-3 pb-1">
                                    Course Discussions
                                </p>
                                {courseChannels.map(ch => (
                                    <button
                                        key={ch.id}
                                        onClick={() => setSelectedChannelId(ch.id)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                                            selectedChannelId === ch.id
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <HashIcon className="w-4 h-4 opacity-50 shrink-0" />
                                        <span className="truncate">{ch.display_name ?? ch.course_title ?? `Channel ${ch.id}`}</span>
                                    </button>
                                ))}
                            </>
                        )}
                        {!communityChannel && courseChannels.length === 0 && (
                            <div className="space-y-1.5 px-2 py-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-8 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        )}
                    </nav>
                </div>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* Main Feed (col-span-2 equivalent on desktop)                        */}
            {/* ------------------------------------------------------------------ */}
            <div className="flex-1 min-w-0 space-y-5">

                {/* Post composer */}
                <PostComposer username={username} onSubmit={handleCreatePost} />
                <GuestNudge {...nudgeProps} />

                {/* Threads section */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                            <span className="text-slate-400 dark:text-slate-500 font-normal">#</span>{activeChannelName}
                        </h3>
                        {selectedChannelId && (
                            <button
                                onClick={() => { setShowComposer(true); setComposerError(''); }}
                                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                            >
                                + New Thread
                            </button>
                        )}
                    </div>

                    {showComposer && (
                        <div className="mb-4 p-4 border border-indigo-100 dark:border-indigo-900/60 rounded-xl bg-slate-50 dark:bg-slate-900/40 space-y-3">
                            <input
                                value={newThreadTitle}
                                onChange={e => setNewThreadTitle(e.target.value)}
                                placeholder="Thread title"
                                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <textarea
                                value={newThreadContent}
                                onChange={e => setNewThreadContent(e.target.value)}
                                placeholder="Start the discussion…"
                                rows={3}
                                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            {composerError && <p className="text-xs text-red-500">{composerError}</p>}
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => { setShowComposer(false); setNewThreadTitle(''); setNewThreadContent(''); setComposerError(''); }}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateThread}
                                    disabled={composerLoading || !newThreadTitle.trim() || !newThreadContent.trim()}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                                >
                                    {composerLoading ? 'Posting…' : 'Post Thread'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {threadsLoading ? (
                            <div className="space-y-2">
                                {[1, 2].map(i => (
                                    <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : threads.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                                No threads yet — be the first to start a discussion.
                            </p>
                        ) : (
                            threads.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => setSelectedThread(t)}
                                    className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-colors group"
                                >
                                    <div className="flex justify-between items-center gap-3">
                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                                {t.title}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {t.author.username} · {timeAgo(t.created_at)}
                                            </p>
                                        </div>
                                        <span className="flex-shrink-0 text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full whitespace-nowrap">
                                            {t.reply_count} {t.reply_count === 1 ? 'reply' : 'replies'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Social post feed */}
                {displayPosts.length > 0 ? (
                    <div className="space-y-4">
                        {displayPosts.map((post: any) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                username={username}
                                userTier={userTier}
                                onToggleLike={handleToggleLike}
                                onDeletePost={handleDeletePost}
                                onAddComment={handleAddComment}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-10 text-center">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">No posts yet. Be the first to share something!</p>
                    </div>
                )}
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* Right Sidebar                                                       */}
            {/* ------------------------------------------------------------------ */}
            <div className="w-full md:w-72 flex-shrink-0 space-y-5">

                {/* Stats card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
                        Community Stats
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-300">Posts this week</span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">{postsThisWeek}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-300">Total posts</span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">{apiPosts.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-300">Discussion threads</span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">{threads.length}</span>
                        </div>
                    </div>
                </div>

                {/* Global Leaderboard */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg p-5 text-white">
                    <div className="flex items-center gap-2.5 mb-2">
                        <TrophyIcon className="w-5 h-5 text-yellow-300" />
                        <h3 className="font-bold">Global Leaderboard</h3>
                    </div>
                    <div className="flex items-start gap-2 mb-4 p-2.5 bg-white/10 rounded-xl border border-white/20">
                        <LightbulbIcon className="w-4 h-4 text-yellow-300 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-indigo-100 leading-relaxed">
                            <strong>Global XP:</strong> Points earned from all study groups, quizzes, and activities.
                        </p>
                    </div>
                    <div className="space-y-2.5">
                        {leaderboard.map((u: any, i: number) => (
                            <div
                                key={u.username}
                                className={`flex items-center gap-3 rounded-xl transition-colors ${
                                    u.username === username ? 'bg-white/15 px-2 py-1.5 -mx-2' : ''
                                }`}
                            >
                                <span className="font-bold text-sm opacity-60 w-4 flex-shrink-0">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{u.username}</p>
                                    <p className="text-xs opacity-60">Level {u.level}</p>
                                </div>
                                <span className="font-bold text-xs bg-white/20 px-2 py-1 rounded-lg flex-shrink-0">
                                    {(u.xp_points ?? u.points ?? 0).toLocaleString()}
                                </span>
                            </div>
                        ))}
                        {leaderboard.length === 0 && (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-9 bg-white/10 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        )}
                        {userRank && userRank > 10 && (
                            <div className="pt-2 border-t border-white/20">
                                <div className="flex items-center gap-3 bg-white/20 rounded-xl px-2 py-2">
                                    <span className="font-bold text-sm opacity-70 w-4">{userRank}</span>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">You</p>
                                        <p className="text-xs opacity-60">Level {userStats?.level}</p>
                                    </div>
                                    <span className="font-bold text-xs bg-white/30 px-2 py-1 rounded-lg">
                                        {(userStats?.xp_points ?? 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Trending Topics */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-100">
                        <TrendingIcon className="w-4 h-4 text-rose-500" />
                        <h3 className="font-bold text-sm">Trending Topics</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {trendingTopics.map((topic: string) => (
                            <span
                                key={topic}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-full cursor-pointer transition-colors"
                            >
                                {topic}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Thread Modal */}
            {selectedThread && (
                <ThreadModal threadId={selectedThread.id} onClose={() => setSelectedThread(null)} />
            )}
        </div>
    );
};
