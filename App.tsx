import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { MyCoursesPage } from './components/MyCoursesPage';
import { CreateCoursePage } from './components/CreateCoursePage';
import { CourseDetailPage } from './components/CourseDetailPage';
import { AssessmentsPage } from './components/AssessmentsPage';
import { CreateExamPage } from './components/CreateExamPage';
import { GenerateAIQuizPage } from './components/GenerateAIQuizPage';
import { ExamDetailPage } from './components/ExamDetailPage';
import { CommunityPage } from './components/CommunityPage';
import { StudyGroupsPage } from './components/StudyGroupsPage';
import { BillingPage } from './components/BillingPage';
import { UserProfilePage } from './components/UserProfilePage';
import { SetupSession } from './components/SetupSession';
import { LearningSession } from './components/LearningSession';
import { AdminDashboard } from './components/AdminDashboard';
import { UserCircleIcon } from './components/icons/UserCircleIcon';
import { Course, Assessment, Lesson } from './types';

export type UserTier = 'free' | 'learner' | 'pro' | 'pro_plus' | 'admin';

export type View = 
  | 'dashboard' 
  | 'courses' 
  | 'create_course' 
  | 'course_detail' 
  | 'assessments' 
  | 'create_exam' 
  | 'generate_ai_quiz' 
  | 'exam_detail' 
  | 'community' 
  | 'study_groups' 
  | 'billing' 
  | 'profile' 
  | 'admin_panel' 
  | 'setup_session' 
  | 'learning_session';

interface SessionData {
  videoId: string;
  transcript: string;
  title?: string;
  courseId?: number | null;
  lessonId?: number;
}

