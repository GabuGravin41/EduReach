import React, { useState, useEffect } from 'react';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SwordsIcon } from './icons/SwordsIcon';
import { XIcon } from './icons/XIcon';
import { assessmentService } from '../src/services/assessmentService';
import { authService, type ChallengeableUser } from '../src/services/authService';

interface ChallengeModalProps {
  examTitle: string;
  assessmentId: number;
  shareToken?: string;
  onClose: () => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({ examTitle, assessmentId, shareToken, onClose }) => {
  const [mode, setMode] = useState<'choose' | 'friend' | 'public'>('choose');
  const [selectedFriend, setSelectedFriend] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [publicListed, setPublicListed] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [challengeableUsers, setChallengeableUsers] = useState<ChallengeableUser[]>([]);
  const [friendsLoadState, setFriendsLoadState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  useEffect(() => {
    if (mode !== 'public') return;
    if (publicListed !== 'idle') return;
    setPublicListed('loading');
    assessmentService.publishPublicChallenge(assessmentId)
      .then(() => setPublicListed('ok'))
      .catch(() => setPublicListed('error'));
  }, [mode, assessmentId, publicListed]);

  useEffect(() => {
    if (mode !== 'friend') return;
    if (friendsLoadState !== 'idle') return;
    setFriendsLoadState('loading');
    authService.getChallengeableUsers()
      .then((users) => {
        setChallengeableUsers(users);
        setFriendsLoadState('ok');
      })
      .catch(() => setFriendsLoadState('error'));
  }, [mode, friendsLoadState]);

  const handleBackFromFriend = () => {
    setSelectedFriend(null);
    setFriendsLoadState('idle');
    setMode('choose');
  };

  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const challengeLink = shareToken
    ? `${baseOrigin}/assessments/${assessmentId}?share_token=${shareToken}`
    : `${baseOrigin}/assessments/${assessmentId}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(challengeLink);
        setCopied(true);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = challengeLink;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(ok);
      }
    } catch {
      setCopied(false);
    } finally {
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 w-full max-w-md relative animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
          <XIcon className="w-6 h-6" />
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 rounded-full">
              <SwordsIcon className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Challenge others</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{examTitle}</p>
            </div>
          </div>

          {mode === 'choose' && (
            <>
              <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">Choose how to run this challenge:</p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setMode('friend')}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors text-left"
                >
                  <UserCircleIcon className="w-10 h-10 text-indigo-500 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 block">Challenge a friend</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Select someone to invite to this assessment</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('public')}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-colors text-left"
                >
                  <SwordsIcon className="w-10 h-10 text-amber-500 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 block">Public challenge</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Share a link — anyone can join and compare results</span>
                  </div>
                </button>
              </div>
            </>
          )}

          {mode === 'friend' && (
            <>
              <div className="w-full text-left mb-4">
                <h3 className="font-semibold mb-2 text-slate-700 dark:text-slate-300">Select a user to challenge</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {friendsLoadState === 'loading' && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">Loading users…</p>
                  )}
                  {friendsLoadState === 'error' && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 py-4 text-center">Could not load users. Try again later.</p>
                  )}
                  {friendsLoadState === 'ok' && challengeableUsers.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">No other users on the platform yet. Use “Public challenge” to share a link.</p>
                  )}
                  {friendsLoadState === 'ok' && challengeableUsers.map((user) => {
                    const avatarUrl = user.avatar ? authService.getMediaUrl(user.avatar) : null;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedFriend(user.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg border-2 transition-colors ${
                          selectedFriend === user.id
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50'
                            : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <UserCircleIcon className="w-8 h-8 text-slate-400 flex-shrink-0" />
                        )}
                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{user.display_name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleBackFromFriend} className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium">
                  Back
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (selectedFriend) {
                      await handleCopyLink();
                    }
                    onClose();
                  }}
                  disabled={!selectedFriend}
                  className="flex-1 bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                  Send challenge
                </button>
              </div>
            </>
          )}

          {mode === 'public' && (
            <>
              {publicListed === 'ok' && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-3 font-medium">
                  This challenge is now listed in Public challenges. Everyone on the platform can see it and join.
                </p>
              )}
              {publicListed === 'error' && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">You can still share the link below. Listing on the platform could not be updated.</p>
              )}
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Anyone with this link can open the assessment, join the challenge, and compare results with you.</p>
              <div className="flex gap-2 mb-4">
                <input
                  readOnly
                  value={challengeLink}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-sm"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm whitespace-nowrap"
                >
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode('choose')} className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium">
                  Back
                </button>
                <button type="button" onClick={onClose} className="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700">
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
