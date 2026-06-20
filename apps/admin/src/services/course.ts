/**
 * Course management API service (API-06).
 *
 * Consumed by ADMIN-04 A-COURSES / A-COURSE-FORM.
 * All endpoints require admin role — auth handled by client.ts interceptor.
 *
 * Endpoints:
 * - GET /courses/all — paginated list (teacher+admin)
 * - GET /courses/:id — course detail with feedback
 * - POST /courses — create course + enroll students (admin)
 * - PUT /courses/:id — update course (admin)
 * - DELETE /courses/:id — delete course (admin, cascade)
 */

import client from '../api/client';

// ── Types ─────────────────────────────────────────

/** Brief teacher info embedded in course response. */
export interface TeacherBrief {
  id: string;
  name: string;
}

/** Brief child info embedded in course response. */
export interface ChildBrief {
  id: string;
  name: string;
}

/** Feedback info embedded in course detail (read-only in ADMIN-04). */
export interface FeedbackBrief {
  id: string;
  content: string;
  homework: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Course status enum. */
export type CourseStatus = 'pending' | 'completed' | 'cancelled';

/** Course record returned in list views (CourseOut). */
export interface Course {
  id: string;
  date: string;           // YYYY-MM-DD
  start_time: string;     // HH:MM:SS
  end_time: string;       // HH:MM:SS
  teacher_id: string;
  teacher: TeacherBrief | null;
  meeting_link: string | null;
  status: CourseStatus;
  hours: number;
  children: ChildBrief[];
  created_at: string;
  updated_at: string;
}

/** Course detail with feedback (CourseDetail). */
export interface CourseDetail extends Course {
  feedback: FeedbackBrief | null;
}

/** Paginated list response per TECH-SPEC 5.9. */
export interface CourseListResponse {
  items: Course[];
  total: number;
  page: number;
  page_size: number;
}

/** POST /courses request body (CourseCreate). */
export interface CourseCreateParams {
  date: string;           // YYYY-MM-DD
  start_time: string;     // HH:MM
  end_time: string;       // HH:MM
  teacher_id: string;
  meeting_link?: string;
  child_ids: string[];
  hours?: number;
}

/** PUT /courses/:id request body (CourseUpdate). All fields optional. */
export interface CourseUpdateParams {
  date?: string;
  start_time?: string;
  end_time?: string;
  teacher_id?: string;
  meeting_link?: string | null; // null = clear the field
  status?: CourseStatus;
  child_ids?: string[]; // full replacement
  hours?: number;
}

// ── API functions ─────────────────────────────────

/** GET /courses/all — paginated list with optional month filter */
export async function getCourseList(
  page: number = 1,
  pageSize: number = 20,
  month?: string, // YYYY-MM format
): Promise<CourseListResponse> {
  const params: Record<string, unknown> = { page, page_size: pageSize };
  if (month) params.month = month;
  const res = await client.get<CourseListResponse>('/courses/all', { params });
  return res.data;
}

/** GET /courses/:id — course detail with feedback */
export async function getCourseDetail(id: string): Promise<CourseDetail> {
  const res = await client.get<CourseDetail>(`/courses/${id}`);
  return res.data;
}

/** POST /courses — create course + enroll students */
export async function createCourse(
  params: CourseCreateParams,
): Promise<CourseDetail> {
  const res = await client.post<CourseDetail>('/courses', params);
  return res.data;
}

/** PUT /courses/:id — update course */
export async function updateCourse(
  id: string,
  params: CourseUpdateParams,
): Promise<CourseDetail> {
  const res = await client.put<CourseDetail>(`/courses/${id}`, params);
  return res.data;
}

/** DELETE /courses/:id — delete course (cascade deletes course_students + feedbacks) */
export async function deleteCourse(id: string): Promise<void> {
  await client.delete(`/courses/${id}`);
}
