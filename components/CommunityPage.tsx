
import React, { useState } from 'react';
import { TrophyIcon } from './icons/TrophyIcon';
import { HeartIcon } from './icons/HeartIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { HashIcon } from './icons/HashIcon';
import { TrendingIcon } from './icons/TrendingIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { UserTier } from '../App';

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
  const [activeChannel, setActiveChannel] = useState('general');

  const channels = [
      { id: 'general', name: 'General', count: 124 },
      { id: 'react', name: 'React Developers', count: 85 },
      { id: 'python', name: 'Pythonistas', count: 62 },
      { id: 'exams', name: 'Exam Prep', count: 45 },
      { id: 'help', name: 'Homework Help', count: 30 },
  ];

  const trendingTopics = [
      '#NextJS14', '#RustLang', '#AI_Ethics', '#WebAssembly'
  ];

  // Dynamic Leaderboard merging static mock users with the current user
  const leaderboard = [
    { name: 'Alice_Dev', points: 2450, role: 'Top Contributor' },
    { name: 'Bob_Code', points: 1980, role: 'Rising Star' },
    { name: username, points: userScore, role: 'You' }, // Dynamic User
    { name: 'Charlie_JS', points: 1540, role: 'Member' },
    { name: 'Dave_AI', points: 800, role: 'Member' },
  ].sort((a, b) => b.points - a.points); // Sort by points descending

  const handlePostSubmit = () => {
    if (newPostContent.trim()) {
      onPostCreated(newPostContent);
      setNewPostContent('');
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
                    {channels.map(channel => (
                        <button
                            key={channel.id}
                            onClick={() => setActiveChannel(channel.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeChannel === channel.id
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <HashIcon className="w-4 h-4 opacity-50" />
                                {channel.name}
                            </span>
                            {channel.count > 0 && (
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs px-2 py-0.5 rounded-full">
                                    {channel.count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 px-2">
                    My Groups
                </h3>
                <div className="space-y-3 px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                            JS
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">JS Masters</p>
                            <p className="text-xs text-slate-500">12 members online</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xs">
                            AI
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">AI Learners</p>
                            <p className="text-xs text-slate-500">5 members online</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Center - Feed */}
        <div className="flex-1 min-w-0 space-y-6">
            {/* Create Post */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                    <div className="flex-1">
                        <textarea 
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder={`What's on your mind? Share with #${activeChannel}...`}
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none min-h-[80px]"
                        />
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700 mt-2">
                            <div className="flex gap-2">
                                {/* Add attachment icons here if needed */}
                            </div>
                            <button 
                                onClick={handlePostSubmit}
                                disabled={!newPostContent.trim()}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Post
                            </button>
                        </div>
                    </div>
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
                                    <p className="text-xs text-slate-500">{post.time} • #{activeChannel}</p>
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
                                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                                    post.liked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
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
                <div className="flex items-center gap-3 mb-4">
                    <TrophyIcon className="w-6 h-6 text-yellow-300" />
                    <h3 className="font-bold text-lg">Leaderboard</h3>
                </div>
                <div className="space-y-4">
                    {leaderboard.map((user, i) => (
                        <div key={user.name} className={`flex items-center gap-3 ${user.role === 'You' ? 'bg-white/10 rounded-lg -mx-2 px-2 py-1' : ''}`}>
                            <span className="font-bold opacity-70 w-4">{i + 1}</span>
                            <div className="flex-1">
                                <p className="font-medium text-sm">{user.name}</p>
                                <p className="text-xs opacity-70">{user.role}</p>
                            </div>
                            <span className="font-bold text-sm bg-white/20 px-2 py-1 rounded">
                                {user.points}
                            </span>
                        </div>
                    ))}
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
    </div>
  );
};
