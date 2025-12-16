import React, { useState } from 'react';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { View } from '../App';

interface CreateCoursePageProps {
  onCourseCreated: (course: any) => void;
  onCancel: () => void;
  lessonLimit: number;
  setView: (view: View) => void;
}

interface Lesson {
  title: string;
  videoId: string;
}

export const CreateCoursePage: React.FC<CreateCoursePageProps> = ({ onCourseCreated, onCancel, lessonLimit, setView }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([{ title: '', videoId: '' }]);

  const handleAddLesson = () => {
    if (lessons.length >= lessonLimit) {
        alert(`You have reached the maximum of ${lessonLimit} lessons per course on your current plan. Please upgrade to add more.`);
        setView('billing');
        return;
    }
    setLessons([...lessons, { title: '', videoId: '' }]);
  };

  const handleRemoveLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index));
  };
  
  const handleLessonChange = (index: number, field: 'title' | 'videoId', value: string) => {
    const newLessons = [...lessons];
    newLessons[index][field] = value;
    setLessons(newLessons);
  };
  
  const extractVideoId = (url: string): string => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : url; // Return original string if no match, maybe show error later
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const courseData = {
      title,
      description,
      isPublic,
      lessons: lessons.map(l => ({...l, videoId: extractVideoId(l.videoId), isCompleted: false, duration: 'N/A'})),
      thumbnail: '/placeholder.svg',
    };
    onCourseCreated(courseData);
  };

  const atLessonLimit = lessons.length >= lessonLimit;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Create a New Course</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg shadow-slate-900/5 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Course Title</label>
          <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
          <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={4} required className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
        </div>
        <div>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Visibility</span>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="visibility" checked={isPublic} onChange={() => setIsPublic(true)} className="form-radio text-indigo-600" /> Public</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="visibility" checked={!isPublic} onChange={() => setIsPublic(false)} className="form-radio text-indigo-600" /> Private</label>
            </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h3 className="text-lg font-bold mb-4">Lessons ({lessons.length}/{lessonLimit === Infinity ? '∞' : lessonLimit})</h3>
          <div className="space-y-4">
            {lessons.map((lesson, index) => (
              <div key={index} className="flex items-end gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <span className="font-bold text-slate-500 dark:text-slate-400">{index + 1}.</span>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">Lesson Title</label>
                  <input type="text" value={lesson.title} onChange={e => handleLessonChange(index, 'title', e.target.value)} required placeholder="e.g., Introduction to React" className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">YouTube URL or Video ID</label>
                  <input type="text" value={lesson.videoId} onChange={e => handleLessonChange(index, 'videoId', e.target.value)} required placeholder="e.g., zNzzGgr2mhk" className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <button type="button" onClick={() => handleRemoveLesson(index)} disabled={lessons.length <= 1} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"><TrashIcon className="w-5 h-5" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={handleAddLesson} disabled={atLessonLimit} className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
            <PlusCircleIcon className="w-5 h-5" /> Add Another Lesson
          </button>
           {atLessonLimit && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                You've reached the lesson limit for your current plan. <button type="button" onClick={() => setView('billing')} className="font-bold underline">Upgrade</button> to add more.
              </p>
            )}
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={onCancel} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-600">Cancel</button>
          <button type="submit" className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Save Course</button>
        </div>
      </form>
    </div>
  );
};