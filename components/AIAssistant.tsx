import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, QuizQuestion } from '../types';
import { BotIcon } from './icons/BotIcon';
import { UserIcon } from './icons/UserIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { QuizView } from './QuizView';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';


interface AIAssistantProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  onGenerateQuiz: () => Promise<void>;
  onSendMessage: (message: string) => Promise<void>;
  quiz: QuizQuestion[] | null;
}

type ActiveTab = 'chat' | 'quiz';

export const AIAssistant: React.FC<AIAssistantProps> = ({
  messages,
  setMessages,
  isLoading,
  setIsLoading,
  onGenerateQuiz,
  onSendMessage,
  quiz,
}) => {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const message = input;
    setInput('');
    await onSendMessage(message);
  };
  
  const handleGenerateQuizClick = () => {
    onGenerateQuiz();
    setActiveTab('quiz');
  }

  const TabButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
  }> = ({ label, icon, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
        isActive
          ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
          : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/5 h-full flex flex-col">
        <div className="flex border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <TabButton label="AI Assistant" icon={<SparklesIcon className="w-5 h-5"/>} isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
            <TabButton label="Knowledge Check" icon={<ClipboardCheckIcon className="w-5 h-5"/>} isActive={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} />
        </div>

        {activeTab === 'chat' && (
             <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 p-4 overflow-y-auto">
                    <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <BotIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </div>
                        )}
                        <div
                            className={`p-3 rounded-lg max-w-sm whitespace-pre-wrap ${
                            msg.role === 'user'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                        >
                            {msg.content}
                            {isLoading && msg.role === 'model' && index === messages.length - 1 && msg.content === '' && (
                                <div className="flex items-center space-x-1">
                                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                                </div>
                            )}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </div>
                        )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="mb-2">
                        <button 
                            onClick={handleGenerateQuizClick}
                            disabled={isLoading || quiz !== null}
                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <LightbulbIcon className="w-4 h-4" />
                            {quiz !== null ? 'Quiz Generated!' : 'Generate a quiz from transcript'}
                        </button>
                    </div>
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything about the video..."
                        disabled={isLoading}
                        className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-600">
                        Send
                    </button>
                    </form>
                </div>
             </div>
        )}

        {activeTab === 'quiz' && (
            <QuizView quiz={quiz} />
        )}
    </div>
  );
};
