import React, { useState } from 'react';
import { TrophyIcon } from './icons/TrophyIcon';
import { HeartIcon } from './icons/HeartIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { UserTier } from '../App';

const leaderboard = [
  { name: 'Alice', points: 1250, avatar: UserCircleIcon },
  { name: 'Bob', points: 1100, avatar: UserCircleIcon },
  { name: 'Charlie', points: 980, avatar: UserCircleIcon },
];

interface Post {
  id: number;
  author: string;
  avatar: React.ElementType;
  time: string;
  content: string;
  likes: number;
  comments: { author: string, content: string }[];
  liked: boolean;
}

interface CommunityPageProps {
  posts: Post[];
  onPostCreated: (content: string) => void;
  onToggleLike: (postId: number) => void;
  onAddComment: (postId: number, comment: string) => void;
  userTier: UserTier;
  onDeletePost: (postId: number) => void;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({ posts, onPostCreated, onToggleLike, onAddComment, userTier, onDeletePost }) => {
  const [newPostContent, setNewPostContent] = useState('');
  const [commentingPostId, setCommentingPostId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');

  const handlePostSubmit = () => {
    if (newPostContent.trim()) {
      onPostCreated(newPostContent);
      setNewPostContent('');
    }
  };

  const handleCommentSubmit = (postId: number) => {
    if (newComment.trim()) {
      onAddComment(postId, newComment);
      setNewComment('');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Community Hub</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg shadow-slate-900/5">
                <textarea 
                    placeholder="Share something with the community..."
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={3}
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                    <button onClick={handlePostSubmit} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-slate-400" disabled={!newPostContent.trim()}>
                        Post
                    </button>
                </div>
            </div>

            {posts.map(post => (
                <div key={post.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg shadow-slate-900/5">
                    <div className="flex items-center mb-4">
                        <post.avatar className="w-10 h-10 text-slate-400" />
                        <div className="ml-3 flex-1">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">{post.author}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{post.time}</p>
                        </div>
                         {userTier === 'admin' && (
                            <button onClick={() => onDeletePost(post.id)} className="p-2 rounded-md text-slate-500 hover:bg-red-100 dark:text-slate-400 dark:hover:bg-red-900/50 hover:text-red-600" aria-label="Delete Post">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mb-4">{post.content}</p>
                    <div className="flex items-center space-x-6 text-sm text-slate-500 dark:text-slate-400">
                        <button onClick={() => onToggleLike(post.id)} className={`flex items-center gap-1.5 transition-colors ${post.liked ? 'text-red-500' : 'hover:text-red-500'}`}>
                          <HeartIcon className="w-4 h-4" fill={post.liked ? 'currentColor' : 'none'} /> {post.likes}
                        </button>
                        <button onClick={() => setCommentingPostId(commentingPostId === post.id ? null : post.id)} className="flex items-center gap-1.5 hover:text-indigo-500"><MessageSquareIcon className="w-4 h-4" /> {post.comments.length}</button>
                    </div>
                    {commentingPostId === post.id && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        {post.comments.map((comment, i) => (
                           <div key={i} className="flex items-start gap-2 mb-2">
                              <UserCircleIcon className="w-6 h-6 text-slate-400 flex-shrink-0 mt-1"/>
                              <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg">
                                <p className="font-semibold text-xs">{comment.author}</p>
                                <p className="text-sm">{comment.content}</p>
                              </div>
                           </div>
                        ))}
                        <div className="flex gap-2 mt-2">
                          <input type="text" placeholder="Write a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1 p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <button onClick={() => handleCommentSubmit(post.id)} className="px-3 py-1 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700" disabled={!newComment.trim()}>Comment</button>
                        </div>
                      </div>
                    )}
                </div>
            ))}
        </div>

        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg shadow-slate-900/5">
                <div className="flex items-center gap-3 mb-4">
                    <TrophyIcon className="w-6 h-6 text-yellow-500" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Top Learners</h3>
                </div>
                <ul className="space-y-4">
                    {leaderboard.map((user, index) => (
                        <li key={user.name} className="flex items-center">
                            <span className="font-bold text-slate-500 dark:text-slate-400 w-6">{index + 1}.</span>
                            <user.avatar className="w-8 h-8 text-slate-400 mx-2" />
                            <span className="flex-grow font-medium text-slate-700 dark:text-slate-200">{user.name}</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{user.points} pts</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>

      </div>
    </div>
  );
};
