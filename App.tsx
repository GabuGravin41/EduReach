import React, { useState, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { authService } from './src/services/authService';
import { useCourses, useCreateCourse, useCourse, COURSE_KEYS } from './src/hooks/useCourses';
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
import { BillingPage } from './components/BillingPage';
import { UserCircleIcon } from './components/icons/UserCircleIcon';
import { MenuIcon } from './components/icons/MenuIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { courseService, Course } from './src/services/courseService';

// Lazy load heavy components for better performance
const CreateCoursePage = lazy(() => import('./components/CreateCoursePage').then(module => ({ default: module.CreateCoursePage })));
const CreateExamPage = lazy(() => import('./components/CreateExamPage').then(module => ({ default: module.CreateExamPage })));
const PricingPage = lazy(() => import('./components/PricingPage').then(module => ({ default: module.PricingPage })));
const GenerateAIQuizPage = lazy(() => import('./components/GenerateAIQuizPage').then(module => ({ default: module.GenerateAIQuizPage })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const UserProfilePage = lazy(() => import('./components/UserProfilePage').then(module => ({ default: module.UserProfilePage })));
const EnhancedAssessmentsPage = lazy(() => import('./components/EnhancedAssessmentsPage').then(module => ({ default: module.EnhancedAssessmentsPage })));
const EnhancedCreateExamPage = lazy(() => import('./components/EnhancedCreateExamPage').then(module => ({ default: module.EnhancedCreateExamPage })));
const StudyGroupsPage = lazy(() => import('./components/StudyGroupsPage').then(module => ({ default: module.StudyGroupsPage })));

export type View =
    | 'dashboard'
    | 'courses'
    | 'assessments'
    | 'community'
    | 'study_groups'
    | 'new_session'
    | 'learning_session'
    | 'course_detail'
    | 'exam_detail'
    | 'create_course'
    | 'create_exam'
    | 'pricing'
    | 'billing'
    | 'generate_ai_quiz'
    | 'admin_panel'
    | 'profile';
export type UserTier = 'free' | 'learner' | 'pro' | 'pro_plus' | 'admin';

interface SessionData {
  videoId: string;
  transcript: string;
  courseId?: number;
  title?: string;
}

interface SessionInitPayload {
  videoId: string;
  transcript: string;
  title?: string;
  courseId?: number | null;
  attachToCourse?: boolean;
}

type NewLessonInput = {
  title: string;
  videoId: string;
  transcript?: string;
  duration?: string;
};

// Mock Data - replaced with API data
// Using empty arrays to force reliance on API (catches integration bugs early)
const initialCourses: Course[] = [];
const initialAssessments: any[] = [];

const initialPosts: any[] = [];


const AppContent: React.FC = () => {
    const { user, isLoading, isAuthenticated, logout } = useAuth();
    const queryClient = useQueryClient();

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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
    const [pendingUpgradeTier, setPendingUpgradeTier] = useState<'learner' | 'pro' | 'pro_plus' | null>(null);

    // Local state for user-created items (fallbacks when API is unavailable)
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

    const courseMap = new Map<number, Course>();
    [...initialCourses, ...apiCoursesArray].forEach((course) => {
        if (course && typeof course.id === 'number') {
            courseMap.set(course.id, course);
        }
    });
    const courses = Array.from(courseMap.values());
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

    const invalidateCourseQueries = async (courseId?: number) => {
        const promises = [
            queryClient.invalidateQueries({ queryKey: COURSE_KEYS.lists() }),
            queryClient.invalidateQueries({ queryKey: COURSE_KEYS.my() }),
        ];
        if (courseId) {
            promises.push(queryClient.invalidateQueries({ queryKey: COURSE_KEYS.detail(courseId) }));
        }
        await Promise.all(promises);
    };

    const handleAddLessonToCourse = async (courseId: number, lessonInput: NewLessonInput) => {
        try {
            await courseService.addLessonToCourse(courseId, {
                title: lessonInput.title,
                video_id: lessonInput.videoId,
                transcript: lessonInput.transcript ?? '',
                duration: lessonInput.duration ?? 'N/A',
            });
            await invalidateCourseQueries(courseId);
        } catch (error) {
            console.error('Failed to add lesson to course', error);
            throw error;
        }
    };

    const ensurePersonalCourseOnServer = async () => {
        const result = await courseService.ensurePersonalCourse();
        await invalidateCourseQueries(result.course.id);
        return result.course;
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
        setPendingUpgradeTier(newTier);
        setCurrentView('billing');
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

    const handleSessionCreated = async ({
        videoId,
        transcript,
        title,
        courseId = null,
        attachToCourse = true,
    }: SessionInitPayload) => {
        const sessionTitle = title || 'Learning Session';
        let resolvedCourseId = courseId;

        if (attachToCourse) {
            try {
                if (resolvedCourseId) {
                    await handleAddLessonToCourse(resolvedCourseId, {
                        title: sessionTitle,
                        videoId,
                        transcript,
                    });
                } else {
                    const personalCourse = await ensurePersonalCourseOnServer();
                    resolvedCourseId = personalCourse.id;
                    await handleAddLessonToCourse(resolvedCourseId, {
                        title: sessionTitle,
                        videoId,
                        transcript,
                    });
                }
            } catch (error) {
                console.error('Failed to attach lesson to course', error);
            }
        }

        setSessionData({
            videoId,
            transcript,
            courseId: resolvedCourseId ?? undefined,
            title: sessionTitle,
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
            case 'study_groups':
                return <StudyGroupsPage />;
            case 'new_session':
                return <SetupSession onSessionCreated={handleSessionCreated} courses={courses} />;
            case 'create_course':
                return <CreateCoursePage onCourseCreated={handleCourseCreated} onCancel={() => setCurrentView('courses')} lessonLimit={999} setView={setCurrentView}/>;
            case 'create_exam':
                return <EnhancedCreateExamPage onExamCreated={handleExamCreated} onCancel={() => setCurrentView('assessments')} userTier={effectiveUserTier} />;
            case 'generate_ai_quiz':
                return <GenerateAIQuizPage onQuizCreated={handleExamCreated} onCancel={() => setCurrentView('assessments')} userTier={effectiveUserTier} />;
            case 'pricing':
                return <PricingPage currentTier={effectiveUserTier} onSelectTier={handlePlanSelected} />;
            case 'billing':
                return (
                    <BillingPage
                        requestedTier={pendingUpgradeTier}
                        onSubscriptionActivated={() => {
                            setPendingUpgradeTier(null);
                            setCurrentView('dashboard');
                        }}
                    />
                );
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

                const mergedCourse = courses.find((c) => c.id === selectedCourseId) ?? selectedCourseQuery.data;

                if (!mergedCourse) {
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
                        course={mergedCourse}
                        setView={setCurrentView}
                        onStartLesson={handleSessionCreated}
                        onAddLesson={handleAddLessonToCourse}
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
                onNewSession={() => {
                    setCurrentView('new_session');
                    setIsMobileMenuOpen(false);
                }}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                userTier={isActualAdmin ? 'admin' : effectiveUserTier}
                onTierChange={handleTierChange}
                isMobileOpen={isMobileMenuOpen}
                setIsMobileOpen={setIsMobileMenuOpen}
            />
            <main className="flex-1 overflow-y-auto lg:ml-0">
                {/* Mobile Header with Hamburger */}
                <div className="lg:hidden sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shadow-sm">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400"
                        aria-label="Open menu"
                    >
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-blue-600" />
                        <span className="text-lg font-bold text-gray-800 dark:text-white">EduReach</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-200 to-emerald-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <UserCircleIcon className="w-5 h-5 text-blue-700 dark:text-gray-300" />
                    </div>
                </div>
                
                {/* Main Content */}
                <div className="p-4 sm:p-6 lg:p-8">
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
                </div>
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
