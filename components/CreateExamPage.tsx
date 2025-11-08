import React, { useState } from 'react';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { QuestionType } from '../services/geminiService';

interface CreateExamPageProps {
  onExamCreated: (exam: any) => void;
  onCancel: () => void;
}

interface Question {
  type: QuestionType;
  questionText: string;
  options: string[];
  correctAnswerIndex: number | null;
  correctAnswerText: string;
}

const newQuestion = (): Question => ({ 
    type: 'multiple-choice', 
    questionText: '', 
    options: ['', '', '', ''], 
    correctAnswerIndex: null,
    correctAnswerText: ''
});

export const CreateExamPage: React.FC<CreateExamPageProps> = ({ onExamCreated, onCancel }) => {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState(30);
  const [questions, setQuestions] = useState<Question[]>([newQuestion()]);

  const handleAddQuestion = () => {
    setQuestions([...questions, newQuestion()]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
      const newQuestions = [...questions];
      (newQuestions[index] as any)[field] = value;
      
      // Reset fields when changing type
      if (field === 'type') {
          newQuestions[index].options = ['', '', '', ''];
          newQuestions[index].correctAnswerIndex = null;
          newQuestions[index].correctAnswerText = '';
      }
      setQuestions(newQuestions);
  };
  
  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const examData = {
      title,
      topic,
      description,
      time: Number(time),
      questions: questions.length, // Per existing data model
      // In a real DB, you'd save the full questions array:
      // questionsData: questions, 
    };
    onExamCreated(examData);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Create a New Manual Exam</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg shadow-slate-900/5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Exam Title</label>
                <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
             <div>
                <label htmlFor="topic" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Topic / Subject</label>
                <input type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
        </div>
        <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
        </div>
        <div>
            <label htmlFor="time" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time Limit (minutes)</label>
            <input type="number" id="time" value={time} onChange={e => setTime(Number(e.target.value))} required min="1" className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h3 className="text-lg font-bold mb-4">Questions</h3>
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg mb-4">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-4">
                        <label className="block text-sm font-bold">Question {qIndex + 1}</label>
                        <select 
                            value={q.type} 
                            onChange={(e) => handleQuestionChange(qIndex, 'type', e.target.value)}
                            className="p-1 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="multiple-choice">Multiple Choice</option>
                            <option value="essay">Essay</option>
                            <option value="short-answer">Short Answer</option>
                        </select>
                    </div>
                    <button type="button" onClick={() => handleRemoveQuestion(qIndex)} disabled={questions.length <= 1} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"><TrashIcon className="w-4 h-4" /></button>
                </div>
                <textarea value={q.questionText} onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)} placeholder="e.g., What is the capital of France?" rows={2} required className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none mb-3" />
                
                {q.type === 'multiple-choice' && (
                    <div className="grid grid-cols-2 gap-3">
                        {q.options.map((opt, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2">
                                <input type="radio" name={`q_${qIndex}_correct`} checked={q.correctAnswerIndex === oIndex} onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', oIndex)} required className="form-radio text-indigo-600 flex-shrink-0" />
                                <input type="text" value={opt} onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} required className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                        ))}
                    </div>
                )}
                {q.type === 'short-answer' && (
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Correct Answer</label>
                        <input type="text" value={q.correctAnswerText} onChange={(e) => handleQuestionChange(qIndex, 'correctAnswerText', e.target.value)} placeholder="Enter the exact correct answer" required className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                )}
                 {q.type === 'essay' && (
                    <div className="p-2 text-center bg-slate-100 dark:bg-slate-600/50 rounded-md">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Essay questions are graded manually. No correct answer needed here.</p>
                    </div>
                )}
              </div>
            ))}
          <button type="button" onClick={handleAddQuestion} className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-2"><PlusCircleIcon className="w-5 h-5" /> Add Another Question</button>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={onCancel} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-600">Cancel</button>
          <button type="submit" className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Save Exam</button>
        </div>
      </form>
    </div>
  );
};
