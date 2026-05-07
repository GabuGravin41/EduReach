import React, { useState, useRef, useCallback, useEffect } from 'react';
import { aiClient } from '../src/services/api';
import apiClient from '../src/services/api';
import { type View } from '../App';

interface Message {
  role: 'user' | 'assistant' | 'action';
  content: string;
}

interface AgentAction {
  type: 'navigate' | 'create_assessment';
  view?: View;
  title?: string;
  num_questions?: number;
}

interface Props {
  currentView: View;
  username?: string;
  onToggleLearningAI?: () => void;
  isLearningAIPanelOpen?: boolean;
  onNavigate?: (view: View, params?: Record<string, unknown>) => void;
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

function MaximizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function RestoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="10" y1="14" x2="21" y2="3" />
      <line x1="3" y1="21" x2="14" y2="10" />
    </svg>
  );
}

export const FloatingAIAssistant: React.FC<Props> = ({ currentView, username, onToggleLearningAI, isLearningAIPanelOpen, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

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

  const executeAction = async (action: AgentAction, conversationContext: string) => {
    if (action.type === 'navigate' && action.view && onNavigate) {
      onNavigate(action.view);
      return;
    }

    if (action.type === 'create_assessment') {
      const title = action.title || 'AI Generated Assessment';
      const numQ = action.num_questions || 10;
      setActionInProgress(`Creating "${title}"…`);
      try {
        const resp = await apiClient.post('ai/generate-quiz/', {
          transcript: conversationContext,
          num_questions: numQ,
          difficulty: 'medium',
          assessment_type: 'exam',
          title,
        });
        const questions = resp.data?.questions ?? [];
        if (questions.length === 0) throw new Error('No questions returned');

        // Save as a draft assessment
        const saveResp = await apiClient.post('assessments/', {
          title,
          topic: title,
          description: `Generated by Edu AI from your study material.`,
          assessment_type: 'exam',
          is_public: false,
          time_limit_minutes: Math.max(30, numQ * 3),
          questions: questions.map((q: any, idx: number) => ({
            question_text: q.question,
            question_type: q.type === 'true_false' ? 'mcq' : (q.type || 'mcq'),
            options: q.options || [],
            correct_answer: q.correct_answer || '',
            explanation: q.explanation || '',
            points: q.type === 'short_answer' ? 10 : 5,
            order: idx + 1,
          })),
        });
        const assessmentId = saveResp.data?.id;
        setActionInProgress(null);
        setMessages(prev => [...prev, {
          role: 'action',
          content: `✓ Created "${title}" with ${questions.length} questions.`,
        }]);
        if (assessmentId && onNavigate) {
          setTimeout(() => onNavigate('exam_detail' as View, { examId: assessmentId }), 600);
        } else if (onNavigate) {
          setTimeout(() => onNavigate('assessments' as View), 600);
        }
      } catch (e: any) {
        setActionInProgress(null);
        setMessages(prev => [...prev, {
          role: 'action',
          content: `Could not create the assessment automatically. Head to Assessments → Generate Quiz and paste your content there.`,
        }]);
      }
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const contextNote = VIEW_CONTEXT[currentView]
      ? `User is currently on: ${VIEW_CONTEXT[currentView]}`
      : '';

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const allMessages = [...messages, userMessage];
    const historyPayload = allMessages.slice(-10).map(m => ({
      role: m.role === 'action' ? 'assistant' : m.role,
      content: m.content,
    }));

    // Build a context string from recent conversation for action use
    const conversationContext = allMessages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n\n');

    try {
      const resp = await aiClient.post('ai/chat/', {
        message: text,
        context: contextNote,
        history: historyPayload,
      });
      const reply = resp.data?.response || resp.data?.message || 'Sorry, I could not get a response.';
      const action: AgentAction | undefined = resp.data?.action;

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      if (action) {
        await executeAction(action, conversationContext);
      }
    } catch (err: any) {
      console.error('AI Chat Error:', err);
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || 'Sorry, I could not reach the AI right now. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
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

  const chatHeader = (maximized: boolean) => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl flex-shrink-0">
      <div className="flex items-center gap-2">
        <SparkleIcon className="w-4 h-4 text-white" />
        <span className="text-sm font-bold text-white">Edu</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-medium">AI Tutor</span>
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
          onClick={() => setIsMaximized(v => !v)}
          className="p-1 rounded hover:bg-white/20 text-white transition-colors"
          aria-label={maximized ? 'Restore' : 'Maximize'}
          title={maximized ? 'Restore' : 'Expand'}
        >
          {maximized ? <RestoreIcon className="w-4 h-4" /> : <MaximizeIcon className="w-4 h-4" />}
        </button>
        <button
          onClick={() => { setIsOpen(false); setIsMaximized(false); }}
          className="p-1 rounded hover:bg-white/20 text-white transition-colors"
          aria-label="Minimize"
        >
          <MinimizeIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const chatMessages = (maxH: string) => (
    <div className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 ${maxH} min-h-[160px]`}>
      {messages.length === 0 && (
        <div className="text-center py-6">
          <SparkleIcon className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Hi{username ? ` ${username}` : ''}! I'm Edu, your AI tutor.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ask me anything — I'm here to help you learn.</p>
          <div className="mt-3 flex flex-col gap-1.5">
            {['Explain a concept', 'Help me prepare for exams', 'Summarize my notes'].map(s => (
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
          {m.role === 'action' ? (
            <div className="max-w-[90%] rounded-xl px-3 py-2 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {m.content}
            </div>
          ) : (
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          )}
        </div>
      ))}
      {(isLoading || actionInProgress) && (
        <div className="flex justify-start">
          <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-sm px-3 py-2">
            {actionInProgress ? (
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1.5">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                {actionInProgress}
              </span>
            ) : (
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  const chatInput = () => (
    <div className="px-3 pb-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
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
  );

  return (
    <>
      {/* Maximized modal overlay */}
      {isOpen && !isLearningMode && isMaximized && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-2xl h-[80vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col"
            aria-label="AI Assistant"
          >
            {chatHeader(true)}
            {chatMessages('flex-1')}
            {chatInput()}
          </div>
        </div>
      )}

      {/* Compact floating panel — only when NOT maximized and NOT in learning-session toggle mode */}
      {isOpen && !isLearningMode && !isMaximized && (
        <div
          style={panelStyle}
          className="w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col"
          aria-label="AI Assistant"
        >
          {chatHeader(false)}
          {chatMessages('max-h-72')}
          {chatInput()}
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
