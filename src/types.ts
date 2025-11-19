export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
