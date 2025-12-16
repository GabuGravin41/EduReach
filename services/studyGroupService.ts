export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  member_count: number;
  max_members: number;
  is_public: boolean;
  is_member: boolean;
  course_title?: string;
}