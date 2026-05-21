import React, { useState, useEffect } from 'react';
import apiClient from '../src/services/api';
import { useUnit, useUnitPapers } from '../src/hooks/useCurriculum';
import { AIAssistant } from './AIAssistant';
import type { ChatMessage, QuizQuestion } from '../types';

interface UnitDetailPageProps {
  unitId: number;
  onBack: () => void;
  onSelectPaper: (assessmentId: number) => void;
}

type Tab = 'papers' | 'tutor';

// Strip the trailing <action>...</action> tag the chat endpoint may append.
const stripActionTag = (text: string): string =>
  text.replace(/<action>[\s\S]*?<\/action>\s*$/i, '').trim();

export const UnitDetailPage: React.FC<UnitDetailPageProps> = ({ unitId, onBack, onSelectPaper }) => {
  const { data: unit, isLoading: unitLoading } = useUnit(unitId);
  const { data: papers = [], isLoading: papersLoading } = useUnitPapers(unitId);

  const [activeTab, setActiveTab] = useState<Tab>('papers');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);

  // Seed a unit-aware greeting once the unit is known.
  useEffect(() => {
    if (unit && messages.length === 0) {
      setMessages([{
        role: 'model',
        content:
          `Hi! I'm Edu, your tutor for **${unit.name}**. I know this unit covers:\n\n` +
          `${unit.syllabus_summary}\n\n` +
          `Ask me to explain any topic, work through a past paper question, or generate a practice quiz.`,
      }]);
    }
  }, [unit, messages.length]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    const history = messages
      .filter(m => m.content && m.content.trim())
      .slice(-10)
      .map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content }));

    setMessages(prev => [...prev, { role: 'user', content: message }, { role: 'model', content: '' }]);
    setAiLoading(true);
    try {
      const res = await apiClient.post<{ response: string }>(
        '/ai/chat/',
        { message, context: '', unit_id: unitId, history },
        { timeout: 60000 },
      );
      const text = stripActionTag(res.data?.response || '');
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'model', content: text || 'Sorry, I could not generate a response.' };
        return next;
      });
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'model',
          content: 'I had trouble connecting just now. Please try again in a moment.',
        };
        return next;
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!unit) return;
    setAiLoading(true);
    setQuiz(null);
    try {
      const res = await apiClient.post<{ questions: QuizQuestion[] }>(
        '/ai/generate-quiz/',
        { unit_id: unitId, topic: unit.name, title: `${unit.name} Practice Quiz`, num_questions: 10 },
        { timeout: 90000 },
      );
      setQuiz(Array.isArray(res.data?.questions) ? res.data.questions : []);
    } catch {
      setQuiz([]);
    } finally {
      setAiLoading(false);
    }
  };

  if (unitLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
        <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500 dark:text-slate-400 mb-4">This unit could not be found.</p>
        <button onClick={onBack} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Back to My Semester
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <button
        onClick={onBack}
        className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-3"
      >
        ← My Semester
      </button>
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-2 text-xs font-medium text-indigo-200 mb-1">
          {unit.code && <span>{unit.code}</span>}
          {unit.level && <span>· {unit.level}</span>}
          {unit.institution && <span>· {unit.institution}</span>}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{unit.name}</h1>
        <p className="text-sm text-indigo-100 leading-relaxed">{unit.syllabus_summary}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-5">
        {([
          { id: 'papers' as Tab, label: `Past Papers${papers.length ? ` (${papers.length})` : ''}` },
          { id: 'tutor' as Tab, label: 'AI Tutor & Quiz' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === t.id
                ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Past Papers tab */}
      {activeTab === 'papers' && (
        <div>
          {papersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : papers.length === 0 ? (
            <div className="text-center py-14 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                No past papers for this unit yet.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 max-w-sm mx-auto">
                Switch to the AI Tutor tab to generate practice questions from this unit's syllabus.
              </p>
              <button
                onClick={() => setActiveTab('tutor')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg"
              >
                Open AI Tutor
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {papers.map(paper => (
                <button
                  key={paper.id}
                  onClick={() => onSelectPaper(paper.id)}
                  className="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">
                        {paper.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {paper.question_count} question{paper.question_count === 1 ? '' : 's'}
                        {paper.competition_name ? ` · ${paper.competition_name}` : ''}
                        {paper.source_year ? ` · ${paper.source_year}` : ''}
                      </p>
                    </div>
                    {paper.difficulty_level && (
                      <span className="flex-none text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 capitalize">
                        {paper.difficulty_level}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Tutor tab */}
      {activeTab === 'tutor' && (
        <div className="h-[70vh]">
          <AIAssistant
            messages={messages}
            isLoading={aiLoading}
            onGenerateQuiz={handleGenerateQuiz}
            onSendMessage={handleSendMessage}
            quiz={quiz}
            onUpdateQuiz={setQuiz}
            hasTranscript={false}
          />
        </div>
      )}
    </div>
  );
};
