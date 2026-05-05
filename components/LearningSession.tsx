import React, { useState, useEffect, useRef } from 'react';
import { YouTubePlayer, type YouTubePlayerHandle } from './YouTubePlayer';
import { AIAssistant } from './AIAssistant';
import { StudyPanel } from './StudyPanel';
import { ChatMessage, QuizQuestion, Assessment, Lesson, Course } from '../types';
import apiClient, { aiClient } from '../src/services/api';
import { useAuth } from '../src/contexts/useAuth';
import { Button } from './ui/Button';
import { PanelLeftIcon } from './icons/PanelLeftIcon';
import { PanelRightIcon } from './icons/PanelRightIcon';
import type { YouTubeEvent } from 'react-youtube';
import VideoLibrarySearch from './VideoLibrarySearch';

const PLAYER_HEIGHT_STORAGE_KEY = 'edureach_player_height';
const CHAT_STORAGE_KEY_PREFIX = 'edureach:chat:';
const DEFAULT_PLAYER_HEIGHT = 'aspect-video'; // Default: maintains 16:9 aspect ratio

interface LearningSessionProps {
  videoId: string;
  transcript: string;
  courseId: number;
  currentLesson?: Lesson;
  onUpdateLesson: (courseId: number, lessonId: number, updates: Partial<Lesson>) => void;
  onSaveAssessment?: (assessment: Assessment) => void;
  isAIPanelOpen?: boolean;
  setIsAIPanelOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  onStartNewSession?: (data: { videoId: string; transcript: string; title?: string }) => void;
  courses?: Course[];
  savedSessionId?: number | null;
  onSessionSaved?: (id: number) => void;
}

