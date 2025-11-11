import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { aiService } from '../src/services/aiService';
import { UserTier } from '../App';

interface GenerateAIQuizPageProps {
  onQuizCreated: (quiz: any) => void;
  onCancel: () => void;
  userTier?: UserTier;
}

export const GenerateAIQuizPage: React.FC<GenerateAIQuizPageProps> = ({ onQuizCreated, onCancel, userTier = 'free' }) => {
  const [topic, setTopic] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [inputType, setInputType] = useState<'text' | 'youtube'>('text');
  const [numQuestions, setNumQuestions] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExtractingTranscript, setIsExtractingTranscript] = useState(false);

  const extractYouTubeTranscript = async (url: string) => {
    setIsExtractingTranscript(true);
    setError('');
    
    try {
      // Extract video ID from YouTube URL
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // Import YouTube service
      const { youtubeService } = await import('../src/services/youtubeService');
      
      // Fetch transcript from backend
      const result = await youtubeService.extractTranscript(url, 'en');
      
      if (result.success && result.transcript) {
        setSourceText(result.transcript);
        setInputType('text'); // Switch to text view to show extracted transcript
        
        // Auto-fill topic if empty
        if (!topic && result.metadata?.title) {
          setTopic(result.metadata.title);
        }
      } else {
        throw new Error(result.error || 'Could not extract transcript');
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to extract transcript. Please check the YouTube URL or try pasting the transcript manually.');
    } finally {
      setIsExtractingTranscript(false);
    }
  };

  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs based on type
    if (inputType === 'youtube') {
      if (!topic.trim() || !youtubeUrl.trim()) {
        setError('Please provide both a topic and YouTube URL.');
        return;
      }
      // Extract transcript first if not already done
      if (!sourceText.trim()) {
        await extractYouTubeTranscript(youtubeUrl);
        return; // Will need to submit again after transcript extraction
      }
    } else {
      if (!topic.trim() || !sourceText.trim()) {
        setError('Please provide both a topic and some source text.');
        return;
      }
    }
    
    setError('');
    setIsLoading(true);

    try {
      const result = await aiService.generateQuiz({
        transcript: sourceText,
        num_questions: numQuestions
      });

      const newQuiz = {
        title: topic,
        description: inputType === 'youtube' 
          ? `AI-generated quiz from YouTube video on ${topic}`
          : `AI-generated quiz on ${topic}`,
        topic: topic,
        questions: result.length,
        time: numQuestions * 2, // Estimate 2 mins per question
        source_type: inputType,
        source_url: inputType === 'youtube' ? youtubeUrl : undefined
      };
      onQuizCreated(newQuiz);
    } catch (err) {
      console.error(err);
      setError('Failed to generate quiz. The AI service may be unavailable. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Tier-based limits
  const getTierLimits = () => {
    switch (userTier) {
      case 'free': return { ai_quizzes: 2, youtube_quizzes: 2, max_questions: 10 };
      case 'learner': return { ai_quizzes: 10, youtube_quizzes: 'unlimited', max_questions: 25 };
      case 'pro': return { ai_quizzes: 'unlimited', youtube_quizzes: 'unlimited', max_questions: 100 };
      case 'pro_plus': return { ai_quizzes: 'unlimited', youtube_quizzes: 'unlimited', max_questions: 'unlimited' };
      case 'admin': return { ai_quizzes: 'unlimited', youtube_quizzes: 'unlimited', max_questions: 'unlimited' };
      default: return { ai_quizzes: 2, youtube_quizzes: 2, max_questions: 10 };
    }
  };

  const limits = getTierLimits();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Generate AI Quiz</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Create assessments from YouTube videos or text content using AI
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg shadow-slate-900/5 space-y-6">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <SparklesIcon className="w-5 h-5 text-teal-500" />
          <p>Let AI create a quiz for you from YouTube videos or text content.</p>
        </div>

        {/* Input Type Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Content Source
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setInputType('youtube')}
              className={`p-4 border-2 rounded-lg transition-colors ${
                inputType === 'youtube'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  : 'border-slate-300 dark:border-slate-600 hover:border-red-300 dark:hover:border-red-500'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">📺</div>
                <div className="font-medium">YouTube Video</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {limits.youtube_quizzes === 'unlimited' ? 'Unlimited' : `${limits.youtube_quizzes} per month`}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setInputType('text')}
              className={`p-4 border-2 rounded-lg transition-colors ${
                inputType === 'text'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-300 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">📝</div>
                <div className="font-medium">Text Content</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {limits.ai_quizzes === 'unlimited' ? 'Unlimited' : `${limits.ai_quizzes} per month`}
                </div>
              </div>
            </button>
          </div>
        </div>
        
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quiz Topic</label>
          <input 
            type="text" 
            id="topic" 
            value={topic} 
            onChange={e => setTopic(e.target.value)} 
            required 
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
            placeholder="e.g., Introduction to Photosynthesis" 
          />
        </div>

        {/* YouTube URL Input */}
        {inputType === 'youtube' && (
          <div>
            <label htmlFor="youtubeUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              YouTube Video URL
            </label>
            <div className="flex gap-2">
              <input 
                type="url" 
                id="youtubeUrl" 
                value={youtubeUrl} 
                onChange={e => setYoutubeUrl(e.target.value)} 
                required 
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
                placeholder="https://www.youtube.com/watch?v=..." 
              />
              <button
                type="button"
                onClick={() => extractYouTubeTranscript(youtubeUrl)}
                disabled={!youtubeUrl.trim() || isExtractingTranscript}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExtractingTranscript ? 'Extracting...' : 'Extract'}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Paste a YouTube video URL and we'll extract the transcript automatically
            </p>
          </div>
        )}
        
        {/* Text Content Input */}
        {inputType === 'text' && (
          <div>
            <label htmlFor="sourceText" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Source Text</label>
            <textarea 
              id="sourceText" 
              value={sourceText} 
              onChange={e => setSourceText(e.target.value)} 
              required 
              rows={8} 
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
              placeholder="Paste the text content here that you want to generate quiz questions from..." 
            />
          </div>
        )}

        {/* Extracted Transcript Display */}
        {inputType === 'youtube' && sourceText && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Extracted Transcript
            </label>
            <textarea 
              value={sourceText} 
              onChange={e => setSourceText(e.target.value)} 
              rows={6} 
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
              placeholder="Transcript will appear here..." 
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              You can edit the transcript before generating the quiz
            </p>
          </div>
        )}
        
        <div>
          <label htmlFor="numQuestions" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Number of Questions
          </label>
          <input 
            type="number" 
            id="numQuestions" 
            value={numQuestions} 
            onChange={e => setNumQuestions(Math.min(Number(e.target.value), typeof limits.max_questions === 'number' ? limits.max_questions : 100))} 
            required 
            min="1" 
            max={limits.max_questions === 'unlimited' ? 100 : limits.max_questions}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maximum {limits.max_questions === 'unlimited' ? '100' : limits.max_questions} questions for your tier
          </p>
        </div>

        {error && <p className="text-red-500 text-sm -my-2">{error}</p>}

        <div className="flex justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={onCancel} disabled={isLoading} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-600">Cancel</button>
          <button type="submit" disabled={isLoading} className="px-6 py-2 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 flex items-center gap-2 disabled:bg-slate-400 disabled:cursor-wait">
            {isLoading ? (
                <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                </>
            ) : (
                <>
                    <SparklesIcon className="w-5 h-5" />
                    Generate Quiz
                </>
            )}
            </button>
        </div>
      </form>
    </div>
  );
};
