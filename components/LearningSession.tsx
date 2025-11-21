import { useState, useEffect, useRef } from 'react';
import { YouTubePlayer, type YouTubePlayerHandle } from './YouTubePlayer';
import { StudyPanel } from './StudyPanel';
import { AIAssistant } from './AIAssistant';
import aiService from '../src/services/aiService';
import { Button } from './ui/Button';
import { youtubeService } from '../src/services/youtubeService';
 
import type { QuizQuestion } from '../types';

interface LearningSessionProps {
  videoId: string;
  transcript: string;
  lessonId?: string;
}

export default function LearningSession({ videoId, transcript, lessonId }: LearningSessionProps) {
  const [notes, setNotes] = useState('');
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [isStudyPanelOpen, setIsStudyPanelOpen] = useState(false);
  const [progress, setProgress] = useState({
    videoTime: 0,
    transcriptScroll: 0
  });

  const videoRef = useRef<YouTubePlayerHandle | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const pendingSeekRef = useRef<number | null>(null);

  useEffect(() => {
    if (transcript) {
      setMessages([
        { role: 'assistant', content: "Hello! I'm Edu, your AI assistant. Ask me anything about this video, or ask me to generate a quiz for you.\n\n💡 **Tip**: I give concise answers by default. Ask me to 'explain more' or 'elaborate' for detailed responses!" }
      ]);
    }
  }, [transcript]);

  useEffect(() => {
    const updatePanelVisibility = () => {
      if (typeof window === 'undefined') return;
      setIsStudyPanelOpen(window.innerWidth >= 1024);
    };
    updatePanelVisibility();
    window.addEventListener('resize', updatePanelVisibility);
    return () => window.removeEventListener('resize', updatePanelVisibility);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!videoRef.current) return;
      const currentTime = videoRef.current.getCurrentTime();
      setProgress(prev => ({ ...prev, videoTime: currentTime }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lessonId) {
      const savedProgress = localStorage.getItem(`progress-${lessonId}`);
      if (savedProgress) {
        const { videoTime, transcriptScroll } = JSON.parse(savedProgress);
        setProgress({ videoTime, transcriptScroll });
        if (videoRef.current) {
          videoRef.current.seekTo(videoTime);
        } else {
          pendingSeekRef.current = videoTime;
        }
        // Restore scroll position
        if (transcriptRef.current) {
          transcriptRef.current.scrollTop = transcriptScroll;
        }
      }
    }
  }, [lessonId]);

  useEffect(() => {
    if (!lessonId) return;
    localStorage.setItem(`progress-${lessonId}`, JSON.stringify(progress));
  }, [lessonId, progress]);

  const handleGenerateQuiz = async () => {
    try {
      setIsLoading(true);
      
      // Smart transcript handling for quiz generation
      let quizTranscript = transcript;
      if (transcript.length > 8000) {
        // For very long transcripts, use first and last chunks
        const chunks = chunkTranscript(transcript, 4000);
        if (chunks.length > 2) {
          quizTranscript = chunks[0] + '\n\n...\n\n' + chunks[chunks.length - 1];
          console.log(`Using first and last chunks for quiz generation (total ${chunks.length} chunks)`);
        } else {
          quizTranscript = chunks.join('\n\n...\n\n');
        }
      }
      
      const generatedQuiz = await aiService.generateQuiz({ transcript: quizTranscript });
      setQuiz(generatedQuiz);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
      console.error('Quiz generation error:', err);
    } finally {
      setIsLoading(false);
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

  // Smart transcript chunking utility - optimized for AI context windows
  function chunkTranscript(transcript: string, maxChunkSize: number = 3000): string[] {
    if (!transcript || transcript.trim().length === 0) {
      return ['No transcript available'];
    }

    const chunks: string[] = [];
    // Split by paragraphs first (double newlines)
    const paragraphs = transcript.split(/\n\s*\n/).filter(p => p.trim());
    
    let currentChunk = '';
    for (const paragraph of paragraphs) {
      const trimmedPara = paragraph.trim();
      
      // If adding this paragraph would exceed limit, save current chunk
      if (currentChunk && (currentChunk.length + trimmedPara.length + 2) > maxChunkSize) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // Handle very long paragraphs by splitting into sentences
      if (trimmedPara.length > maxChunkSize) {
        const sentences = trimmedPara.split(/(?<=[.!?])\s+/).filter(s => s.trim());
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          if (sentenceChunk && (sentenceChunk.length + sentence.length + 1) > maxChunkSize) {
            if (sentenceChunk) {
              chunks.push(sentenceChunk.trim());
              sentenceChunk = '';
            }
          }
          sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
        }
        
        if (sentenceChunk) {
          currentChunk += (currentChunk ? '\n\n' : '') + sentenceChunk;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
      }
    }
    
    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [transcript.substring(0, maxChunkSize)];
  }

  // Find relevant chunks based on keywords - improved scoring
  function findRelevantChunks(chunks: string[], message: string, maxChunks: number = 3): string[] {
    if (chunks.length === 0) return [];
    if (chunks.length <= maxChunks) return chunks;
    
    // Extract meaningful keywords (length > 3, not common stop words)
    const stopWords = new Set(['what', 'when', 'where', 'who', 'why', 'how', 'this', 'that', 'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use']);
    const keywords = message.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .map(word => word.replace(/[^\w]/g, ''));
    
    if (keywords.length === 0) {
      // If no good keywords, return first chunks
      return chunks.slice(0, maxChunks);
    }
    
    const scoredChunks = chunks.map((chunk, index) => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;
      
      keywords.forEach(keyword => {
        // Count exact matches
        const exactMatches = (chunkLower.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
        score += exactMatches * 3; // Exact matches weighted higher
        
        // Count partial matches
        const partialMatches = (chunkLower.match(new RegExp(keyword, 'g')) || []).length;
        score += (partialMatches - exactMatches) * 1;
      });
      
      // Slight preference for earlier chunks (they often contain intro/context)
      score += (chunks.length - index) * 0.1;
      
      return { chunk, score, index };
    });
    
    // Sort by score, then by index
    scoredChunks.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    });
    
    const selected = scoredChunks.slice(0, maxChunks).map(item => item.chunk);
    
    // Ensure we have at least some context even if scores are low
    if (selected.length === 0) {
      return chunks.slice(0, maxChunks);
    }
    
    return selected;
  }

  const handleSendMessage = async (message: string, options?: { isRegeneration?: boolean }) => {
    if (!message.trim()) return;

    let placeholderIndex = -1;
    setMessages(prev => {
      const next = [...prev, { role: 'user', content: message }, { role: 'assistant', content: '' }];
      placeholderIndex = next.length - 1;
      return next;
    });

    setIsLoading(true);
    setLastPrompt(message);

    try {
      // Smart context selection with concise response optimization
      let context = transcript;
      let optimizedMessage = message;
      
      // Check if user wants detailed explanation
      const wantsDetailed = /explain more|tell me more|detailed|deep dive|elaborate|in depth|expand|comprehensive/i.test(message);
      
      // Use smart chunking for transcripts longer than 3000 characters
      if (transcript.length > 3000) {
        const chunks = chunkTranscript(transcript, 3000);
        const relevantChunks = findRelevantChunks(chunks, message, wantsDetailed ? 4 : 2);
        context = relevantChunks.join('\n\n---\n\n');
        console.log(`Using ${relevantChunks.length} relevant chunks out of ${chunks.length} total (transcript: ${transcript.length} chars)`);
      }
      
      // Add response length guidance based on user intent
      if (!wantsDetailed) {
        optimizedMessage = `${message}\n\n[IMPORTANT: Keep your response concise - 2-3 sentences maximum. Be direct and to the point. If the user wants more detail, they will ask for it.]`;
      } else {
        optimizedMessage = `${message}\n\n[Please provide a detailed, thorough explanation with examples and deeper insights. You can be more expansive here.]`;
      }
      
      const response = await aiService.chat({
        message: optimizedMessage,
        context
      });

      const idx = placeholderIndex;
      setMessages(prev => prev.map((msg, mapIdx) => mapIdx === idx ? { ...msg, content: response } : msg));
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      const idx = placeholderIndex;
      setMessages(prev => prev.map((msg, mapIdx) => mapIdx === idx ? { ...msg, content: `⚠️ ${errorMessage}` } : msg));
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!quiz || !lessonId) return;
    
    const numericLessonId = Number(lessonId);
    if (Number.isNaN(numericLessonId)) {
      console.error('Invalid lesson id for quiz save');
      return;
    }

    setIsLoading(true);
    try {
      await youtubeService.saveQuizAsAssessment(numericLessonId, {
        title: `Quiz: ${lessonId}`,
        quiz_data: { questions: quiz },
        time_limit_minutes: quiz.length * 2, // 2 mins per question
        is_public: true
      });
      alert('Quiz saved to Assessments! You can find it in the Assessments page.');
    } catch (error) {
      console.error("Failed to save quiz", error);
      alert('Failed to save quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[85vh] min-h-0 p-4">
      {error && (
        <div className="lg:col-span-12 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      <div className="lg:hidden flex justify-end mb-2">
        <Button variant="outline" size="sm" onClick={() => setIsStudyPanelOpen(prev => !prev)}>
          {isStudyPanelOpen ? 'Hide Transcript & Notes' : 'Show Transcript & Notes'}
        </Button>
      </div>
      {/* Video Player Section */}
      <div className="lg:col-span-7 flex flex-col h-full min-h-0 gap-4">
        <div className="flex-1 min-h-0 rounded-md overflow-hidden bg-slate-900 shadow-lg">
          <YouTubePlayer 
            ref={videoRef}
            videoId={videoId} 
            className="w-full h-full"
            onReady={handlePlayerReady}
          />
        </div>
        <div className={`transition-all duration-200 ${isStudyPanelOpen ? 'block' : 'hidden'} lg:block h-[35vh] min-h-[300px] max-h-[400px]`}>
          <StudyPanel
            transcriptRef={transcriptRef}
            transcript={transcript}
            notes={notes}
            onNotesChange={setNotes}
            videoId={videoId}
          />
        </div>
      </div>
      {/* AI Assistant Section */}
      <div className="lg:col-span-5 h-full min-h-0">
        <AIAssistant
          messages={messages}
          isLoading={isLoading}
          onGenerateQuiz={handleGenerateQuiz}
          onSendMessage={handleSendMessage}
          onRegenerate={lastPrompt ? handleRegenerate : undefined}
          canRegenerate={Boolean(lastPrompt)}
          quiz={quiz}
          onUpdateQuiz={setQuiz}
          onSaveQuiz={lessonId ? handleSaveQuiz : undefined}
        />
      </div>
    </div>
  );
};
