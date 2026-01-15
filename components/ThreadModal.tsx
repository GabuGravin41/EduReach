import React, { useEffect, useState } from 'react';
import { discussionService, DiscussionThread, ThreadReply } from '../src/services/discussionService';
import { Button } from './ui/Button';

interface Props {
  threadId: number | null;
  onClose: () => void;
}

export const ThreadModal: React.FC<Props> = ({ threadId, onClose }) => {
  const [thread, setThread] = useState<DiscussionThread | null>(null);
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [newReply, setNewReply] = useState('');

  useEffect(() => {
    if (!threadId) return;
    let mounted = true;
    (async () => {
      try {
        const t = await discussionService.getThread(threadId);
        const r = await discussionService.listReplies(threadId);
        if (!mounted) return;
        setThread(t);
        setReplies(r || []);
      } catch (err) {
        console.error('Failed to load thread', err);
      }
    })();
    return () => { mounted = false; };
  }, [threadId]);

  const handlePostReply = async () => {
    if (!threadId || !newReply.trim()) return;
    try {
      const created = await discussionService.createReply(threadId, newReply.trim());
      setReplies(prev => [...prev, created]);
      setNewReply('');
    } catch (err) {
      console.error('Failed to post reply', err);
    }
  };

  const handleUpvote = async (replyId: number) => {
    try {
      const res = await discussionService.upvoteReply(replyId);
      setReplies(prev => prev.map(r => r.id === replyId ? { ...r, upvotes: res.upvotes } : r));
    } catch (err) {
      console.error('Upvote failed', err);
    }
  };

  if (!threadId) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold">{thread?.title}</h3>
            <p className="text-sm text-slate-500">Posted by {thread?.author.username} • {thread?.views} views</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="prose dark:prose-invert text-slate-700 dark:text-slate-200">{thread?.content}</div>

          <div>
            <h4 className="font-semibold">Replies</h4>
            <div className="space-y-3 mt-2">
              {replies.map(r => (
                <div key={r.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{r.author.username}</p>
                      <p className="text-sm text-slate-500">{r.content}</p>
                    </div>
                    <div className="text-sm text-slate-500">
                      <button onClick={() => handleUpvote(r.id)} className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600">▲ {r.upvotes}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <textarea value={newReply} onChange={(e) => setNewReply(e.target.value)} placeholder="Write a reply..." className="w-full p-2 rounded border border-slate-200 dark:border-slate-700 bg-transparent" />
            <div className="flex justify-end mt-2">
              <Button onClick={handlePostReply} disabled={!newReply.trim()}>Reply</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreadModal;
