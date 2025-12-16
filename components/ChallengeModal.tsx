import React, { useState } from 'react';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SwordsIcon } from './icons/SwordsIcon';
import { XIcon } from './icons/XIcon';

interface ChallengeModalProps {
  examTitle: string;
  onClose: () => void;
}

const friends = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
  { id: 4, name: 'David' },
  { id: 5, name: 'Eve' },
];

export const ChallengeModal: React.FC<ChallengeModalProps> = ({ examTitle, onClose }) => {
  const [selectedFriend, setSelectedFriend] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 w-full max-w-md relative animate-in fade-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
          <XIcon className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/50 rounded-full mb-4">
                <SwordsIcon className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Challenge a Friend</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-1">You are challenging a friend to:</p>
            <p className="font-semibold text-indigo-600 dark:text-indigo-400 mb-6">{examTitle}</p>

            <div className="w-full text-left mb-4">
                <h3 className="font-semibold mb-2">Select a friend:</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {friends.map(friend => (
                        <button 
                            key={friend.id}
                            onClick={() => setSelectedFriend(friend.id)}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg border-2 transition-colors ${
                                selectedFriend === friend.id 
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50'
                                : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            <UserCircleIcon className="w-8 h-8 text-slate-400" />
                            <span className="font-medium text-slate-700 dark:text-slate-200">{friend.name}</span>
                        </button>
                    ))}
                </div>
            </div>
            
            <button 
                onClick={onClose}
                disabled={!selectedFriend}
                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
                Send Challenge
            </button>
        </div>
      </div>
    </div>
  );
};
