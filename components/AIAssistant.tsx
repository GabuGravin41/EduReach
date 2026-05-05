import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, QuizQuestion } from '../types';
import { BotIcon } from './icons/BotIcon';
import { UserIcon } from './icons/UserIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
// 5-pointed star — matches the FloatingAIAssistant bubble icon for consistency
function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}
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
  onSeekTo?: (seconds: number) => void;
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
  onSeekTo,
}) => {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Convert messages to include unique IDs for rendering
  const messagesWithIds = messages.map((msg, idx) => ({
    ...msg,
    id: `${msg.role}-${idx}-${msg.content.substring(0, 20)}`
  })) as ChatMessageWithId[];

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(scrollToBottom, [messages]);

  const quickPrompts = [
    { label: 'Summarize', prompt: 'Summarize the key points covered so far in 3 bullet points.' },
    { label: 'Key terms', prompt: 'List the key terms and define each one briefly.' },
    { label: 'Explain simply', prompt: 'Explain the main concept like I am completely new to the topic.' },
    { label: 'What to study', prompt: 'What are the most important topics I should focus on for an exam on this?' },
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
            <TabButton label="AI Assistant" icon={<StarIcon className="w-5 h-5"/>} isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
            <TabButton label="Knowledge Check" icon={<ClipboardCheckIcon className="w-5 h-5"/>} isActive={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} />
        </div>

        {activeTab === 'chat' && (
             <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 p-4 overflow-hidden flex flex-col">
                    <div className="mb-3 flex flex-wrap items-center gap-2 flex-shrink-0">
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
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 min-h-0">
                    {messagesWithIds.map((msg) => {
                        const isAI = msg.role === 'model' || msg.role === 'assistant';
                        const isTyping = isLoading && isAI && messagesWithIds[messagesWithIds.length - 1]?.id === msg.id && msg.content === '';
                        return (
                          <div key={msg.id} className={`flex items-end gap-2 ${isAI ? 'justify-start' : 'justify-end'}`}>
                            {/* AI avatar */}
                            {isAI && (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm mb-0.5">
                                <StarIcon className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}

                            {/* Bubble */}
                            <div
                              className={`px-3.5 py-2.5 rounded-2xl max-w-[80%] shadow-sm ${
                                isAI
                                  ? 'rounded-bl-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600'
                                  : 'rounded-br-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                              }`}
                            >
                              {isAI && msg.content ? (
                                <MarkdownRenderer content={msg.content} onTimestampClick={onSeekTo} />
                              ) : isTyping ? (
                                /* Typing indicator */
                                <div className="flex items-center gap-1 py-0.5 px-1">
                                  <span className="h-2 w-2 bg-slate-400 dark:bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                  <span className="h-2 w-2 bg-slate-400 dark:bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                  <span className="h-2 w-2 bg-slate-400 dark:bg-slate-400 rounded-full animate-bounce" />
                                </div>
                              ) : (
                                <span className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</span>
                              )}
                            </div>

                            {/* User avatar */}
                            {!isAI && (
                              <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center flex-shrink-0 shadow-sm mb-0.5">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-200 leading-none">You</span>
                              </div>
                            )}
                          </div>
                        );
                    })}
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
                        placeholder="Ask Edu anything..."
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
                    {isLoading && !quiz ? (
                      <div className="p-6 h-full flex flex-col items-center justify-center text-center gap-4">
                        <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
                        <p className="text-slate-600 dark:text-slate-300 font-medium">AI is generating your quiz&hellip;</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500">This may take a moment depending on the video length.</p>
                      </div>
                    ) : (
                      <QuizView quiz={quiz} />
                    )}
                </div>
            </div>
        )}
    </div>
  );
};
