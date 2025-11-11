import React, { useState, useEffect } from 'react';
import { YouTubePlayer } from './YouTubePlayer';
import { AIAssistant } from './AIAssistant';
import { StudyPanel } from './StudyPanel';
import { aiService } from '../src/services/aiService';
import { youtubeService } from '../src/services/youtubeService';
import { ChatMessage, QuizQuestion } from '../types';

interface LearningSessionProps {
  videoId: string;
  transcript: string;
  lessonId?: number;
  lessonTitle?: string;
}

export const LearningSession: React.FC<LearningSessionProps> = ({ videoId, transcript, lessonId, lessonTitle }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSavingQuiz, setIsSavingQuiz] = useState<boolean>(false);
  const [quizSaved, setQuizSaved] = useState<boolean>(false);

  useEffect(() => {
    if (transcript) {
      setMessages([
        { role: 'model', content: "Hello! I'm Edu, your AI assistant. Ask me anything about this video, or ask me to generate a quiz for you." }
      ]);
    }
  }, [transcript]);

  const handleGenerateQuiz = async () => {
    if (!transcript || quiz) return;
    setIsLoading(true);
    setQuizSaved(false);
    try {
      const newQuiz = await aiService.generateQuiz({ transcript });
      setQuiz(newQuiz);
    } catch (error) {
      console.error("Failed to generate quiz", error);
      // You could set an error message in the state to show in the UI
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveQuiz = async () => {
    if (!quiz || !lessonId || isSavingQuiz) return;
    
    setIsSavingQuiz(true);
    try {
      await youtubeService.saveQuizAsAssessment(lessonId, {
        title: `Quiz: ${lessonTitle || 'Video Quiz'}`,
        quiz_data: { questions: quiz },
        time_limit_minutes: quiz.length * 2, // 2 mins per question
        is_public: true
      });
      setQuizSaved(true);
      alert('Quiz saved to Assessments! You can find it in the Assessments page.');
    } catch (error) {
      console.error("Failed to save quiz", error);
      alert('Failed to save quiz. Please try again.');
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!transcript) return;

    // Add user message to chat
    const userMessage: ChatMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage, { role: 'model', content: '' }]);

    try {
      setIsLoading(true);
      const response = await aiService.chat({
        message,
        context: transcript
      });

      // Update the last message (model response) with the actual response
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.role === 'model') {
          lastMessage.content = response;
        }
        return newMessages;
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.role === 'model') {
          lastMessage.content = 'Sorry, I encountered an error. Please try again.';
        } else {
          newMessages.push({ role: 'model', content: 'Sorry, I encountered an error. Please try again.' });
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 h-full">
      <div className="lg:col-span-4 flex flex-col h-full gap-2">
        <div className="flex-[1.7] min-h-0">
          <YouTubePlayer videoId={videoId} />
        </div>
        <div className="flex-[1] min-h-0">
          <StudyPanel transcript={transcript} notes={notes} onNotesChange={setNotes} />
        </div>
      </div>
      <div className="lg:col-span-2 h-full">
        <AIAssistant
          messages={messages}
          setMessages={setMessages}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          onGenerateQuiz={handleGenerateQuiz}
          onSendMessage={handleSendMessage}
          quiz={quiz}
          onSaveQuiz={lessonId ? handleSaveQuiz : undefined}
          isSavingQuiz={isSavingQuiz}
          quizSaved={quizSaved}
        />
      </div>
    </div>
  );
};
