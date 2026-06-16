export interface CurrentUser {
  id: string;
  role: string;
  teacher_id?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  role: string;
}

export interface ChildBrief {
  id: string;
  name: string;
  english_name?: string;
}

export interface TeacherBrief {
  id: string;
  name: string;
}

export interface TeacherNameBrief {
  id: string;
  name: string;
}

export interface ChildOut {
  id: string;
  name: string;
  english_name?: string;
  birth_date?: string;
  level?: string;
  parent_id: string;
  parent?: { id: string; phone: string; nickname?: string };
  created_at: string;
  updated_at: string;
}

export interface CourseOut {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  teacher_id: string;
  teacher: TeacherBrief;
  meeting_link?: string;
  status: 'pending' | 'completed' | 'cancelled';
  children: ChildBrief[];
  created_at: string;
  updated_at: string;
}

export interface FeedbackOut {
  id: string;
  course_id: string;
  content: string;
  homework?: string;
  notes?: string;
  created_by: string;
  teacher: TeacherNameBrief;
  created_at: string;
  updated_at: string;
}

export interface CourseDetail extends CourseOut {
  feedback?: FeedbackOut;
}

export type MaterialLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
export type MaterialCategory = 'picture_book' | 'short_text' | 'story' | 'read_aloud';
export type ResourceCategory = 'phonics' | 'word_card' | 'recommended';

export interface MaterialOut {
  id: string;
  title: string;
  level: MaterialLevel;
  category: MaterialCategory;
  cover_url?: string;
  pdf_url: string;
  page_count: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaterialDetail extends MaterialOut {
  signed_pdf_url?: string;
}

export interface ProgressOut {
  id: string;
  material_id: string;
  child_id: string;
  current_page: number;
  completed: boolean;
  last_read_at: string;
  title?: string;
  level?: MaterialLevel;
  category?: MaterialCategory;
  cover_url?: string;
  page_count?: number;
}

export interface ResourceOut {
  id: string;
  title: string;
  category: ResourceCategory;
  pdf_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceDetail extends ResourceOut {
  signed_pdf_url?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
