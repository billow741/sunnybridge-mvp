/**
 * Student (children) management API service (API-05).
 *
 * Consumed by ADMIN-03 A-STUDENTS / A-STUDENT-FORM.
 * All endpoints require admin role — auth handled by client.ts interceptor.
 *
 * Endpoints:
 * - GET  /children          — paginated list
 * - POST /children          — create (parent_phone → find or auto-create parent)
 * - PUT  /children/:id      — update
 * - DELETE /children/:id    — delete
 *
 * NOTE: GET /children/me is parent-only, NOT used in Admin Web.
 */

import client from '../api/client';

// ── Types ─────────────────────────────────────────

/** CEFR level enum: starter,A1,A2,B1,B2,C1,C2 */
export const LEVELS = ['starter', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Level = (typeof LEVELS)[number];

/** Brief parent info embedded in child response (from backend schema). */
export interface ParentBrief {
  id: string;
  phone: string;
  nickname: string | null;
}

/** Child record returned in API responses (ChildOut). */
export interface Student {
  id: string;
  name: string;
  english_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  birth_date: string | null; // ISO date string or null
  level: Level | null;
  parent_id: string;
  parent: ParentBrief | null;
  parent_phone: string | null;
  totalhours: number;
  usedhours: number;
  remaining_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Paginated list response per TECH-SPEC 5.9. */
export interface StudentListResponse {
  items: Student[];
  total: number;
  page: number;
  page_size: number;
}

/** POST /children request body (ChildCreate). */
export interface StudentCreateParams {
  name: string;
  parent_phone: string;
  english_name?: string;
  birth_date?: string; // YYYY-MM-DD
  level?: Level;
  totalhours?: number;
  usedhours?: number;
}

/** PUT /children/:id request body (ChildUpdate). */
export interface StudentUpdateParams {
  name?: string;
  english_name?: string;
  birth_date?: string;
  level?: Level;
  parent_phone?: string;
  totalhours?: number;
  usedhours?: number;
}

// ── API functions ─────────────────────────────────

/** GET /children — paginated list */
export async function getStudentList(
  page: number = 1,
  pageSize: number = 20,
): Promise<StudentListResponse> {
  const res = await client.get<StudentListResponse>('/children', {
    params: { page, page_size: pageSize },
  });
  return res.data;
}

/** POST /children — create student (auto-create parent if phone not found) */
export async function createStudent(
  params: StudentCreateParams,
): Promise<Student> {
  const res = await client.post<Student>('/children', params);
  return res.data;
}

/** PUT /children/:id — update student */
export async function updateStudent(
  id: string,
  params: StudentUpdateParams,
): Promise<Student> {
  const res = await client.put<Student>(`/children/${id}`, params);
  return res.data;
}

/** DELETE /children/:id — delete student */
export async function deleteStudent(id: string): Promise<void> {
  await client.delete(`/children/${id}`);
}
