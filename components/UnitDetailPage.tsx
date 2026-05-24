import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../src/services/api';
import { useUnit, useUnitPapers, CURRICULUM_KEYS } from '../src/hooks/useCurriculum';
import { AIAssistant } from './AIAssistant';
import { AddPaperModal } from './AddPaperModal';
import { AttachAssessmentModal } from './AttachAssessmentModal';
import { UnitLessonsTab } from './UnitLessonsTab';
import { DiscussionsPage } from './DiscussionsPage';
import { themeForTrack } from '../src/utils/trackTheme';
import { useAuth } from '../src/contexts/useAuth';
import type { UnitLesson } from '../src/services/curriculumService';
import type { ChatMessage, QuizQuestion } from '../types';

interface UnitDetailPageProps {
  unitId: number;
  onBack: () => void;
  onSelectPaper: (assessmentId: number) => void;
  onPlayLesson: (lesson: UnitLesson) => void;
}

type Tab = 'papers' | 'lessons' | 'notes' | 'discussions' | 'tutor';

// Strip the trailing <action>...</action> tag the chat endpoint may append.
const stripActionTag = (text: string): string =>
  text.replace(/<action>[\s\S]*?<\/action>\s*$/i, '').trim();

export const UnitDetailPage: React.FC<UnitDetailPageProps> = ({ unitId, onBack, onSelectPaper, onPlayLesson }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: unit, isLoading: unitLoading } = useUnit(unitId);
  const { data: papers = [], isLoading: papersLoading } = useUnitPapers(unitId);

  const [activeTab, setActiveTab] = useState<Tab>('papers');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [addPaperOpen, setAddPaperOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  // Olympiad lens: show only papers from real competitions (IMO, PAMO, etc.).
  const [competitionsOnly, setCompetitionsOnly] = useState(false);

  // Unit notes — one notepad per user per unit.
  const [noteContent, setNoteContent] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get('notes/by_unit/', { params: { unit_id: unitId } })
      .then(res => { if (!cancelled) setNoteContent(res.data?.content ?? ''); })
      .catch(() => { /* 404 — no note yet, leave empty */ });
    return () => { cancelled = true; };
  }, [unitId]);

  const handleSaveNote = async () => {
    setNoteSaving(true);
    setNoteSaved(false);
    try {
      await apiClient.post('notes/save_or_update/', { unit_id: unitId, content: noteContent });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2500);
    } catch {
      /* keep the text; the user can retry */
    } finally {
      setNoteSaving(false);
    }
  };

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
          Back to Courses
        </button>
      </div>
    );
  }

  const hasCompetitionPapers = papers.some(p => p.competition_name);
  const visiblePapers = competitionsOnly
    ? papers.filter(p => p.competition_name)
    : papers;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <button
        onClick={onBack}
        className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-3"
      >
        ← Courses
      </button>
      <div className={`bg-gradient-to-br ${themeForTrack(unit.track).headerGradient} rounded-2xl p-6 text-white mb-6`}>
        <div className="flex items-center gap-2 text-xs font-medium text-white/70 mb-1">
          {unit.code && <span>{unit.code}</span>}
          {unit.level && <span>· {unit.level}</span>}
          {unit.institution && <span>· {unit.institution}</span>}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{unit.name}</h1>
        <p className="text-sm text-white/85 leading-relaxed">{unit.syllabus_summary}</p>
      </div>

      {/* Tabs — stay pinned while the tab content scrolls */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-5 sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-slate-900/80">
        {([
          { id: 'papers' as Tab, label: `Assessments${papers.length ? ` (${papers.length})` : ''}` },
          { id: 'lessons' as Tab, label: unit.lesson_count > 0 ? `Lessons (${unit.lesson_count})` : 'Lessons' },
          { id: 'notes' as Tab, label: 'My Notes' },
          // Discussions only make sense where there are peers — public units.
          ...(unit.is_public ? [{ id: 'discussions' as Tab, label: 'Discussions' }] : []),
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
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {papersLoading ? '' : `${visiblePapers.length} assessment${visiblePapers.length === 1 ? '' : 's'}`}
              </p>
              {hasCompetitionPapers && (
                <button
                  onClick={() => setCompetitionsOnly(v => !v)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    competitionsOnly
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  🏆 Competitions only
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAttachOpen(true)}
                className="px-3.5 py-2 border border-teal-500 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-sm font-semibold rounded-lg transition-colors"
              >
                Tag existing
              </button>
              <button
                onClick={() => setAddPaperOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                + Add a past paper
              </button>
            </div>
          </div>
          {papersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : visiblePapers.length === 0 ? (
            <div className="text-center py-14 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                {competitionsOnly
                  ? 'No competition papers tagged here yet.'
                  : 'No assessments for this unit yet.'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 max-w-sm mx-auto">
                Upload a past paper, tag an existing assessment, or use the AI
                Tutor tab to generate practice questions from the syllabus.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setAddPaperOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg"
                >
                  Add a past paper
                </button>
                <button
                  onClick={() => setAttachOpen(true)}
                  className="px-4 py-2 border border-teal-500 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-sm font-semibold rounded-lg"
                >
                  Tag existing
                </button>
                <button
                  onClick={() => setActiveTab('tutor')}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Open AI Tutor
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {visiblePapers.map(paper => (
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
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {paper.competition_name && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 uppercase tracking-wide">
                            🏆 {paper.competition_name}
                          </span>
                        )}
                        <p className="text-xs text-slate-400">
                          {paper.question_count} question{paper.question_count === 1 ? '' : 's'}
                          {paper.source_year ? ` · ${paper.source_year}` : ''}
                        </p>
                      </div>
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

      {/* Lessons tab */}
      {activeTab === 'lessons' && (
        <UnitLessonsTab unitId={unitId} onPlayLesson={onPlayLesson} />
      )}

      {/* My Notes tab */}
      {activeTab === 'notes' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your private notes for this unit.
            </p>
            <div className="flex items-center gap-2">
              {noteSaved && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved ✓</span>
              )}
              <button
                onClick={handleSaveNote}
                disabled={noteSaving}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {noteSaving ? 'Saving…' : 'Save notes'}
              </button>
            </div>
          </div>
          <textarea
            value={noteContent}
            onChange={(e) => { setNoteContent(e.target.value); setNoteSaved(false); }}
            rows={16}
            placeholder={`Write your notes for ${unit.name} here — key formulas, things to remember, exam tips…`}
            className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y leading-relaxed"
          />
        </div>
      )}

      {/* Discussions tab — public units only */}
      {activeTab === 'discussions' && unit.is_public && (
        <DiscussionsPage unitId={unitId} currentUserId={user?.id} />
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

      {addPaperOpen && (
        <AddPaperModal
          unit={unit}
          onClose={() => setAddPaperOpen(false)}
          onAdded={(assessmentId) => {
            setAddPaperOpen(false);
            queryClient.invalidateQueries({ queryKey: CURRICULUM_KEYS.papers(unitId) });
            onSelectPaper(assessmentId);
          }}
        />
      )}

      {attachOpen && (
        <AttachAssessmentModal unit={unit} onClose={() => setAttachOpen(false)} />
      )}
    </div>
  );
};
