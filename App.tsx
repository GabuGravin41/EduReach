
import React, { useState, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { LearningSession } from './components/LearningSession';
import { SetupSession } from './components/SetupSession';
import { MyCoursesPage } from './components/MyCoursesPage';
import { AssessmentsPage } from './components/AssessmentsPage';
import { CommunityPage } from './components/CommunityPage';
import { CourseDetailPage } from './components/CourseDetailPage';
import { ExamDetailPage } from './components/ExamDetailPage';
import { CreateCoursePage } from './components/CreateCoursePage';
import { CreateExamPage } from './components/CreateExamPage';
import { UserCircleIcon } from './components/icons/UserCircleIcon';
import { GenerateAIQuizPage } from './components/GenerateAIQuizPage';
import { AdminDashboard } from './components/AdminDashboard';
import { BillingPage } from './components/BillingPage';
import { StudyGroupsPage } from './components/StudyGroupsPage';
import { UserProfilePage } from './components/UserProfilePage';
import { DiscussionsPage } from './components/DiscussionsPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Course, Assessment, Lesson, Question } from './types';

export type View = 'dashboard' | 'courses' | 'assessments' | 'community' | 'new_session' | 'learning_session' | 'course_detail' | 'exam_detail' | 'create_course' | 'create_exam' | 'generate_ai_quiz' | 'admin_panel' | 'billing' | 'study_groups' | 'profile' | 'discussions';
export type UserTier = 'free' | 'learner' | 'pro' | 'pro_plus' | 'admin';

interface SessionData {
  videoId: string;
  transcript: string;
  courseId?: number;
  lessonId?: number;
}

// Real YouTube Data
const initialCourses: Course[] = [
  { 
    id: 1, 
    title: 'Advanced JavaScript Patterns', 
    description: 'Deep dive into the JS engine, event loops, and advanced asynchronous patterns.', 
    progress: 35, 
    thumbnail: 'https://i.ytimg.com/vi/8aGhZQkoFbQ/maxresdefault.jpg', 
    isPublic: true, 
    lessons: [
      { id: 101, title: 'The Event Loop Explained', videoId: '8aGhZQkoFbQ', isCompleted: true, duration: '26 min', transcript: '' },
      { id: 102, title: 'JavaScript Closures (Fireship)', videoId: 'v67LloZ1ieI', isCompleted: true, duration: '8 min', transcript: '' },
      { id: 103, title: 'Async/Await Pro Tips', videoId: 'vn3tm0quoqE', isCompleted: false, duration: '11 min', transcript: '' },
      { id: 104, title: 'JavaScript Prototypal Inheritance', videoId: '1pGbzU9w4ho', isCompleted: false, duration: '15 min', transcript: '' }
    ] 
  },
  { 
    id: 2, 
    title: 'Data Structures & Algorithms', 
    description: 'Essential CS concepts for coding interviews and efficient software design.', 
    progress: 15, 
    thumbnail: 'https://i.ytimg.com/vi/RBSGKlAvoiM/maxresdefault.jpg', 
    isPublic: true, 
    lessons: [
      { id: 201, title: 'DSA for Beginners (Full Course)', videoId: 'RBSGKlAvoiM', isCompleted: true, duration: '8 hrs', transcript: '' },
      { id: 202, title: 'Big O Notation', videoId: '__vX2sjlpXU', isCompleted: false, duration: '10 min', transcript: '' },
      { id: 203, title: 'Binary Search Explained', videoId: 'MFhxShFgfoc', isCompleted: false, duration: '15 min', transcript: '' },
      { id: 204, title: 'Graph Algorithms', videoId: 'DBRW8nwZV-g', isCompleted: false, duration: '2 hrs', transcript: '' }
    ] 
  },
  { 
    id: 3, 
    title: 'React Ecosystem Mastery', 
    description: 'Build modern, fast, and scalable web applications with React, Next.js, and Hooks.', 
    progress: 0, 
    thumbnail: 'https://i.ytimg.com/vi/Tn6-PIqc4UM/maxresdefault.jpg', 
    isPublic: false, 
    lessons: [
      { id: 301, title: 'React in 100 Seconds', videoId: 'Tn6-PIqc4UM', isCompleted: false, duration: '2 min', transcript: '' },
      { id: 302, title: 'React Hooks Course', videoId: 'TNhaISOUy6Q', isCompleted: false, duration: '1 hr', transcript: '' },
      { id: 303, title: 'Next.js 14 Full Course', videoId: 'zvX3OpGC2QI', isCompleted: false, duration: '4 hrs', transcript: '' },
      { id: 304, title: 'Redux Toolkit Tutorial', videoId: 'NqzdVN2tyvQ', isCompleted: false, duration: '45 min', transcript: '' }
    ] 
  },
  { 
    id: 4, 
    title: 'Neural Networks & Deep Learning', 
    description: 'Understanding the math and intuition behind modern AI, featuring 3Blue1Brown.', 
    progress: 0, 
    thumbnail: 'https://i.ytimg.com/vi/aircAruvnKk/maxresdefault.jpg', 
    isPublic: true, 
    lessons: [
      { id: 401, title: 'But what is a Neural Network?', videoId: 'aircAruvnKk', isCompleted: false, duration: '20 min', transcript: '' },
      { id: 402, title: 'Gradient Descent', videoId: 'IHZwWFHWa-w', isCompleted: false, duration: '21 min', transcript: '' },
      { id: 403, title: 'Backpropagation Calculus', videoId: 'tIeHLnjs5U8', isCompleted: false, duration: '14 min', transcript: '' },
      { id: 404, title: 'Transformers Explained', videoId: 'wjZofJX0v4M', isCompleted: false, duration: '15 min', transcript: '' }
    ] 
  },
];

// REAL MOCK QUESTIONS to populate the assessment
const MOCK_JS_QUESTIONS: Question[] = [
    {
        id: 'q1', type: 'multiple_choice', points: 10,
        question_text: "Which of the following describes the 'Call Stack' in JavaScript?",
        options: ["A data structure for memory allocation", "A mechanism to keep track of function calls", "A browser API for DOM manipulation", "A queue for asynchronous tasks"],
        correct_answer_index: 1,
    },
    {
        id: 'q2', type: 'multiple_choice', points: 10,
        question_text: "What happens when you execute a function that contains a `setTimeout`?",
        options: ["It pauses the entire program", "It executes immediately on a separate thread", "The callback is pushed to the Web APIs / Callback Queue", "It throws an error in strict mode"],
        correct_answer_index: 2,
    },
    {
        id: 'q3', type: 'true_false', points: 10,
        question_text: "JavaScript is a multi-threaded language by default.",
        correct_answer: false,
    },
    {
        id: 'q4', type: 'short_answer', points: 10,
        question_text: "What keyword is used to declare an asynchronous function?",
        correct_answers: ["async"],
        case_sensitive: false, exact_match: true, max_length: 10
    }
];

const initialAssessments: Assessment[] = [
  { 
      id: 1, 
      title: 'Event Loop Mastery', 
      topic: 'JavaScript', 
      questions: 4, 
      time: 15, 
      status: 'pending', 
      score: '', 
      description: 'Deep dive into the JavaScript runtime model. Test your understanding of the Stack, Heap, and Queue.', 
      difficulty: 'hard', 
      question_types: ['multiple_choice', 'true_false', 'short_answer'], 
      created_at: '2023-10-01',
      questions_data: MOCK_JS_QUESTIONS 
  },
  { 
      id: 2, 
      title: 'React Hooks Practice', 
      topic: 'React', 
      questions: 0, 
      time: 25, 
      status: 'pending', 
      score: '', 
      description: 'Test your knowledge on useEffect, useState, and custom hooks.', 
      difficulty: 'medium', 
      question_types: ['multiple_choice', 'short_answer'], 
      created_at: '2023-10-05',
      questions_data: [] // Empty for now, but user can see it's pending
  },
];

const initialPosts = [
  {
    id: 1, author: 'Frank', avatar: UserCircleIcon, time: '2h ago',
    content: 'Just finished the "Advanced JavaScript" exam, that was tough! Anyone have tips for understanding prototypal inheritance better?',
    likes: 15, comments: [{author: 'Grace', content: 'Same here!'}], liked: false,
  },
  {
    id: 2, author: 'Grace', avatar: UserCircleIcon, time: '5h ago',
    content: 'I created a new course collection for "Linear Algebra for Machine Learning". Check it out!',
    likes: 32, comments: [], liked: true,
  },
];

const queryClient = new QueryClient();

const MainApp: React.FC = () => {
    const { user, logout } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
    
    // State
    const [userTier, setUserTier] = useState<UserTier>('free');
    const [courses, setCourses] = useState<Course[]>(initialCourses);
    const [assessments, setAssessments] = useState<Assessment[]>(initialAssessments);
    const [communityPosts, setCommunityPosts] = useState(initialPosts);
    
    // Tier Limits
    const TIER_LIMITS = {
        free: { courses: 1, lessonsPerCourse: 5, assessments: 2 },
        learner: { courses: 5, lessonsPerCourse: 25, assessments: 10 },
        pro: { courses: Infinity, lessonsPerCourse: Infinity, assessments: 50 },
        pro_plus: { courses: Infinity, lessonsPerCourse: Infinity, assessments: Infinity },
        admin: { courses: Infinity, lessonsPerCourse: Infinity, assessments: Infinity },
    };
    const limits = TIER_LIMITS[userTier];

    // Tier Usage Mock
    const tierUsage = {
        assessments_used: assessments.length,
        assessments_limit: limits.assessments,
        resets_at: new Date(Date.now() + 86400000 * 15).toISOString(), // 15 days from now
    };

    // Calculate User Score
    const userScore = useMemo(() => {
        let score = 0;
        // Points for completed lessons
        courses.forEach(course => {
            course.lessons.forEach(lesson => {
                if (lesson.isCompleted) score += 50;
            });
        });
        // Points for completed assessments (Mock calculation)
        assessments.forEach(assessment => {
            if (assessment.status === 'completed') score += 100;
        });
        return score;
    }, [courses, assessments]);

    if (!user) {
        return <LoginScreen />;
    }

    const handleLogout = () => {
        logout();
        setCurrentView('dashboard');
        setSessionData(null);
    };

    const handleTierChange = (newTier: UserTier) => {
        setUserTier(newTier);
        if (newTier === 'admin' && currentView !== 'admin_panel') {
            setCurrentView('admin_panel');
        } else if (newTier !== 'admin' && currentView === 'admin_panel') {
            setCurrentView('dashboard');
        }
    };
    
    const handlePlanSelected = (newTier: 'learner' | 'pro' | 'pro_plus') => {
        setUserTier(newTier);
    };
    
    const handleCourseCreated = (newCourse: any) => {
        setCourses(prev => [...prev, { ...newCourse, id: Date.now(), progress: 0 }]);
        setCurrentView('courses');
    };

    // Update global course metadata
    const handleUpdateCourse = (courseId: number, updates: Partial<Course>) => {
        setCourses(prev => prev.map(c => c.id === courseId ? { ...c, ...updates } : c));
    };
    
    const handleExamCreated = (newExam: any) => {
        setAssessments(prev => [...prev, { ...newExam, id: Date.now(), status: 'pending', score: '', created_at: new Date().toISOString() }]);
        setCurrentView('assessments');
    };

    // Persistence: Add a newly generated quiz to the assessments list
    const handleSaveAssessment = (assessment: Assessment) => {
        setAssessments(prev => [
            { 
                ...assessment, 
                id: Date.now(), 
                status: 'pending', 
                score: '', 
                created_at: new Date().toISOString() 
            }, 
            ...prev
        ]);
        // Note: No alert needed here as LearningSession shows "Saved!"
    };

    const handlePostCreated = (content: string) => {
      const newPost = {
        id: Date.now(),
        author: user.username || 'User',
        avatar: UserCircleIcon,
        time: 'Just now',
        content,
        likes: 0,
        comments: [],
        liked: false,
      };
      setCommunityPosts(prev => [newPost, ...prev]);
    };
    
    const handleToggleLike = (postId: number) => {
      setCommunityPosts(posts => posts.map(p => {
        if (p.id === postId) {
          return { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 };
        }
        return p;
      }));
    };

    const handleAddComment = (postId: number, comment: string) => {
      setCommunityPosts(posts => posts.map(p => {
        if (p.id === postId) {
          const newComment = { author: user.username || 'User', content: comment };
          return { ...p, comments: [...p.comments, newComment]};
        }
        return p;
      }));
    };

    const handleDeletePost = (postId: number) => {
        if (userTier !== 'admin') return;
        if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            setCommunityPosts(posts => posts.filter(p => p.id !== postId));
        }
    };

    /**
     * Updates a lesson within a course and recalculates course progress.
     */
    const handleUpdateLesson = (courseId: number, lessonId: number, updates: Partial<Lesson>) => {
        setCourses(prevCourses => {
            return prevCourses.map(course => {
                if (course.id !== courseId) return course;

                const updatedLessons = course.lessons.map(lesson => 
                    lesson.id === lessonId ? { ...lesson, ...updates } : lesson
                );

                // Recalculate progress
                const completedCount = updatedLessons.filter(l => l.isCompleted).length;
                const newProgress = Math.round((completedCount / updatedLessons.length) * 100);

                return {
                    ...course,
                    lessons: updatedLessons,
                    progress: newProgress
                };
            });
        });
    };

    // Updated to persist the session as a lesson in a course
    const handleSessionCreated = (payload: { videoId: string; transcript: string; title?: string; courseId?: number | null, lessonId?: number }) => {
        const { videoId, transcript, title, courseId, lessonId } = payload;
        
        // 1. Determine target course (existing, or create new "Personal")
        let targetCourseId = courseId;
        
        if (!targetCourseId) {
            // Find or create "Personal Learning" course
            let personalCourse = courses.find(c => c.title === "Personal Learning");
            if (!personalCourse) {
                personalCourse = {
                    id: Date.now(),
                    title: "Personal Learning",
                    description: "Your auto-saved learning sessions.",
                    progress: 0,
                    thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
                    isPublic: false,
                    lessons: []
                };
                setCourses(prev => [...prev, personalCourse!]);
                // We'll have to rely on the effect of state update or just proceed with new ID
                // For simplicity in sync logic, we use the timestamp ID directly
                targetCourseId = personalCourse.id;
            } else {
                targetCourseId = personalCourse.id;
            }
        }

        let targetLessonId = lessonId;

        // 2. Check for duplicate lesson in the target course IF we don't have a lessonId yet
        if (!targetLessonId) {
            const course = courses.find(c => c.id === targetCourseId);
            const existingLesson = course?.lessons.find(l => l.videoId === videoId);
            
            if (existingLesson) {
                // If lesson exists, use it!
                targetLessonId = existingLesson.id;
            } else {
                // 3. Create new lesson only if it doesn't exist
                 const newLesson: Lesson = {
                    id: Date.now(),
                    title: title || 'Untitled Session',
                    videoId: videoId,
                    isCompleted: false,
                    duration: 'N/A',
                    transcript: transcript,
                    thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
                };
                targetLessonId = newLesson.id;
    
                // Add lesson to the specific course
                setCourses(prev => prev.map(c => {
                    if (c.id === targetCourseId) {
                        return {
                            ...c,
                            lessons: [...c.lessons, newLesson]
                        };
                    }
                    return c;
                }));
            }
        }

        // 4. Navigate to session
        setSessionData({ 
            videoId, 
            transcript, 
            courseId: targetCourseId as number,
            lessonId: targetLessonId
        });
        setCurrentView('learning_session');
    };

    const handleSelectCourse = (courseId: number) => {
        setSelectedCourseId(courseId);
        setCurrentView('course_detail');
    };

    const handleSelectExam = (examId: number) => {
        setSelectedExamId(examId);
        setCurrentView('exam_detail');
    };

    const navigateToCreateCourse = () => {
        const userCourses = courses.filter(c => !c.isPublic).length;
        if (userCourses >= limits.courses) {
            alert(`You've reached your limit of ${limits.courses} course(s). Please upgrade to create more.`);
            setCurrentView('billing');
        } else {
            setCurrentView('create_course');
        }
    };

    const renderContent = () => {
        if (userTier === 'admin' && currentView !== 'admin_panel' && currentView !== 'community' && currentView !== 'courses') {
            setCurrentView('admin_panel');
        }
        
        switch (currentView) {
            case 'admin_panel':
                return userTier === 'admin' ? <AdminDashboard stats={{ totalUsers: 1345, coursesCreated: courses.length, activeAssessments: assessments.length }} /> : <Dashboard onStartSession={() => setCurrentView('new_session')} onSelectCourse={handleSelectCourse} userTier={userTier}/>;
            case 'dashboard':
                return <Dashboard onStartSession={() => setCurrentView('new_session')} onSelectCourse={handleSelectCourse} userTier={userTier} />;
            case 'courses':
                const visibleCourses = userTier === 'admin' ? courses : courses;
                return <MyCoursesPage courses={visibleCourses} onSelectCourse={handleSelectCourse} onNewCourse={navigateToCreateCourse} userTier={userTier} />;
            case 'assessments':
                return <AssessmentsPage assessments={assessments} onSelectExam={handleSelectExam} setView={setCurrentView} userTier={userTier} tierUsage={tierUsage} />;
            case 'community':
                return <CommunityPage 
                    posts={communityPosts} 
                    onPostCreated={handlePostCreated} 
                    onToggleLike={handleToggleLike} 
                    onAddComment={handleAddComment} 
                    userTier={userTier} 
                    onDeletePost={handleDeletePost}
                    userScore={userScore}
                    username={user.username}
                />;
            case 'study_groups':
                return <StudyGroupsPage />;
            case 'billing':
                return <BillingPage currentTier={userTier} onSubscriptionActivated={handlePlanSelected} />;
            case 'profile':
                return <UserProfilePage />;
            case 'new_session':
                return <SetupSession onSessionCreated={handleSessionCreated} courses={courses} />;
            case 'create_course':
                return <CreateCoursePage onCourseCreated={handleCourseCreated} onCancel={() => setCurrentView('courses')} lessonLimit={limits.lessonsPerCourse} setView={setCurrentView}/>;
            case 'create_exam':
                return <CreateExamPage onExamCreated={handleExamCreated} onCancel={() => setCurrentView('assessments')} userTier={userTier} />;
            case 'generate_ai_quiz':
                return <GenerateAIQuizPage onQuizCreated={handleExamCreated} onCancel={() => setCurrentView('assessments')} />;
            case 'learning_session':
                if (sessionData && sessionData.courseId && sessionData.lessonId) {
                    // Find the current lesson object to pass down
                    const course = courses.find(c => c.id === sessionData.courseId);
                    const currentLesson = course?.lessons.find(l => l.id === sessionData.lessonId);
                    
                    return <LearningSession 
                        videoId={sessionData.videoId} 
                        transcript={sessionData.transcript} 
                        courseId={sessionData.courseId}
                        currentLesson={currentLesson}
                        onUpdateLesson={handleUpdateLesson}
                        onSaveAssessment={handleSaveAssessment}
                    />;
                }
                setCurrentView('new_session'); 
                return null;
            case 'course_detail':
                if (selectedCourseId) {
                    const course = courses.find(c => c.id === selectedCourseId);
                    return <CourseDetailPage 
                        course={course as any} 
                        setView={setCurrentView} 
                        onStartLesson={handleSessionCreated} 
                        userTier={userTier}
                        onUpdateCourse={handleUpdateCourse}
                        onUpdateLesson={handleUpdateLesson}
                        assessments={assessments}
                        onSelectExam={handleSelectExam}
                    />;
                }
                setCurrentView('courses');
                return null;
            case 'discussions':
                if (selectedCourseId) {
                    return <DiscussionsPage courseId={selectedCourseId} />;
                }
                setCurrentView('courses');
                return null;
            case 'exam_detail':
                if (selectedExamId) {
                    const exam = assessments.find(e => e.id === selectedExamId);
                    return <ExamDetailPage exam={exam!} setView={setCurrentView} />;
                }
                setCurrentView('assessments');
                return null;
            default:
                return <Dashboard onStartSession={() => setCurrentView('new_session')} onSelectCourse={handleSelectCourse} userTier={userTier} />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 overflow-hidden">
            <Sidebar 
                currentView={currentView}
                setView={setCurrentView}
                onLogout={handleLogout}
                onNewSession={() => setCurrentView('new_session')}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                userTier={userTier}
                onTierChange={handleTierChange}
                isMobileOpen={isMobileMenuOpen}
                setIsMobileOpen={setIsMobileMenuOpen}
            />
            {/* Main Content Area - constrained to viewport height, scrollable internally */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-white/50 dark:bg-slate-900/50">
                <div className="flex-1 overflow-y-auto w-full">
                    <div className="w-full h-full max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8">
                        {/* Mobile Menu Toggle */}
                        <button 
                            className="lg:hidden mb-4 p-2 text-slate-600 dark:text-slate-300 w-fit rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <MainApp />
            </AuthProvider>
        </QueryClientProvider>
    );
};

export default App;
