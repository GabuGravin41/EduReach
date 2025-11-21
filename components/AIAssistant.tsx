import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, QuizQuestion } from '../types';
import { BotIcon } from './icons/BotIcon';
import { UserIcon } from './icons/UserIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { QuizView } from './QuizView';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Button } from './ui/Button';

interface ChatMessageWithId extends ChatMessage {
  id: string;
}

interface AIAssistantProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onGenerateQuiz: () => Promise<void>;
  onSendMessage: (message: string, options?: { isRegeneration?: boolean }) => Promise<void>;
  onRegenerate?: () => Promise<void>;
  canRegenerate?: boolean;
  quiz: QuizQuestion[] | null;
  onUpdateQuiz?: (quiz: QuizQuestion[]) => void;
  onSaveQuiz?: () => Promise<void>;
  isSavingQuiz?: boolean;
  quizSaved?: boolean;
}

type ActiveTab = 'chat' | 'quiz';

export const AIAssistant: React.FC<AIAssistantProps> = ({
  messages,
  isLoading,
  onGenerateQuiz,
  onSendMessage,
  onRegenerate,
  canRegenerate,
  quiz,
  onUpdateQuiz,
  onSaveQuiz,
  isSavingQuiz,
  quizSaved,
}) => {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Convert messages to include unique IDs for rendering
  const messagesWithIds = messages.map((msg, idx) => ({
    ...msg,
    id: `${msg.role}-${idx}-${msg.content.substring(0, 20)}`
  })) as ChatMessageWithId[];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const quickPrompts = [
    { label: 'Summarize', prompt: 'Summarize the last section I watched in 3 bullet points.' },
    { label: 'Key terms', prompt: 'List the key terms mentioned so far and define each briefly.' },
    { label: 'Explain simply', prompt: 'Explain the main concept so far like I am new to the topic.' },
    { label: 'Quiz me', prompt: 'Ask me three quick questions about the last part of the video.' },
  ];

  const handleQuickPrompt = (prompt: string) => {
    setInput('');
    void onSendMessage(prompt);
  };

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
          ? 'text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400'
          : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-md shadow-lg shadow-slate-900/5 h-full flex flex-col border border-slate-200 dark:border-slate-700">
        <div className="flex border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <TabButton label="AI Assistant" icon={<SparklesIcon className="w-5 h-5"/>} isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
            <TabButton label="Knowledge Check" icon={<ClipboardCheckIcon className="w-5 h-5"/>} isActive={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} />
        </div>

        {activeTab === 'chat' && (
             <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 p-4 overflow-y-auto">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {quickPrompts.map((prompt) => (
                        <Button
                          key={prompt.label}
                          variant="secondary"
                          size="sm"
                          onClick={() => handleQuickPrompt(prompt.prompt)}
                          disabled={isLoading}
                        >
                          {prompt.label}
                        </Button>
                      ))}
                      {canRegenerate && onRegenerate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onRegenerate}
                          disabled={isLoading}
                        >
                          Regenerate answer
                        </Button>
                      )}
                    </div>
                    <div className="space-y-4">
                    {messagesWithIds.map((msg) => (
                        <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <BotIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </div>
                        )}
                        <div
                            className={`p-3 rounded-md max-w-sm ${
                            msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                        >
                            {msg.role === 'assistant' && msg.content ? (
                                <MarkdownRenderer content={msg.content} />
                            ) : (
                                <span className={`${msg.role === 'user' ? 'whitespace-pre-wrap' : ''}`}>
                                    {msg.content}
                                </span>
                            )}
                            {isLoading && msg.role === 'assistant' && messagesWithIds[messagesWithIds.length - 1]?.id === msg.id && msg.content === '' && (
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
                    <div className="mb-3 flex flex-wrap gap-2">
                        <Button 
                            onClick={handleGenerateQuizClick}
                            disabled={isLoading}
                            variant="secondary"
                            size="sm"
                            className="gap-2"
                        >
                            <LightbulbIcon className="w-4 h-4" />
                            {quiz ? 'Regenerate quiz' : 'Generate quiz from transcript'}
                        </Button>
                    </div>
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything about the video..."
                        disabled={isLoading}
                        className="flex-1 p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()}>
                        Send
                    </Button>
                    </form>
                </div>
             </div>
        )}

        {activeTab === 'quiz' && (
            <div className="flex flex-col h-full">
                {onSaveQuiz && quiz && (
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
                        <Button
                            onClick={onSaveQuiz}
                            disabled={isSavingQuiz || quizSaved}
                            className="flex-1 justify-center gap-2"
                        >
                            <ClipboardCheckIcon className="w-5 h-5" />
                            {quizSaved ? 'Saved to Assessments!' : isSavingQuiz ? 'Saving...' : 'Save Quiz to Assessments'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleGenerateQuizClick}
                          disabled={isLoading}
                        >
                          Regenerate
                        </Button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto">
                    <QuizView quiz={quiz} onUpdateQuiz={onUpdateQuiz} />
                </div>
            </div>
        )}
    </div>
  );
};