export const LearningSession: React.FC<LearningSessionProps> = ({
  videoId,
  transcript,
  courseId,
  currentLesson,
  onUpdateLesson,
  onSaveAssessment,
  isAIPanelOpen: externalAIPanelOpen,
  setIsAIPanelOpen: externalSetAIPanelOpen,
  onStartNewSession,
  courses = [],
  savedSessionId: initialSavedSessionId = null,
  onSessionSaved,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(currentLesson?.chatHistory || []);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [notes, setNotes] = useState<string>(currentLesson?.notes || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStudyPanelOpen, setIsStudyPanelOpen] = useState(true);
  const [internalAIPanelOpen, setInternalAIPanelOpen] = useState(false);
  const isAIPanelOpen = externalAIPanelOpen ?? internalAIPanelOpen;
  const setIsAIPanelOpen = externalSetAIPanelOpen ?? setInternalAIPanelOpen;
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [completedSent, setCompletedSent] = useState(currentLesson?.isCompleted || false);
  const [quizSaved, setQuizSaved] = useState(false);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [playerHeight, setPlayerHeight] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isTranscriptEditorOpen, setIsTranscriptEditorOpen] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [transcriptSaving, setTranscriptSaving] = useState(false);
  const [transcriptSaveMsg, setTranscriptSaveMsg] = useState<string | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // ── Personal-session save / course assignment ──
  const [savedSessionId, setSavedSessionId] = useState<number | null>(initialSavedSessionId);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveToCourseOpen, setIsSaveToCourseOpen] = useState(false);
  const [saveToCourseTab, setSaveToCourseTab] = useState<'existing' | 'new'>('existing');
  const [stcCourseId, setStcCourseId] = useState<number | ''>('');
  const [stcLessonTitle, setStcLessonTitle] = useState('');
  const [stcCourseTitle, setStcCourseTitle] = useState('');
  const [stcCourseDesc, setStcCourseDesc] = useState('');
  const [stcIsPublic, setStcIsPublic] = useState(true);
  const [stcBusy, setStcBusy] = useState(false);
  const [stcError, setStcError] = useState('');
  const [stcSuccess, setStcSuccess] = useState('');

  const { user } = useAuth();
  const isAdmin = user?.tier === 'admin';

  const videoRef = useRef<YouTubePlayerHandle | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Load player height from localStorage on mount
  useEffect(() => {
    const savedHeight = localStorage.getItem(PLAYER_HEIGHT_STORAGE_KEY);
    if (savedHeight) {
      setPlayerHeight(parseInt(savedHeight, 10));
    }
  }, []);

  // Load chat messages from localStorage on mount (fallback persistence)
  useEffect(() => {
    if (!videoId) return;
    const chatKey = `${CHAT_STORAGE_KEY_PREFIX}${videoId}`;
    try {
      const saved = localStorage.getItem(chatKey);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load chat history from localStorage:', error);
    }
  }, [videoId]);

  // Save chat messages to localStorage whenever they change
  useEffect(() => {
    if (!videoId || messages.length === 0) return;
    const chatKey = `${CHAT_STORAGE_KEY_PREFIX}${videoId}`;
    try {
      const json = JSON.stringify(messages);
      // Only persist if under 2MB to avoid quota issues
      if (json.length < 2 * 1024 * 1024) {
        localStorage.setItem(chatKey, json);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        try { localStorage.removeItem(chatKey); } catch {}
      }
    }
  }, [messages, videoId]);

  // ── Background transcript polling ──
  // If the session started without a real transcript, fetch immediately then retry every 20s.
  const [liveTranscript, setLiveTranscript] = useState(transcript);
  const [transcriptFetching, setTranscriptFetching] = useState(false);
  useEffect(() => {
    // Only poll if transcript is missing or is the placeholder
    const isMissing = !liveTranscript ||
      liveTranscript.includes('[Transcript could not be automatically extracted') ||
      liveTranscript.trim().length < 50;

    if (!isMissing || !videoId) return;

    const RETRY_INTERVAL = 20_000; // 20 seconds between retries
    const MAX_POLLS = 5;
    let pollCount = 0;
    let cancelled = false;

    const poll = async () => {
      if (cancelled || pollCount >= MAX_POLLS) return;
      pollCount++;
      setTranscriptFetching(true);
      try {
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const resp = await apiClient.post('youtube/extract-transcript/', { url });
        const data = resp.data as any;
        if (data.success && (data.transcript?.timestamped_transcript || data.transcript?.transcript)) {
          setLiveTranscript(data.transcript.timestamped_transcript || data.transcript.transcript);
          setTranscriptFetching(false);
          return; // Stop polling
        }
      } catch {
        // Silently ignore, will retry
      }
      setTranscriptFetching(false);
      if (!cancelled && pollCount < MAX_POLLS) {
        setTimeout(poll, RETRY_INTERVAL);
      }
    };

    // Start immediately — no artificial delay
    poll();
    return () => { cancelled = true; };
  }, [videoId]); // Only run once on mount

  // Placeholder strings saved when auto-fetch fails — treat these as "no transcript"
  const isPlaceholderTranscript = (t: string | null | undefined): boolean => {
    if (!t || !t.trim()) return true;
    const n = t.trim().toLowerCase();
    return (
      n.startsWith('[transcript') ||
      n.startsWith('(transcript') ||
      n === '[transcript unavailable]' ||
      n.startsWith('[transcript could not') ||
      n.startsWith('transcript unavailable')
    );
  };

  // Use liveTranscript (with background-fetched data) wherever transcript is needed.
  // Discard placeholder strings so the AI never receives fake context.
  const rawTranscript = liveTranscript || transcript;
  const effectiveTranscript = isPlaceholderTranscript(rawTranscript) ? '' : rawTranscript;

  const handleSelectLibraryVideo = (video: { video_id: string; url: string; title?: string; transcript?: string; thumbnail_url?: string }) => {
    if (onStartNewSession) {
      onStartNewSession({
        videoId: video.video_id,
        transcript: video.transcript || '',
        title: video.title,
      });
    }
  };

  const handleSaveSession = async (titleOverride?: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        video_id: videoId,
        title: titleOverride || currentLesson?.title || '',
        transcript: effectiveTranscript,
        thumbnail_url: currentLesson?.thumbnail || '',
        notes: notes,
        chat_history: messages,
      };
      if (savedSessionId) {
        await apiClient.patch(`personal-sessions/${savedSessionId}/`, payload);
      } else {
        const res = await apiClient.post('personal-sessions/', payload);
        const newId = (res.data as any).id;
        setSavedSessionId(newId);
        onSessionSaved?.(newId);
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToCourse = async () => {
    if (!savedSessionId) {
      await handleSaveSession();
    }
    setStcLessonTitle(currentLesson?.title || '');
    setStcError('');
    setStcSuccess('');
    setIsSaveToCourseOpen(true);
  };

  const handleStcSubmit = async () => {
    if (!savedSessionId) return;
    setStcBusy(true); setStcError(''); setStcSuccess('');
    try {
      if (saveToCourseTab === 'existing') {
        if (!stcCourseId) { setStcError('Pick a course.'); setStcBusy(false); return; }
        await apiClient.post(`personal-sessions/${savedSessionId}/add_to_course/`, {
          course_id: stcCourseId,
          lesson_title: stcLessonTitle,
        });
        setStcSuccess('Lesson added to course!');
      } else {
        if (!stcCourseTitle.trim()) { setStcError('Course title is required.'); setStcBusy(false); return; }
        await apiClient.post(`personal-sessions/${savedSessionId}/create_course/`, {
          course_title: stcCourseTitle.trim(),
          course_description: stcCourseDesc.trim(),
          lesson_title: stcLessonTitle,
          is_public: stcIsPublic,
        });
        setStcSuccess(`Course "${stcCourseTitle}" created!`);
      }
    } catch (e: any) {
      setStcError(e?.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setStcBusy(false);
    }
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
    setStartY(e.clientY);
  };

  // Handle resize during drag
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!playerContainerRef.current) return;

      const delta = e.clientY - startY;
      const currentHeight = playerHeight || 360; // Default to ~360px (aspect-video default)
      const newHeight = currentHeight + delta;

      // Min 200px, max 80% of viewport
      const minHeight = 200;
      const maxHeight = Math.floor(window.innerHeight * 0.8);
      const constrainedHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

      setPlayerHeight(constrainedHeight);
      setStartY(e.clientY); // Update startY for next frame
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Save to localStorage
      if (playerHeight) {
        localStorage.setItem(PLAYER_HEIGHT_STORAGE_KEY, playerHeight.toString());
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = isResizing ? 'row-resize' : 'default';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isResizing, startY, playerHeight]);

  // Load existing notes when lesson starts
  useEffect(() => {
    if (!currentLesson?.id) return;

    const loadNotes = async () => {
      try {
        const response = await apiClient.get(`lessons/${currentLesson.id}/get_notes/`);
        if (response.data.success && response.data.notes) {
          setNotes(response.data.notes.notes || '');
        }
      } catch (error) {
        console.error('Failed to load notes:', error);
      }
    };

    loadNotes();
  }, [currentLesson?.id]);

  // Initial Welcome Message if no history
  useEffect(() => {
    if (messages.length === 0) {
      const hasTranscript = effectiveTranscript && effectiveTranscript.trim().length > 0;
      if (!hasTranscript) {
        setMessages([
          { role: 'model', content: "Hello! I'm Edu, your AI assistant. It looks like this video doesn't have a transcript available, so I won't be able to answer questions specific to its content. However, I can still answer general questions or explain concepts if you provide some context!" }
        ]);
      } else {
        setMessages([
          { role: 'model', content: "Hello! I'm Edu, your AI assistant. Ask me anything about this video, or ask me to generate a quiz for you.\n\n💡 **Tip**: I give concise answers by default. Ask me to 'explain more' or 'elaborate' for detailed responses!" }
        ]);
      }
    }
  }, [transcript]);

  // Responsive Layout
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsStudyPanelOpen(false);
        setIsAIPanelOpen(false);
      } else {
        setIsStudyPanelOpen(true);
        setIsAIPanelOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Autosave Notes & Chat
  useEffect(() => {
    if (!currentLesson) return;

    const timeoutId = setTimeout(() => {
      onUpdateLesson(courseId, currentLesson.id, {
        notes: notes,
        chatHistory: messages
      });
    }, 2000); // Debounce save every 2 seconds

    return () => clearTimeout(timeoutId);
  }, [notes, messages, courseId, currentLesson?.id]);


  // Pause video when AI modal opens; let user resume manually on close
  useEffect(() => {
    if (isAIModalOpen) {
      videoRef.current?.pause();
    }
  }, [isAIModalOpen]);

  // Escape key closes the AI modal
  useEffect(() => {
    if (!isAIModalOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsAIModalOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isAIModalOpen]);

  function chunkTranscript(text: string, maxChunkSize: number = 3000): string[] {
    if (!text || text.trim().length === 0) return ['No transcript available'];
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    let currentChunk = '';
    for (const paragraph of paragraphs) {
      const trimmedPara = paragraph.trim();
      if (currentChunk && (currentChunk.length + trimmedPara.length + 2) > maxChunkSize) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks.length > 0 ? chunks : [text.substring(0, maxChunkSize)];
  }

  function findRelevantChunks(chunks: string[], message: string, maxChunks: number = 3): string[] {
    if (chunks.length === 0) return [];
    if (chunks.length <= maxChunks) return chunks;

    const stopWords = new Set(['what', 'when', 'where', 'who', 'why', 'how', 'this', 'that', 'the', 'and', 'for', 'are']);
    const keywords = message.toLowerCase().split(/\s+/).filter(word => word.length > 3 && !stopWords.has(word)).map(word => word.replace(/[^\w]/g, ''));

    if (keywords.length === 0) return chunks.slice(0, maxChunks);

    const scoredChunks = chunks.map((chunk, index) => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;
      keywords.forEach(keyword => {
        const matches = (chunkLower.match(new RegExp(keyword, 'g')) || []).length;
        score += matches;
      });
      score += (chunks.length - index) * 0.1;
      return { chunk, score, index };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, maxChunks).map(item => item.chunk);
  }

  const handleGenerateQuiz = async () => {
    const hasTranscript = effectiveTranscript && effectiveTranscript.trim().length > 0;
    if (!hasTranscript) {
      setMessages(prev => [...prev, { role: 'model', content: "I cannot generate a quiz because this video doesn't have a transcript." }]);
      return;
    }
    setIsLoading(true);
    setQuizSaved(false);
    setQuizError(null);
    try {
      let quizTranscript = effectiveTranscript;
      if (effectiveTranscript.length > 10000) {
        const chunks = chunkTranscript(effectiveTranscript, 4000);
        const mid = Math.floor(chunks.length / 2);
        quizTranscript = [chunks[0], chunks[mid], chunks[chunks.length - 1]].filter(Boolean).join('\n...\n');
      }

      const response = await aiClient.post('/ai/generate-quiz/', {
        transcript: quizTranscript,
        num_questions: 5,
        difficulty: 'medium'
      });
      const data = response.data as any;

      if (data && data.success === false) {
        const message = data.error || 'We could not generate this quiz right now. Please try again in a moment.';
        setQuiz(null);
        setQuizError(message);
        setMessages(prev => [...prev, { role: 'model', content: message }]);
        return;
      }

      if (data && typeof data.raw_response === 'string' && data.raw_response.trim().length > 0) {
        const message = 'The AI response was not in a quiz format. Please try again or shorten the video/transcript.';
        setQuiz(null);
        setQuizError(message);
        setMessages(prev => [...prev, { role: 'model', content: message }]);
        return;
      }

      const questions = data && (data.questions || data);

      if (!questions || !Array.isArray(questions)) {
        const message = 'The AI did not return any quiz questions. Please try again.';
        setQuiz(null);
        setQuizError(message);
        setMessages(prev => [...prev, { role: 'model', content: message }]);
        return;
      }

      setQuiz(questions);
    } catch (error) {
      console.error("Failed to generate quiz", error);
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I couldn't generate a quiz at this moment. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string, options?: { isRegeneration?: boolean }) => {
    if (!message.trim()) return;

    let placeholderIndex = -1;
    if (!options?.isRegeneration) {
      setMessages(prev => {
        const next: ChatMessage[] = [...prev, { role: 'user', content: message }, { role: 'model', content: '' }];
        placeholderIndex = next.length - 1;
        return next;
      });
    } else {
      placeholderIndex = messages.length - 1;
    }

    setIsLoading(true);
    setLastPrompt(message);

    try {
      let context = effectiveTranscript && effectiveTranscript.trim().length > 0 ? effectiveTranscript : "No transcript available for this video.";
      let optimizedMessage = message;
      const wantsDetailed = /explain more|tell me more|detailed|deep dive|elaborate/i.test(message);

      if (effectiveTranscript && effectiveTranscript.trim().length > 0 && effectiveTranscript.length > 5000) {
        const chunks = chunkTranscript(effectiveTranscript, 3000);
        const relevantChunks = findRelevantChunks(chunks, message, wantsDetailed ? 4 : 2);
        context = relevantChunks.join('\n\n---\n\n');
      }

      if (!wantsDetailed) {
        optimizedMessage = `${message}\n\n[System: Keep response concise (2-3 sentences) unless asked for details.]`;
      }

      const response = await aiClient.post('/ai/chat/', {
        message: optimizedMessage,
        context: context
      });

      const responseText = response.data.response || response.data;

      setMessages(prev => prev.map((msg, mapIdx) =>
        mapIdx === placeholderIndex ? { ...msg, content: responseText } : msg
      ));
    } catch (err) {
      console.error('Chat error:', err);
      const isTimeout = (err as any)?.code === 'ECONNABORTED';
      setMessages(prev => prev.map((msg, mapIdx) =>
        mapIdx === placeholderIndex
          ? {
            ...msg,
            content: isTimeout
              ? "Response took too long. Try a shorter question, or ask for a concise answer."
              : "I'm having trouble connecting right now. Please try again.",
          }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!quiz || !onSaveAssessment) return;
    setIsSavingQuiz(true);

    // Create proper Assessment object
    const newAssessment: Assessment = {
      id: Date.now(),
      title: currentLesson ? `Quiz: ${currentLesson.title}` : `Quiz: ${new Date().toLocaleDateString()}`,
      topic: 'Video Session',
      questions: quiz.length,
      time: quiz.length * 2, // 2 mins per question
      status: 'pending',
      score: '',
      description: 'AI Generated quiz from video session.',
      questions_data: quiz, // Persist the actual questions
      difficulty: 'medium',
      source_type: 'youtube',
      source_url: videoId,
      // Link to course and lesson
      context: {
        type: 'course_lesson',
        courseId: courseId,
        lessonId: currentLesson?.id
      }
    };

    // Simulate delay for effect
    await new Promise(resolve => setTimeout(resolve, 800));

    onSaveAssessment(newAssessment);
    setIsSavingQuiz(false);
    setQuizSaved(true);
  };

  const handleSeekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.seekTo(seconds);
      // If study panel is open, maybe focus the video
      if (!isStudyPanelOpen) {
        setIsStudyPanelOpen(true);
      }
    }
  };

  const handlePlayerReady = () => {
    if (pendingSeekRef.current !== null && videoRef.current) {
      videoRef.current.seekTo(pendingSeekRef.current);
      pendingSeekRef.current = null;
    }
  };

  const handleRegenerate = () => {
    if (!lastPrompt) return Promise.resolve();
    return handleSendMessage(lastPrompt, { isRegeneration: true });
  };

  // Mark completion logic
  const onPlayerStateChange = (event: YouTubeEvent) => {
    // 0 = ended
    if (event.data === 0 && !completedSent && currentLesson) {
      setCompletedSent(true);
      apiClient.post(`lessons/${currentLesson.id}/mark_complete/`, {})
        .then(() => {
          setShowCompletionBanner(true);
          setTimeout(() => setShowCompletionBanner(false), 4000);
        })
        .catch((error) => {
          console.error('Failed to mark lesson complete:', error);
        });
      onUpdateLesson(courseId, currentLesson.id, { isCompleted: true });
    }
  };

  const handleSaveManualTranscript = async () => {
    if (!currentLesson?.id || !transcriptDraft.trim()) return;
    setTranscriptSaving(true);
    setTranscriptSaveMsg(null);
    try {
      await apiClient.post(`lessons/${currentLesson.id}/update_manual_transcript/`, {
        manual_transcript: transcriptDraft.trim(),
      });
      setLiveTranscript(transcriptDraft.trim());
      setTranscriptSaveMsg('Transcript saved.');
      setTimeout(() => { setIsTranscriptEditorOpen(false); setTranscriptSaveMsg(null); }, 1200);
    } catch {
      setTranscriptSaveMsg('Save failed — check that you own this course.');
    } finally {
      setTranscriptSaving(false);
    }
  };

  return (
    <>
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-4rem)] overflow-hidden relative p-4 sm:p-6 lg:p-0">
      {/* ── Lesson completion celebration banner ── */}
      {showCompletionBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-bounce pointer-events-none">
          <span>🎉</span>
          <span className="font-semibold">Lesson complete! XP earned.</span>
        </div>
      )}

      {/* Mobile Toggle — Notes / AI tabs (mutually exclusive) */}
      <div className="lg:hidden flex mb-2 flex-shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          type="button"
          onClick={() => {
            if (isStudyPanelOpen) { setIsStudyPanelOpen(false); }
            else { setIsStudyPanelOpen(true); setIsAIPanelOpen(false); }
          }}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${
            isStudyPanelOpen
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          Notes
        </button>
        <div className="w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
        <button
          type="button"
          onClick={() => {
            if (isAIPanelOpen) { setIsAIPanelOpen(false); }
            else { setIsAIPanelOpen(true); setIsStudyPanelOpen(false); }
          }}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${
            isAIPanelOpen
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          AI
        </button>
      </div>

      {/* Video and Notes Section */}
      <div className={`flex flex-col gap-4 overflow-y-auto ${isAIPanelOpen ? 'lg:w-[70%]' : 'lg:w-full'
        } lg:h-full lg:min-h-0`}>

        {/* ── Course progress mini-bar ── */}
        {courseId > 0 && currentLesson && (
          <div className="flex-shrink-0 flex items-center gap-3 px-1">
            <a
              href={`#course-${courseId}`}
              className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium whitespace-nowrap transition-colors flex items-center gap-1"
              onClick={(e) => { e.preventDefault(); window.history.back(); }}
            >
              <span aria-hidden="true">&#8592;</span>
              Back to course
            </a>
            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: currentLesson.isCompleted ? '100%' : completedSent ? '100%' : '50%' }}
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {currentLesson.isCompleted || completedSent ? 'Completed' : 'In progress'}
            </span>
          </div>
        )}

        {/* Save Session / Save to Course bar — shown for standalone sessions */}
        {courseId === 0 && (
          <div className="flex-shrink-0 flex items-center justify-between gap-2 px-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {savedSessionId ? '✓ Session saved' : 'Unsaved session'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveSession()}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition"
              >
                {isSaving ? 'Saving…' : savedSessionId ? 'Update' : 'Save Session'}
              </button>
              <button
                type="button"
                onClick={handleSaveToCourse}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition"
              >
                + Save to Course
              </button>
            </div>
          </div>
        )}

        {/* Admin transcript editor trigger */}
        {isAdmin && currentLesson?.id && (
          <div className="flex-shrink-0 flex justify-end px-1">
            <button
              type="button"
              onClick={() => { setTranscriptDraft(liveTranscript || ''); setIsTranscriptEditorOpen(true); }}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              title="Admin: Edit manual transcript"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Transcript
            </button>
          </div>
        )}

        {/* Video Player Container with Resize Handle */}
        <div
          ref={playerContainerRef}
          className="w-full rounded-xl overflow-hidden bg-black shadow-lg relative group"
          style={playerHeight ? { height: `${playerHeight}px`, flexShrink: 0 } : { aspectRatio: '16/9', flexShrink: 0 }}
        >
          <YouTubePlayer
            ref={videoRef}
            videoId={videoId}
            className="w-full h-full"
            onReady={handlePlayerReady}
            onStateChange={onPlayerStateChange as any}
          />
          <div className="hidden lg:block absolute top-4 right-4 z-50">
            <button
              onClick={() => setIsAIPanelOpen(prev => !prev)}
              className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all shadow-lg border border-white/10"
              title={isAIPanelOpen ? "Maximize Video (Focus Mode)" : "Open AI Assistant"}
            >
              {isAIPanelOpen ? <PanelRightIcon className="w-5 h-5" /> : <PanelLeftIcon className="w-5 h-5" />}
            </button>
          </div>

          {/* Support Creator Button */}
          <div className="absolute top-4 left-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={() => setIsSupportModalOpen(true)}
              className="bg-black/60 hover:bg-black/80 text-white/90 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition-all shadow-lg border border-white/10 flex items-center gap-1.5"
              title="Support Creator"
            >
              <svg className="w-3.5 h-3.5 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              Support Creator
            </button>
          </div>

          {/* Resize Handle - Bottom Border - LARGER and EASIER TO GRAB */}
          <div
            onMouseDown={handleResizeStart}
            className={`absolute -bottom-2 left-0 right-0 h-4 cursor-row-resize flex items-center justify-center group z-50 ${isResizing ? 'bg-blue-500 bg-opacity-60' : 'bg-blue-500 bg-opacity-0 hover:bg-opacity-40'
              } transition-all`}
            title="Drag down to make video taller, drag up to make it smaller"
          >
            <div className="w-12 h-1 bg-blue-400 rounded-full" />
          </div>
        </div>

        {/* Notes Panel - Mobile: Scrollable with proper height, Desktop: Fixed height */}
        {/* Video library search - shows cached videos and allows loading into current session */}
        <VideoLibrarySearch courseId={courseId} lessonId={currentLesson?.id} onSelect={handleSelectLibraryVideo} />
        {isStudyPanelOpen && (
          <div className={`lg:flex-none lg:h-48 xl:h-56 lg:min-h-0 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
            // Mobile: Give substantial height when open, allow scrolling within panel
            'h-[60vh] min-h-[400px] lg:min-h-0'
            }`}>
            <StudyPanel
              transcriptRef={transcriptRef}
              transcript={effectiveTranscript}
              transcriptFetching={transcriptFetching}
              notes={notes}
              onNotesChange={setNotes}
              videoId={videoId}
              lessonId={currentLesson?.id}
              onSeekTo={handleSeekTo}
            />
          </div>
        )}
      </div>

      {/* AI Assistant Panel - sidebar (hidden when modal is open) */}
      {isAIPanelOpen && !isAIModalOpen && (
        <div
          className={`
            flex flex-col
            transition-all duration-300 ease-in-out
            lg:w-[30%] lg:opacity-100 lg:h-full lg:min-h-0
            ${isStudyPanelOpen
              ? 'h-[60vh] min-h-[400px] lg:min-h-0'
              : 'h-[70vh] min-h-[500px] lg:min-h-0'
            }
          `}
        >
          {/* Wrapper with expand button overlaid on top-right of panel */}
          <div className="relative h-full w-full flex flex-col">
            {/* Expand / Focus Mode button */}
            <button
              type="button"
              onClick={() => setIsAIModalOpen(true)}
              title="Focus Mode — expand AI workspace"
              className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm border border-slate-200 dark:border-slate-600"
            >
              {/* Arrows-pointing-outward icon (expand) */}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
            </button>

            <div className="h-full w-full overflow-y-auto flex flex-col">
              {quizError && (
                <div className="px-3 py-2 text-xs text-rose-800 bg-rose-50 border-b border-rose-200">
                  {quizError}
                </div>
              )}
              <AIAssistant
                messages={messages}
                isLoading={isLoading}
                onGenerateQuiz={handleGenerateQuiz}
                onSendMessage={handleSendMessage}
                onRegenerate={handleRegenerate}
                canRegenerate={!!lastPrompt}
                quiz={quiz}
                onUpdateQuiz={setQuiz}
                onSaveQuiz={handleSaveQuiz}
                isSavingQuiz={isSavingQuiz}
                quizSaved={quizSaved}
                onSeekTo={handleSeekTo}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Transcript Editor Modal ──────────────────────────────────── */}
      {isAdmin && isTranscriptEditorOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsTranscriptEditorOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-700 overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-amber-100 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 dark:text-amber-400 text-base">✏️</span>
                <div>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Admin: Manual Transcript Editor</p>
                  {currentLesson?.title && <p className="text-xs text-amber-600/70 dark:text-amber-500/70 truncate">{currentLesson.title}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTranscriptEditorOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-100 dark:hover:bg-amber-800 text-amber-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              Go to YouTube → open the video → click <strong>Show transcript</strong> → copy all text → paste below. Leave timestamps in if present; Edu can parse them.
            </div>
            <textarea
              value={transcriptDraft}
              onChange={(e) => setTranscriptDraft(e.target.value)}
              placeholder="Paste transcript here…"
              className="flex-1 min-h-[300px] p-4 text-sm font-mono text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 resize-none focus:outline-none border-0"
            />
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
              {transcriptSaveMsg ? (
                <span className={`text-xs font-semibold ${transcriptSaveMsg.startsWith('Save failed') ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {transcriptSaveMsg}
                </span>
              ) : (
                <span className="text-xs text-slate-400">{transcriptDraft.length.toLocaleString()} characters</span>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTranscriptEditorOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveManualTranscript}
                  disabled={transcriptSaving || !transcriptDraft.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition-colors"
                >
                  {transcriptSaving ? 'Saving…' : 'Save Transcript'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Focus Mode Modal ─────────────────────────────────────────────── */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
          {/* Glassmorphism backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={() => setIsAIModalOpen(false)}
          />

          {/* Modal panel */}
          <div className="relative z-10 flex flex-col w-full max-w-4xl h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* 5-pointed star — same icon as the floating AI button */}
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">AI Focus Mode</p>
                  {currentLesson?.title && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{currentLesson.title}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800">
                  Esc
                </kbd>
                <button
                  type="button"
                  onClick={() => setIsAIModalOpen(false)}
                  title="Close focus mode"
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* AIAssistant fills the rest of the modal */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {quizError && (
                <div className="px-3 py-2 text-xs text-rose-800 bg-rose-50 border-b border-rose-200">
                  {quizError}
                </div>
              )}
              <div className="h-full flex flex-col">
                <AIAssistant
                  messages={messages}
                  isLoading={isLoading}
                  onGenerateQuiz={handleGenerateQuiz}
                  onSendMessage={handleSendMessage}
                  onRegenerate={handleRegenerate}
                  canRegenerate={!!lastPrompt}
                  quiz={quiz}
                  onUpdateQuiz={setQuiz}
                  onSaveQuiz={handleSaveQuiz}
                  isSavingQuiz={isSavingQuiz}
                  quizSaved={quizSaved}
                  onSeekTo={handleSeekTo}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Support Creator Modal ─────────────────────────────────────────────── */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSupportModalOpen(false)} />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-100 dark:border-rose-900/50 overflow-hidden flex flex-col p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Support the Creator</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              If you find this video helpful, please consider liking and subscribing on YouTube. It helps the creator out!
            </p>
            <div className="flex flex-col gap-3">
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsSupportModalOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                Like & Subscribe on YouTube
              </a>
              <button
                onClick={() => setIsSupportModalOpen(false)}
                className="w-full py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* ── Save-to-Course modal ──────────────────────────────────────────── */}
    {isSaveToCourseOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Save to Course</h2>
            <button onClick={() => setIsSaveToCourseOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md transition">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            {(['existing', 'new'] as const).map(t => (
              <button key={t} onClick={() => { setSaveToCourseTab(t); setStcError(''); setStcSuccess(''); }}
                className={`flex-1 py-2.5 text-sm font-semibold transition ${saveToCourseTab === t ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                {t === 'existing' ? 'Add to Existing Course' : 'Create New Course'}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Lesson title</label>
              <input value={stcLessonTitle} onChange={e => setStcLessonTitle(e.target.value)}
                className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {saveToCourseTab === 'existing' ? (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Choose a course</label>
                {courses.length === 0
                  ? <p className="text-xs text-slate-500 dark:text-slate-400">No courses yet — create one in the other tab.</p>
                  : <select value={stcCourseId} onChange={e => setStcCourseId(Number(e.target.value))}
                      className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">— Select a course —</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                }
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Course title <span className="text-rose-500">*</span></label>
                  <input value={stcCourseTitle} onChange={e => setStcCourseTitle(e.target.value)} placeholder="e.g. Calculus Deep Dive"
                    className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description <span className="text-slate-400">(optional)</span></label>
                  <textarea value={stcCourseDesc} onChange={e => setStcCourseDesc(e.target.value)} rows={2}
                    className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={stcIsPublic} onChange={() => setStcIsPublic(true)} className="form-radio text-indigo-600" /> Public</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={!stcIsPublic} onChange={() => setStcIsPublic(false)} className="form-radio text-indigo-600" /> Private</label>
                </div>
              </>
            )}

            {stcError && <p className="text-xs text-rose-600 dark:text-rose-400">{stcError}</p>}
            {stcSuccess && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{stcSuccess}</p>
            )}

            {!stcSuccess ? (
              <button onClick={handleStcSubmit} disabled={stcBusy}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60 transition">
                {stcBusy ? 'Saving…' : saveToCourseTab === 'existing' ? 'Add Lesson to Course' : 'Create Course'}
              </button>
            ) : (
              <button onClick={() => setIsSaveToCourseOpen(false)}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition">
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
};
