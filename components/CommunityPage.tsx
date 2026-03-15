import React, { useState, useEffect } from 'react';
import { TrophyIcon } from './icons/TrophyIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { HeartIcon } from './icons/HeartIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { discussionService, CourseChannel, DiscussionThread } from '../src/services/discussionService';
import { ThreadModal } from './ThreadModal';
import { TrashIcon } from './icons/TrashIcon';
import { HashIcon } from './icons/HashIcon';
import { TrendingIcon } from './icons/TrendingIcon';
import { UserTier } from '../App';
import { useCommunityLeaderboard, useCommunityTrendingTopics } from '../src/hooks/useCommunityAnalytics';

interface Post {
    id: number;
    author: string;
    avatar: React.ElementType;
    time: string;
    content: string;
    likes: number;
    comments: { author: string, content: string }[];
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

export const CommunityPage: React.FC<CommunityPageProps> = ({
    posts,
    onPostCreated,
    onToggleLike,
    onAddComment,
    userTier,
    onDeletePost,
    userScore,
    username
}) => {
    const [newPostContent, setNewPostContent] = useState('');

    // Community channel (standalone, not tied to any course) + course channels in sidebar
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

    // Community analytics (leaderboard + trending topics)
    const { data: leaderboardData } = useCommunityLeaderboard();
    const { data: apiTrendingTopics = [] } = useCommunityTrendingTopics();

    // Load the community channel (creates it server-side if it doesn't exist yet)
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
                // Course channels = all channels except the community one
                setCourseChannels(allChannels.filter(c => c.course !== null));
                setSelectedChannelId(community.id);
            } catch (err) {
                console.error('Failed to load community channel', err);
            }
        })();
        return () => { mounted = false; };
    }, []);

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
        ? apiTrendingTopics.map(t => t.tag)
        : staticTrendingTopics;

    const activeChannelName = (() => {
        if (!selectedChannelId) return 'Community';
        if (communityChannel && selectedChannelId === communityChannel.id) return 'Community';
        const ch = courseChannels.find(c => c.id === selectedChannelId);
        return ch?.display_name ?? ch?.course_title ?? 'Channel';
    })();

    const handlePostSubmit = () => {
        if (newPostContent.trim()) {
            onPostCreated(newPostContent);
            setNewPostContent('');
        }
    };

    const handleCreateThread = async () => {
        if (!newThreadTitle.trim() || !newThreadContent.trim() || !selectedChannelId) return;
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
        } catch (err: any) {
            setComposerError(err?.response?.data?.detail || 'Failed to create thread');
        } finally {
            setComposerLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6">

            {/* Left Sidebar - Navigation */}
            <div className="w-full md:w-64 flex-shrink-0 space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 px-2">
                        Channels
                    </h3>
                    <nav className="space-y-1">
                        {/* Community channel always first */}
                        {communityChannel && (
                            <button
                                key={communityChannel.id}
                                onClick={() => setSelectedChannelId(communityChannel.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedChannelId === communityChannel.id
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <HashIcon className="w-4 h-4 opacity-50 shrink-0" />
                                Community
                            </button>
                        )}
                        {/* Course discussion channels */}
                        {courseChannels.length > 0 && (
                            <>
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide px-3 pt-3 pb-1">
                                    Course Discussions
                                </p>
                                {courseChannels.map(ch => (
                                    <button
                                        key={ch.id}
                                        onClick={() => setSelectedChannelId(ch.id)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedChannelId === ch.id
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        <HashIcon className="w-4 h-4 opacity-50 shrink-0" />
                                        <span className="truncate">{ch.display_name ?? ch.course_title ?? `Channel ${ch.id}`}</span>
                                    </button>
                                ))}
                            </>
                        )}
                        {!communityChannel && courseChannels.length === 0 && (
                            <p className="px-3 py-2 text-sm text-slate-400">Loading channels…</p>
                        )}
                    </nav>
                </div>
            </div>

            {/* Center - Feed */}
            <div className="flex-1 min-w-0 space-y-6">
                {/* Create Post */}
                {/* Threads List (for selected channel) */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">#{activeChannelName}</h3>
                        {selectedChannelId && (
                            <button
                                onClick={() => { setShowComposer(true); setComposerError(''); }}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:hover:text-indigo-400"
                            >
                                + New Thread
                            </button>
                        )}
                    </div>

                    {showComposer && (
                        <div className="mb-4 p-4 border border-indigo-100 dark:border-indigo-900 rounded-xl bg-slate-50 dark:bg-slate-900/40 space-y-3">
                            <input
                                value={newThreadTitle}
                                onChange={(e) => setNewThreadTitle(e.target.value)}
                                placeholder="Thread title"
                                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                            />
                            <textarea
                                value={newThreadContent}
                                onChange={(e) => setNewThreadContent(e.target.value)}
                                placeholder="Start the discussion…"
                                rows={3}
                                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none"
                            />
                            {composerError && (
                                <p className="text-xs text-red-500">{composerError}</p>
                            )}
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => { setShowComposer(false); setNewThreadTitle(''); setNewThreadContent(''); setComposerError(''); }}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateThread}
                                    disabled={composerLoading || !newThreadTitle.trim() || !newThreadContent.trim()}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
                                >
                                    {composerLoading ? 'Posting…' : 'Post Thread'}
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-3">
                        {threadsLoading ? (
                            <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
                                <span className="inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                Loading threads…
                            </div>
                        ) : threads.length === 0 ? (
                            <p className="text-sm text-slate-500 py-4">No threads yet — be the first to start a discussion in this channel.</p>
                        ) : (
                            threads.map(t => (
                                <div key={t.id} onClick={() => setSelectedThread(t)} className="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold">{t.title}</h4>
                                            <p className="text-sm text-slate-500">{t.author.username} • {new Date(t.created_at).toLocaleString()}</p>
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full">{t.reply_count} replies</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Posts */}
                <div className="space-y-4">
                    {posts.map(post => (
                        <div key={post.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <post.avatar className="w-10 h-10 text-slate-400" />
                                    <div>
                                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">{post.author}</h4>
                                        <p className="text-xs text-slate-500">{post.time} • #{activeChannelName}</p>
                                    </div>
                                </div>
                                {userTier === 'admin' && (
                                    <button onClick={() => onDeletePost(post.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                                {post.content}
                            </p>

                            <div className="flex items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={() => onToggleLike(post.id)}
                                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${post.liked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
                                        }`}
                                >
                                    <HeartIcon className="w-5 h-5" fill={post.liked ? "currentColor" : "none"} />
                                    {post.likes}
                                </button>
                                <button className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                                    <MessageSquareIcon className="w-5 h-5" />
                                    {post.comments.length} Comments
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Sidebar - Trending */}
            <div className="w-full md:w-80 flex-shrink-0 space-y-6">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <TrophyIcon className="w-6 h-6 text-yellow-300" />
                        <h3 className="font-bold text-lg">Global Leaderboard</h3>
                    </div>
                    <div className="flex items-start gap-2 mb-4 p-2.5 bg-white/10 rounded-lg border border-white/20">
                        <LightbulbIcon className="w-4 h-4 text-yellow-300 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-indigo-100 leading-relaxed">
                            <strong>Global XP:</strong> Points earned from all your study groups, quizzes, and activities combined!
                        </p>
                    </div>
                    <div className="space-y-4">
                        {leaderboard.map((u: any, i) => (
                            <div key={u.username} className={`flex items-center gap-3 ${u.username === username ? 'bg-white/10 rounded-lg -mx-2 px-2 py-1' : ''}`}>
                                <span className="font-bold opacity-70 w-4">{i + 1}</span>
                                <div className="flex-1">
                                    <p className="font-medium text-sm truncate max-w-[120px]">{u.username}</p>
                                    <p className="text-xs opacity-70">Level {u.level}</p>
                                </div>
                                <span className="font-bold text-sm bg-white/20 px-2 py-1 rounded">
                                    {u.xp_points ?? u.points}
                                </span>
                            </div>
                        ))}
                        {userRank && userRank > 10 && (
                            <div className="pt-2 border-t border-white/20 mt-2">
                                <div className="flex items-center gap-3 bg-white/20 rounded-lg -mx-2 px-2 py-2">
                                    <span className="font-bold opacity-70 w-4">{userRank}</span>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">You</p>
                                        <p className="text-xs opacity-70">Level {userStats?.level}</p>
                                    </div>
                                    <span className="font-bold text-sm bg-white/30 px-2 py-1 rounded">
                                        {userStats?.xp_points}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-100">
                        <TrendingIcon className="w-5 h-5 text-rose-500" />
                        <h3 className="font-bold">Trending Topics</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {trendingTopics.map(topic => (
                            <span key={topic} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-sm rounded-full cursor-pointer transition-colors">
                                {topic}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            {selectedThread && (
                <ThreadModal threadId={selectedThread.id} onClose={() => setSelectedThread(null)} />
            )}
        </div>
    );
};
