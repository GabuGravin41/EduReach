import React, { useState, useEffect, useRef } from 'react';
import { YouTubePlayer, type YouTubePlayerHandle } from './YouTubePlayer';
import { AIAssistant } from './AIAssistant';
import { StudyPanel } from './StudyPanel';
import { ChatMessage, QuizQuestion, Assessment, Lesson } from '../types';
import apiClient from '../services/api';
import { Button } from './ui/Button';
import { PanelLeftIcon } from './icons/PanelLeftIcon';
import { PanelRightIcon } from './icons/PanelRightIcon';
import type { YouTubeEvent } from 'react-youtube';

const PLAYER_HEIGHT_STORAGE_KEY = 'edureach_player_height';
const DEFAULT_PLAYER_HEIGHT = 'aspect-video'; // Default: maintains 16:9 aspect ratio

interface LearningSessionProps {
  videoId: string;
  transcript: string;
  courseId: number;
  currentLesson?: Lesson;
  onUpdateLesson: (courseId: number, lessonId: number, updates: Partial<Lesson>) => void;
  onSaveAssessment?: (assessment: Assessment) => void;
}

export const LearningSession: React.FC<LearningSessionProps> = ({ 
    videoId, 
    transcript, 
    courseId,
    currentLesson,
    onUpdateLesson,
    onSaveAssessment 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(currentLesson?.chatHistory || []);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [notes, setNotes] = useState<string>(currentLesson?.notes || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStudyPanelOpen, setIsStudyPanelOpen] = useState(true); 
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(true);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [completedSent, setCompletedSent] = useState(currentLesson?.isCompleted || false);
  const [quizSaved, setQuizSaved] = useState(false);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [playerHeight, setPlayerHeight] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [startY, setStartY] = useState(0);
  
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

  // Initial Welcome Message if no history
  useEffect(() => {
    if (transcript && messages.length === 0) {
        setMessages([
          { role: 'model', content: "Hello! I'm Edu, your AI assistant. Ask me anything about this video, or ask me to generate a quiz for you.\n\n💡 **Tip**: I give concise answers by default. Ask me to 'explain more' or 'elaborate' for detailed responses!" }
        ]);
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
    if (!transcript) return;
    setIsLoading(true);
    setQuizSaved(false);
    try {
      let quizTranscript = transcript;
      if (transcript.length > 10000) {
         const chunks = chunkTranscript(transcript, 4000);
         const mid = Math.floor(chunks.length / 2);
         quizTranscript = [chunks[0], chunks[mid], chunks[chunks.length-1]].filter(Boolean).join('\n...\n');
      }

      const response = await apiClient.post('/ai/generate-quiz/', {
        transcript: quizTranscript,
        num_questions: 5,
        difficulty: 'medium'
      });
      
      setQuiz(response.data.questions || response.data);
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
      let context = transcript;
      let optimizedMessage = message;
      const wantsDetailed = /explain more|tell me more|detailed|deep dive|elaborate/i.test(message);
      
      if (transcript.length > 5000) {
        const chunks = chunkTranscript(transcript, 3000);
        const relevantChunks = findRelevantChunks(chunks, message, wantsDetailed ? 4 : 2);
        context = relevantChunks.join('\n\n---\n\n');
      }
      
      if (!wantsDetailed) {
        optimizedMessage = `${message}\n\n[System: Keep response concise (2-3 sentences) unless asked for details.]`;
      }

      const response = await apiClient.post('/ai/chat/', {
        message: optimizedMessage,
        context: context
      });

      const responseText = response.data.response || response.data;

      setMessages(prev => prev.map((msg, mapIdx) => 
        mapIdx === placeholderIndex ? { ...msg, content: responseText } : msg
      ));
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => prev.map((msg, mapIdx) => 
        mapIdx === placeholderIndex ? { ...msg, content: "I'm having trouble connecting right now. Please try again." } : msg
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
        onUpdateLesson(courseId, currentLesson.id, { isCompleted: true });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:h-full lg:min-h-0 relative p-4 sm:p-6 lg:p-0">
      {/* Mobile Toggle Buttons */}
      <div className="lg:hidden flex justify-between mb-2 flex-shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsStudyPanelOpen(prev => !prev)} className="flex-1">
          {isStudyPanelOpen ? 'Hide Notes' : 'Show Notes'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIsAIPanelOpen(prev => !prev)} className="flex-1">
          {isAIPanelOpen ? 'Hide AI' : 'Show AI'}
        </Button>
      </div>
      
      {/* Video and Notes Section */}
      <div className={`flex flex-col gap-4 ${
        isAIPanelOpen ? 'lg:w-[70%]' : 'lg:w-full'
      } lg:h-full lg:min-h-0`}>
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
            onStateChange={onPlayerStateChange}
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

          {/* Resize Handle - Bottom Border - LARGER and EASIER TO GRAB */}
          <div
            onMouseDown={handleResizeStart}
            className={`absolute -bottom-2 left-0 right-0 h-4 cursor-row-resize flex items-center justify-center group z-50 ${
              isResizing ? 'bg-blue-500 bg-opacity-60' : 'bg-blue-500 bg-opacity-0 hover:bg-opacity-40'
            } transition-all`}
            title="Drag down to make video taller, drag up to make it smaller"
          >
            <div className="w-12 h-1 bg-blue-400 rounded-full" />
          </div>
        </div>
        
        {/* Notes Panel - Mobile: Scrollable with proper height, Desktop: Fixed height */}
        {isStudyPanelOpen && (
            <div className={`lg:flex-none lg:h-48 xl:h-56 lg:min-h-0 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
              // Mobile: Give substantial height when open, allow scrolling within panel
              'h-[60vh] min-h-[400px] lg:min-h-0'
            }`}>
                <StudyPanel
                    transcriptRef={transcriptRef}
                    transcript={transcript}
                    notes={notes}
                    onNotesChange={setNotes}
                    videoId={videoId}
                />
            </div>
        )}
      </div>
      
      {/* AI Assistant Panel - Mobile: Scrollable with proper height, Desktop: Side panel */}
      {isAIPanelOpen && (
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
          <div className="h-full w-full overflow-hidden flex flex-col">
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
              />
          </div>
        </div>
      )}
    </div>
  );
};
