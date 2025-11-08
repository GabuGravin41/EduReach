export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}
