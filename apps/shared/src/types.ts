export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ParentBrief {
  id: string;
  phone: string;
  nickname?: string;
}

export interface Child {
  id: string;
  name: string;
  english_name?: string;
  birth_date?: string;
  level?: string;
  parent_phone: string;
  totalhours: number;
  usedhours: number;
  remaining_hours: number;
  parent?: ParentBrief;
}

export interface Teacher {
  id: string;
  username: string;
  phone?: string;
  name: string;
  avatar_url?: string;
  hourly_rate?: number;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

export interface FeedbackBrief {
  id: string;
  content: string;
  homework?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  teacher?: { id: string; name: string };
  children?: { id: string; name: string }[];
  hours?: number;
  meeting_link?: string;
  feedback?: FeedbackBrief | null;
}

export interface CourseDetail extends Course {
  feedback?: FeedbackBrief | null;
}

export interface Feedback {
  id: string;
  course_id: string;
  content: string;
  homework?: string;
  notes?: string;
  created_by: string;
  teacher?: { id: string; name: string };
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  category: string;
  pdf_url?: string;
  sort_order: number;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ReadingMaterial {
  id: string;
  title: string;
  level: string;
  category: string;
  cover_url?: string;
  pdf_url?: string;
  page_count: number;
  sort_order: number;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  must_change_password?: boolean;
}

export interface Payment {
  id: string;
  child_id: string;
  child_name?: string;
  amount: number;
  hours: number;
  payment_date: string;
  payment_method: string;
  note?: string;
  created_at: string;
}

export interface TeacherPayment {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  period_start: string;
  period_end: string;
  hours: number;
  hourly_rate: number;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at?: string;
  payment_method?: string;
  note?: string;
  created_at: string;
}
