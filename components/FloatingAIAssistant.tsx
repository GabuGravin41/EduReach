import React, { useState, useRef, useCallback, useEffect } from 'react';
import apiClient from '../src/services/apiClient';
import { type View } from '../App';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  currentView: View;
  username?: string;
  onToggleLearningAI?: () => void;
  isLearningAIPanelOpen?: boolean;
}

const VIEW_CONTEXT: Partial<Record<View, string>> = {
  dashboard: 'the EduReach dashboard',
  courses: 'browsing courses',
  course_detail: 'viewing a course',
  assessments: 'the assessments/exams section',
  exam_detail: 'reviewing an assessment',
  study_groups: 'study groups',
  community: 'the community feed',
  billing: 'the billing/subscription page',
  profile: 'your profile settings',
  analytics: 'your learning analytics',
};

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function MinimizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export const FloatingAIAssistant: React.FC<Props> = ({ currentView, username, onToggleLearningAI, isLearningAIPanelOpen }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Drag state
  const [pos, setPos] = useState({ x: 0, y: 0 }); // offset from bottom-right corner
  const isDragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isOpen) return; // don't drag while open
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };

    const onMove = (me: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = me.clientX - dragStart.current.mx;
      const dy = me.clientY - dragStart.current.my;
      setPos({ x: dragStart.current.px - dx, y: dragStart.current.py - dy });
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [isOpen, pos]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const contextNote = VIEW_CONTEXT[currentView]
      ? ` (User is currently on: ${VIEW_CONTEXT[currentView]})`
      : '';

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const historyPayload = [...messages, userMessage].slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const resp = await apiClient.post('ai/chat/', {
        message: text,
        context: `You are EduReach's AI learning assistant. Help the user with their studies, explain concepts clearly, and suggest resources on the platform.${contextNote} Keep answers concise and educational.`,
        history: historyPayload,
      });
      const reply = resp.data?.response || resp.data?.message || 'Sorry, I could not get a response.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not reach the AI right now. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const bubbleStyle: React.CSSProperties = {
    position: 'fixed',
    right: `${Math.max(16, pos.x + 16)}px`,
    bottom: `${Math.max(16, pos.y + 16)}px`,
    zIndex: 9999,
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    right: `${Math.max(16, pos.x + 16)}px`,
    bottom: `${Math.max(80, pos.y + 80)}px`,
    zIndex: 9998,
  };

  const isLearningMode = currentView === 'learning_session' && !!onToggleLearningAI;

  return (
    <>
      {/* Chat panel — only rendered when NOT in learning-session toggle mode */}
      {isOpen && !isLearningMode && (
        <div
          style={panelStyle}
          className="w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col"
          aria-label="AI Assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <SparkleIcon className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white">EduReach AI</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-medium">Beta</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([])}
                className="text-white/70 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
                title="Clear chat"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-white/20 text-white transition-colors"
                aria-label="Minimize"
              >
                <MinimizeIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-72 min-h-[160px]">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <SparkleIcon className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Hi{username ? ` ${username}` : ''}! I'm your AI tutor.</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ask me anything about your studies.</p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {['Explain a concept', 'Help me study', 'Quiz me on a topic'].map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-full px-3 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent max-h-24 overflow-y-auto"
                style={{ lineHeight: '1.4' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0"
                aria-label="Send"
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 text-center">
              Shift+Enter for new line · Enter to send
            </p>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button
        ref={bubbleRef}
        style={bubbleStyle}
        onMouseDown={isLearningMode ? undefined : onMouseDown}
        onClick={() => {
          if (isLearningMode) {
            onToggleLearningAI!();
          } else if (!isDragging.current) {
            setIsOpen(prev => !prev);
          }
        }}
        aria-label={
          isLearningMode
            ? (isLearningAIPanelOpen ? 'Close AI panel' : 'Open AI panel')
            : (isOpen ? 'Close AI assistant' : 'Open AI assistant')
        }
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 select-none ${
          (isLearningMode ? isLearningAIPanelOpen : isOpen)
            ? 'bg-slate-600 hover:bg-slate-700'
            : 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:scale-110'
        }`}
      >
        {(isLearningMode ? isLearningAIPanelOpen : isOpen) ? (
          <CloseIcon className="w-5 h-5 text-white" />
        ) : (
          <SparkleIcon className="w-6 h-6 text-white" />
        )}
      </button>
    </>
  );
};
