
import React, { useState, useEffect, useRef } from 'react';
import { YouTubePlayer, type YouTubePlayerHandle } from './YouTubePlayer';
import { AIAssistant } from './AIAssistant';
import { StudyPanel } from './StudyPanel';
import { generateResponseWithContext, generateQuiz } from '../services/geminiService';
import { ChatMessage, QuizQuestion, Assessment, Lesson } from '../types';
import { Button } from './ui/Button';
import { PanelLeftIcon } from './icons/PanelLeftIcon';
import { PanelRightIcon } from './icons/PanelRightIcon';
import type { YouTubeEvent } from 'react-youtube';

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
  
  const videoRef = useRef<YouTubePlayerHandle | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const pendingSeekRef = useRef<number | null>(null);

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
    try {
      let quizTranscript = transcript;
      if (transcript.length > 10000) {
         const chunks = chunkTranscript(transcript, 4000);
         const mid = Math.floor(chunks.length / 2);
         quizTranscript = [chunks[0], chunks[mid], chunks[chunks.length-1]].filter(Boolean).join('\n...\n');
      }

      const newQuiz = await generateQuiz(quizTranscript);
      setQuiz(newQuiz);
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

      const response = await generateResponseWithContext(optimizedMessage, context);

      setMessages(prev => prev.map((msg, mapIdx) => 
        mapIdx === placeholderIndex ? { ...msg, content: response } : msg
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
    
    // Create proper Assessment object
    const newAssessment: Assessment = {
        id: Date.now(),
        title: `Quiz: ${new Date().toLocaleDateString()}`,
        topic: 'Video Session',
        questions: quiz.length,
        time: quiz.length * 2, // 2 mins per question
        status: 'pending',
        score: '',
        description: 'AI Generated quiz from video session.',
        questions_data: quiz, // Persist the actual questions
        difficulty: 'medium',
        source_type: 'youtube',
        source_url: videoId
    };

    onSaveAssessment(newAssessment);
  };

  const handlePlayerReady = () => {
    if (pendingSeekRef.current !== null && videoRef.current) {
      videoRef.current.seekTo(pendingSeekRef.current);
      pendingSeekRef.current = null;
    }
  };

  const handleRegenerate = () => {
    if (lastPrompt) {
        handleSendMessage(lastPrompt, { isRegeneration: true });
        return Promise.resolve();
    }
    return Promise.resolve();
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
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-6rem)] min-h-0 relative">
      <div className="lg:hidden flex justify-between mb-2">
        <Button variant="outline" size="sm" onClick={() => setIsStudyPanelOpen(prev => !prev)}>
          {isStudyPanelOpen ? 'Hide Notes' : 'Show Notes'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIsAIPanelOpen(prev => !prev)}>
          {isAIPanelOpen ? 'Hide AI' : 'Show AI'}
        </Button>
      </div>
      <div className={`flex flex-col h-full min-h-0 gap-4 transition-all duration-300 ease-in-out ${isAIPanelOpen ? 'lg:w-[70%]' : 'lg:w-full'}`}>
        <div className="w-full aspect-video flex-none lg:aspect-auto lg:flex-1 min-h-0 rounded-xl overflow-hidden bg-black shadow-lg relative z-10">
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
        </div>
        {isStudyPanelOpen && (
            <div className="flex-1 lg:flex-none lg:h-48 xl:h-56 min-h-0 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
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
      <div 
        className={`
            flex flex-col
            transition-all duration-300 ease-in-out
            lg:h-full
            ${isAIPanelOpen 
                ? 'lg:w-[30%] lg:opacity-100 flex-1 min-h-[300px]' 
                : 'lg:w-0 lg:opacity-0 lg:overflow-hidden h-0 overflow-hidden'
            }
        `}
      >
        <div className="h-full w-full overflow-hidden">
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
            />
        </div>
      </div>
    </div>
  );
};
