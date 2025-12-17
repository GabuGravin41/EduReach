export interface Lesson {
    id: number;
    title: string;
    videoId: string;
    isCompleted: boolean;
    duration: string;
    transcript?: string;
    thumbnail?: string;
}
export interface Course {
    id: number;
    title: string;
    description: string;
    progress: number;
    thumbnail: string;
    isPublic: boolean;
    lessons: Lesson[];
    notes?: any[];
}