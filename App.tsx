import React, { useState, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { authService } from './src/services/authService';
import { useCourses, useCreateCourse, useCourse } from './src/hooks/useCourses';
import { useAssessments, useCreateAssessment } from './src/hooks/useAssessments';
import { usePosts, useCreatePost, useToggleLike, useAddComment, useDeletePost } from './src/hooks/useCommunity';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import LearningSession from './components/LearningSession';
import { SetupSession } from './components/SetupSession';
import { MyCoursesPage } from './components/MyCoursesPage';
import { AssessmentsPage } from './components/AssessmentsPage';
import { CommunityPage } from './components/CommunityPage';
import { CourseDetailPage } from './components/CourseDetailPage';
import { ExamDetailPage } from './components/ExamDetailPage';
import { UserCircleIcon } from './components/icons/UserCircleIcon';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Lazy load heavy components for better performance
const CreateCoursePage = lazy(() => import('./components/CreateCoursePage').then(module => ({ default: module.CreateCoursePage })));
const CreateExamPage = lazy(() => import('./components/CreateExamPage').then(module => ({ default: module.CreateExamPage })));
const PricingPage = lazy(() => import('./components/PricingPage').then(module => ({ default: module.PricingPage })));
const GenerateAIQuizPage = lazy(() => import('./components/GenerateAIQuizPage').then(module => ({ default: module.GenerateAIQuizPage })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const UserProfilePage = lazy(() => import('./components/UserProfilePage').then(module => ({ default: module.UserProfilePage })));
const EnhancedAssessmentsPage = lazy(() => import('./components/EnhancedAssessmentsPage').then(module => ({ default: module.EnhancedAssessmentsPage })));
const EnhancedCreateExamPage = lazy(() => import('./components/EnhancedCreateExamPage').then(module => ({ default: module.EnhancedCreateExamPage })));

export type View = 'dashboard' | 'courses' | 'assessments' | 'community' | 'new_session' | 'learning_session' | 'course_detail' | 'exam_detail' | 'create_course' | 'create_exam' | 'pricing' | 'generate_ai_quiz' | 'admin_panel' | 'profile';
export type UserTier = 'free' | 'learner' | 'pro' | 'pro_plus' | 'admin';

interface SessionData {
  videoId: string;
  transcript: string;
}

// Mock Data - replaced with API data
// Using empty arrays to force reliance on API (catches integration bugs early)
const initialCourses: any[] = [];
const initialAssessments: any[] = [];

const initialPosts: any[] = [];


const AppContent: React.FC = () => {
    const { user, isLoading, isAuthenticated, logout } = useAuth();

    // API hooks
    const { data: apiCourses, isLoading: coursesLoading } = useCourses();
    const { data: apiAssessments, isLoading: assessmentsLoading } = useAssessments();
    const { data: apiPosts, isLoading: postsLoading } = usePosts();

    const createCourseMutation = useCreateCourse();
    const createAssessmentMutation = useCreateAssessment();
    const createPostMutation = useCreatePost();
    const toggleLikeMutation = useToggleLike();
    const addCommentMutation = useAddComment();
    const deletePostMutation = useDeletePost();

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

    // Local state for user-created items (fallbacks when API is unavailable)
    const [localCourses, setLocalCourses] = useState<typeof initialCourses>([]);
    const [localAssessments, setLocalAssessments] = useState<typeof initialAssessments>([]);
    const [localCommunityPosts, setLocalCommunityPosts] = useState<typeof initialPosts>([]);

    // Admin view mode - allows admin to see site as different tiers
    const [adminViewMode, setAdminViewMode] = useState<UserTier | null>(null);
    
    // Get effective user tier (admin view mode or actual user tier)
    const effectiveUserTier = user?.tier === 'admin' && adminViewMode ? adminViewMode : (user?.tier || 'free');
    const isActualAdmin = user?.tier === 'admin';

    // Single-course query for detail view
    const selectedCourseQuery = useCourse(selectedCourseId ?? 0);

    // Combine mock data with API data and local fallbacks
    // Ensure API data is an array before spreading
    const apiCoursesArray = Array.isArray(apiCourses) ? apiCourses : [];
    const apiAssessmentsArray = Array.isArray(apiAssessments) ? apiAssessments : [];
    const apiPostsArray = Array.isArray(apiPosts) ? apiPosts : [];

    const courses = [...initialCourses, ...apiCoursesArray, ...localCourses];
    const assessments = [...initialAssessments, ...apiAssessmentsArray, ...localAssessments];
    const communityPosts = [...initialPosts, ...apiPostsArray, ...localCommunityPosts];
    
    // Tier Limits
    const TIER_LIMITS = {
        free: { courses: 1, lessonsPerCourse: 5, assessments: 5 },
        learner: { courses: 5, lessonsPerCourse: 25, assessments: 50 },
        pro: { courses: Infinity, lessonsPerCourse: Infinity, assessments: Infinity },
        pro_plus: { courses: Infinity, lessonsPerCourse: Infinity, assessments: Infinity },
        admin: { courses: Infinity, lessonsPerCourse: Infinity, assessments: Infinity },
    };
    const limits = TIER_LIMITS[effectiveUserTier];
    
    // Mock tier usage data (in real app, this would come from API)
    const mockTierUsage = {
        assessments_used: effectiveUserTier === 'free' ? 1 : effectiveUserTier === 'learner' ? 3 : 12,
        assessments_limit: limits.assessments,
        resets_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginScreen />;
    }

    const handleLogout = async () => {
        await logout();
        setCurrentView('dashboard');
        setSessionData(null);
    };

    const handleTierChange = async (newTier: UserTier) => {
        // Admin users can switch view mode to see site as different tiers
        if (isActualAdmin) {
            setAdminViewMode(newTier === 'admin' ? null : newTier);
        } else {
            // Regular users can upgrade their actual tier
            try {
                await authService.upgradeTier(newTier);
                window.location.reload();
            } catch (error) {
                console.error('Failed to upgrade tier:', error);
                alert('Failed to upgrade tier. Please try again.');
            }
        }
    };
    
    const handlePlanSelected = async (newTier: 'learner' | 'pro' | 'pro_plus') => {
        // TODO: Implement real tier upgrade via API
        alert(`Congratulations! You've upgraded to the ${newTier.charAt(0).toUpperCase() + newTier.slice(1)} plan.`);
        setCurrentView('dashboard');
    };
    
    const handleCourseCreated = async (newCourse: Omit<typeof courses[0], 'id' | 'progress'>) => {
        try {
            await createCourseMutation.mutateAsync({
                title: newCourse.title,
                description: newCourse.description,
                isPublic: newCourse.isPublic,
                lessons: newCourse.lessons.map(lesson => ({
                    title: lesson.title,
                    videoId: lesson.videoId,
                    transcript: '',
                    isCompleted: lesson.isCompleted,
                    duration: lesson.duration,
                    order: 0
                }))
            });
            setCurrentView('courses');
        } catch (error) {
            console.error('Failed to create course:', error);
            // Fallback to mock data for now
            setLocalCourses(prev => [...prev, { ...newCourse, id: Date.now(), progress: 0 }]);
            setCurrentView('courses');
        }
    };
    
    const handleExamCreated = async (newExam: Omit<typeof assessments[0], 'id' | 'status' | 'score'>) => {
        try {
            await createAssessmentMutation.mutateAsync({
                title: newExam.title,
                description: newExam.description,
                topic: newExam.topic,
                questions: [], // Will be populated from the quiz generation
                time_limit: newExam.time
            });
            setCurrentView('assessments');
        } catch (error) {
            console.error('Failed to create assessment:', error);
            // Fallback to mock data
            setLocalAssessments(prev => [...prev, { ...newExam, id: Date.now(), status: 'pending', score: '' }]);
            setCurrentView('assessments');
        }
    };

    const handlePostCreated = async (content: string) => {
        try {
            await createPostMutation.mutateAsync({ content });
        } catch (error) {
            console.error('Failed to create post:', error);
            // Fallback to mock data
            const newPost = {
                id: Date.now(),
                author: user?.username || 'Guest User',
                avatar: UserCircleIcon,
                time: 'Just now',
                content,
                likes: 0,
                comments: [],
                liked: false,
            };
            setLocalCommunityPosts(prev => [newPost, ...prev]);
        }
    };
    
    const handleToggleLike = async (postId: number) => {
        try {
            await toggleLikeMutation.mutateAsync(postId);
        } catch (error) {
            console.error('Failed to toggle like:', error);
            // Fallback to local state
            setLocalCommunityPosts(posts => posts.map(p => {
                if (p.id === postId) {
                    return { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 };
                }
                return p;
            }));
        }
    };

    const handleAddComment = async (postId: number, comment: string) => {
        try {
            await addCommentMutation.mutateAsync({ postId, data: { content: comment } });
        } catch (error) {
            console.error('Failed to add comment:', error);
            // Fallback to local state
            setLocalCommunityPosts(posts => posts.map(p => {
                if (p.id === postId) {
                    const newComment = { author: user?.username || 'Guest User', content: comment };
                    return { ...p, comments: [...p.comments, newComment]};
                }
                return p;
            }));
        }
    };

    const handleDeletePost = async (postId: number) => {
        if (!isActualAdmin) return;
        if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            try {
                await deletePostMutation.mutateAsync(postId);
            } catch (error) {
                console.error('Failed to delete post:', error);
                // Fallback to local state
                setLocalCommunityPosts(posts => posts.filter(p => p.id !== postId));
            }
        }
    };

    const handleSessionCreated = (videoId: string, transcript: string) => {
        setSessionData({ videoId, transcript });
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
        setCurrentView('create_course');
    };

    const renderContent = () => {
        // Admin can access any view
        
        switch (currentView) {
            case 'admin_panel':
                return isActualAdmin ? <AdminDashboard stats={{ totalUsers: 1345, coursesCreated: 218, activeAssessments: 45 }} /> : <Dashboard onStartSession={() => setCurrentView('new_session')} onSelectCourse={handleSelectCourse} userTier={effectiveUserTier}/>;
            case 'dashboard':
                return <Dashboard onStartSession={() => setCurrentView('new_session')} onSelectCourse={handleSelectCourse} userTier={effectiveUserTier} />;
            case 'courses':
                // All users see all courses (public and their own)
                return <MyCoursesPage courses={courses} onSelectCourse={handleSelectCourse} onNewCourse={navigateToCreateCourse} userTier={effectiveUserTier} />;
            case 'assessments':
                return <EnhancedAssessmentsPage assessments={assessments} onSelectExam={handleSelectExam} setView={setCurrentView} userTier={effectiveUserTier} tierUsage={mockTierUsage} />;
            case 'community':
                return <CommunityPage posts={communityPosts} onPostCreated={handlePostCreated} onToggleLike={handleToggleLike} onAddComment={handleAddComment} userTier={effectiveUserTier} onDeletePost={handleDeletePost} />;
            case 'new_session':
                return <SetupSession onSessionCreated={handleSessionCreated} />;
            case 'create_course':
                return <CreateCoursePage onCourseCreated={handleCourseCreated} onCancel={() => setCurrentView('courses')} lessonLimit={999} setView={setCurrentView}/>;
            case 'create_exam':
                return <EnhancedCreateExamPage onExamCreated={handleExamCreated} onCancel={() => setCurrentView('assessments')} userTier={effectiveUserTier} />;
            case 'generate_ai_quiz':
                return <GenerateAIQuizPage onQuizCreated={handleExamCreated} onCancel={() => setCurrentView('assessments')} userTier={effectiveUserTier} />;
            case 'pricing':
                return <PricingPage currentTier={effectiveUserTier} onSelectTier={handlePlanSelected} />;
            case 'profile':
                return <UserProfilePage />;
            case 'learning_session':
                if (sessionData) {
                    return <LearningSession videoId={sessionData.videoId} transcript={sessionData.transcript} />;
                }
                setCurrentView('new_session'); 
                return null;
            case 'course_detail':
                if (!selectedCourseId) {
                    setCurrentView('courses');
                    return null;
                }

                if (selectedCourseQuery.isLoading) {
                    return (
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto"></div>
                                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading course...</p>
                            </div>
                        </div>
                    );
                }

                if (!selectedCourseQuery.data) {
                    return (
                        <div className="text-center">
                            <h2 className="text-2xl font-bold">Course Not Found</h2>
                            <button
                                onClick={() => setCurrentView('courses')}
                                className="mt-4 text-indigo-600 hover:underline"
                            >
                                Return to Courses
                            </button>
                        </div>
                    );
                }

                return (
                    <CourseDetailPage
                        course={selectedCourseQuery.data}
                        setView={setCurrentView}
                        onStartLesson={handleSessionCreated}
                        userTier={effectiveUserTier}
                    />
                );
            case 'exam_detail':
                if (selectedExamId) {
                    const exam = assessments.find(e => e.id === selectedExamId);
                    return <ExamDetailPage exam={exam!} setView={setCurrentView} />;
                }
                setCurrentView('assessments');
                return null;
            default:
                return <Dashboard onStartSession={() => setCurrentView('new_session')} onSelectCourse={handleSelectCourse} userTier={effectiveUserTier} />;
        }
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 text-gray-800 dark:text-gray-200">
            <Sidebar 
                currentView={currentView}
                setView={setCurrentView}
                onLogout={handleLogout}
                onNewSession={() => setCurrentView('new_session')}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                userTier={isActualAdmin ? 'admin' : effectiveUserTier}
                onTierChange={handleTierChange}
            />
            <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16 sm:ml-20' : 'ml-16 sm:ml-64'}`}>
                <Suspense fallback={
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
                        </div>
                    </div>
                }>
                    {renderContent()}
                </Suspense>
            </main>
        </div>
    );
};

const App: React.FC = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
                gcTime: 30 * 60 * 1000, // 30 minutes - cache retention (was cacheTime)
                retry: (failureCount, error: any) => {
                    // Don't retry on 4xx errors (client errors)
                    if (error?.response?.status >= 400 && error?.response?.status < 500) {
                        return false;
                    }
                    return failureCount < 2; // Retry up to 2 times for server errors
                },
                refetchOnWindowFocus: false, // Don't refetch when window regains focus
                refetchOnReconnect: true, // Refetch when network reconnects
                refetchOnMount: 'always', // Always refetch when component mounts
                // Background refetch interval (optional)
                refetchInterval: 10 * 60 * 1000, // 10 minutes for active queries
                refetchIntervalInBackground: false, // Don't refetch in background
            },
            mutations: {
                retry: 1, // Retry mutations once on failure
                // Global error handling for mutations
                onError: (error: any) => {
                    console.error('Mutation error:', error);
                    // Could add toast notifications here
                },
            },
        },
    });

    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
};

export default App;