const App: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userTier, setUserTier] = useState<UserTier>('free');
  
  // Data State
  const [courses, setCourses] = useState<Course[]>([
    {
        id: 1,
        title: "React Fundamentals",
        description: "Learn the basics of React including components, props, and state.",
        progress: 35,
        thumbnail: "",
        isPublic: false,
        lessons: [
            { id: 101, title: "Intro to JSX", videoId: "bMknfKXIFA8", duration: "10:05", isCompleted: true, transcript: "Welcome to React..." },
            { id: 102, title: "Components and Props", videoId: "4UZrsTqkcW4", duration: "15:20", isCompleted: false, transcript: "Today we talk about props..." }
        ]
    }
  ]);
  const [assessments, setAssessments] = useState<Assessment[]>([
      { id: 1, title: "React Basics Quiz", topic: "React", questions: 10, time: 15, status: "completed", score: "9/10", assessment_type: "quiz", description: "Test your knowledge on components." }
  ]);
  const [posts, setPosts] = useState<any[]>([
      { id: 1, author: "Alice", avatar: UserCircleIcon, time: "2h ago", content: "Just finished the React course! Highly recommend it.", likes: 5, comments: [{author: "Bob", content: "Nice job!"}], liked: false }
  ]);
  
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  useEffect(() => {
    if (user) {
        setUserTier(user.tier);
    }
  }, [user]);

  const limits = {
      lessonsPerCourse: userTier === 'free' ? 5 : Infinity
  };

  const handleCourseCreated = (newCourse: any) => {
      const course: Course = {
          ...newCourse,
          id: Date.now(),
          progress: 0,
          lessons: newCourse.lessons || []
      };
      setCourses([...courses, course]);
      setCurrentView('courses');
  };

  const handleExamCreated = (newExam: any) => {
      const exam: Assessment = {
          ...newExam,
          id: Date.now(),
          status: 'pending',
          score: '-',
          questions: newExam.questions || (newExam.questions_data ? newExam.questions_data.length : 0)
      };
      setAssessments([...assessments, exam]);
      setCurrentView('assessments');
  };

  if (!user) {
    return <LoginScreen />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onStartSession={() => setCurrentView('setup_session')} onSelectCourse={(id) => { setSelectedCourseId(id); setCurrentView('course_detail'); }} userTier={userTier} />;
      case 'courses':
        return <MyCoursesPage courses={courses} onSelectCourse={(id) => { setSelectedCourseId(id); setCurrentView('course_detail'); }} onNewCourse={() => setCurrentView('create_course')} userTier={userTier} />;
      case 'create_course':
        return <CreateCoursePage onCourseCreated={handleCourseCreated} onCancel={() => setCurrentView('courses')} lessonLimit={limits.lessonsPerCourse} setView={setCurrentView} />;
      case 'course_detail':
         const course = courses.find(c => c.id === selectedCourseId);
         return course ? (
            <CourseDetailPage 
                course={course} 
                setView={setCurrentView} 
                onStartLesson={(data) => { setSessionData(data); setCurrentView('learning_session'); }} 
                userTier={userTier} 
                assessments={assessments} 
                onSelectExam={(id) => { setSelectedExamId(id); setCurrentView('exam_detail'); }} 
                onUpdateCourse={(cId, updates) => setCourses(courses.map(c => c.id === cId ? {...c, ...updates} : c))}
                onUpdateLesson={(cId, lId, updates) => setCourses(courses.map(c => c.id === cId ? {...c, lessons: c.lessons.map(l => l.id === lId ? {...l, ...updates} : l)} : c))}
            />
         ) : <div>Course not found</div>;
      case 'assessments':
         return <AssessmentsPage assessments={assessments} onSelectExam={(id) => { setSelectedExamId(id); setCurrentView('exam_detail'); }} setView={setCurrentView} userTier={userTier} tierUsage={{assessments_used: assessments.length, assessments_limit: userTier === 'free' ? 2 : Infinity, resets_at: 'Month End'}} />;
      case 'create_exam':
         return <CreateExamPage onExamCreated={handleExamCreated} onCancel={() => setCurrentView('assessments')} userTier={userTier} courses={courses} />;
      case 'generate_ai_quiz':
         return <GenerateAIQuizPage onQuizCreated={handleExamCreated} onCancel={() => setCurrentView('assessments')} courses={courses} />;
      case 'exam_detail':
         const exam = assessments.find(a => a.id === selectedExamId);
         return exam ? <ExamDetailPage exam={exam} setView={setCurrentView} /> : <div>Exam not found</div>;
      case 'community':
         return <CommunityPage posts={posts} onPostCreated={(content) => setPosts([{id: Date.now(), author: user.username, avatar: UserCircleIcon, time: 'Just now', content, likes: 0, comments: [], liked: false}, ...posts])} onToggleLike={(id) => setPosts(posts.map(p => p.id === id ? {...p, likes: p.liked ? p.likes - 1 : p.likes + 1, liked: !p.liked} : p))} onAddComment={() => {}} userTier={userTier} onDeletePost={(id) => setPosts(posts.filter(p => p.id !== id))} userScore={120} username={user.username} />;
      case 'study_groups':
         return <StudyGroupsPage />;
      case 'billing':
         return <BillingPage currentTier={userTier} onSubscriptionActivated={(tier) => setUserTier(tier)} />;
      case 'profile':
         return <UserProfilePage />;
      case 'admin_panel':
         return <AdminDashboard stats={{totalUsers: 100, coursesCreated: courses.length, activeAssessments: assessments.length}} />;
      case 'setup_session':
         return <SetupSession onSessionCreated={(data) => { setSessionData(data); setCurrentView('learning_session'); }} courses={courses} />;
      case 'learning_session':
         if (sessionData) {
             const currentCourse = sessionData.courseId ? courses.find(c => c.id === sessionData.courseId) : undefined;
             const currentLesson = sessionData.lessonId && currentCourse ? currentCourse.lessons.find(l => l.id === sessionData.lessonId) : undefined;
             
             return <LearningSession 
                videoId={sessionData.videoId} 
                transcript={sessionData.transcript} 
                courseId={sessionData.courseId || 0}
                currentLesson={currentLesson}
                onUpdateLesson={(cId, lId, updates) => {
                    setCourses(courses.map(c => c.id === cId ? { ...c, lessons: c.lessons.map(l => l.id === lId ? { ...l, ...updates } : l) } : c));
                }}
                onSaveAssessment={(assessment) => {
                    setAssessments([...assessments, assessment]);
                }}
             />;
         }
         return <div>No session data</div>;
      default:
        return <div>View not found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        onLogout={logout} 
        onNewSession={() => setCurrentView('setup_session')}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        userTier={userTier}
        onTierChange={setUserTier}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
         <header className="lg:hidden p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="font-bold text-lg">EduReach</span>
            <button onClick={() => setIsMobileOpen(true)} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
         </header>
         <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {renderContent()}
         </main>
      </div>
    </div>
  );
};

export default App;