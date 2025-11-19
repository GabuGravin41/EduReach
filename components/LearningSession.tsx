import { useState, useEffect, useRef } from 'react';
import { YouTubePlayer } from './YouTubePlayer';
import { StudyPanel } from './StudyPanel';
import { AIAssistant } from './AIAssistant';
 
import type { QuizQuestion } from '../types';

interface LearningSessionProps {
  videoId: string;
  transcript: string;
  lessonId?: string;
}

export default function LearningSession({ videoId, transcript, lessonId }: LearningSessionProps) {
  const [notes, setNotes] = useState('');
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({
    videoTime: 0,
    transcriptScroll: 0
  });
  
  const videoRef = useRef<HTMLIFrameElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcript) {
      setMessages([
        { role: 'assistant', content: "Hello! I'm Edu, your AI assistant. Ask me anything about this video, or ask me to generate a quiz for you.\n\n💡 **Tip**: I give concise answers by default. Ask me to 'explain more' or 'elaborate' for detailed responses!" }
      ]);
    }
  }, [transcript]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current) {
        setProgress(prev => ({
          ...prev,
          videoTime: videoRef.current?.contentWindow?.postMessage(
            '{ "event": "getCurrentTime" }', '*'
          ) || 0
        }));
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lessonId) {
      const savedProgress = localStorage.getItem(`progress-${lessonId}`);
      if (savedProgress) {
        const { videoTime, transcriptScroll } = JSON.parse(savedProgress);
        setProgress({ videoTime, transcriptScroll });
        
        // Restore video time
        videoRef.current?.contentWindow?.postMessage(
          `{ "event": "seekTo", "seconds": ${videoTime} }`, '*'
        );
        
        // Restore scroll position
        if (transcriptRef.current) {
          transcriptRef.current.scrollTop = transcriptScroll;
        }
      }
    }
  }, [lessonId]);

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

  // Smart transcript chunking utility
  function chunkTranscript(transcript: string, maxChunkSize: number = 4000): string[] {
    const chunks: string[] = [];
    const paragraphs = transcript.split('\n\n').filter(p => p.trim());
    
    let currentChunk = '';
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        // Handle very long paragraphs
        if (paragraph.length > maxChunkSize) {
          const sentences = paragraph.split('. ');
          let tempChunk = '';
          for (const sentence of sentences) {
            if (tempChunk.length + sentence.length > maxChunkSize) {
              if (tempChunk) {
                chunks.push(tempChunk.trim());
                tempChunk = '';
              }
            }
            tempChunk += sentence + '. ';
          }
          if (tempChunk) {
            currentChunk = tempChunk;
          }
        } else {
          currentChunk = paragraph;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : ['No transcript available'];
  }

  // Find relevant chunks based on keywords
  function findRelevantChunks(chunks: string[], message: string, maxChunks: number = 2): string[] {
    const keywords = message.toLowerCase().split(' ').filter(word => word.length > 3);
    const scoredChunks = chunks.map(chunk => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;
      keywords.forEach(keyword => {
        const matches = (chunkLower.match(new RegExp(keyword, 'g')) || []).length;
        score += matches;
      });
      return { chunk, score };
    });
    
    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, maxChunks).map(item => item.chunk);
  }

  const handleSendMessage = async (message: string) => {
    try {
      setIsLoading(true);
      
      // Smart context selection with concise response optimization
      let context = transcript;
      let optimizedMessage = message;
      
      // Check if user wants detailed explanation
      const wantsDetailed = /explain more|tell me more|detailed|deep dive|elaborate|in depth/i.test(message);
      
      if (transcript.length > 4000) {
        const chunks = chunkTranscript(transcript);
        const relevantChunks = findRelevantChunks(chunks, message);
        context = relevantChunks.join('\n\n---\n\n');
        console.log(`Using ${relevantChunks.length} relevant chunks out of ${chunks.length} total`);
      }
      
      // Add response length guidance based on user intent
      if (!wantsDetailed) {
        optimizedMessage = `${message}\n\nPlease provide a concise, focused answer (2-3 sentences max). If the user wants more detail, they will ask for it.`;
      } else {
        optimizedMessage = `${message}\n\nPlease provide a detailed, thorough explanation with examples and deeper insights.`;
      }
      
      const response = await aiService.chat({
        message: optimizedMessage,
        context
      });
      setMessages(prev => [...prev, 
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!quiz || !lessonId) return;
    
    setIsLoading(true);
    try {
      await aiService.saveQuizAsAssessment(lessonId, {
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
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 h-[80vh] min-h-0">
      <div className="lg:col-span-4 flex flex-col h-full min-h-0">
        <div className="h-[60vh] min-h-0">
          <YouTubePlayer ref={videoRef} videoId={videoId} />
        </div>
        <div className="h-[20vh] min-h-0 border-t border-amber-200 dark:border-amber-800">
          <StudyPanel ref={transcriptRef} transcript={transcript} notes={notes} onNotesChange={setNotes} />
        </div>
      </div>
      <div className="lg:col-span-2 h-full min-h-0">
        <AIAssistant
          messages={messages}
          setMessages={setMessages}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          onGenerateQuiz={handleGenerateQuiz}
          onSendMessage={handleSendMessage}
          quiz={quiz}
          onSaveQuiz={lessonId ? handleSaveQuiz : undefined}
        />
      </div>
    </div>
  );
};
