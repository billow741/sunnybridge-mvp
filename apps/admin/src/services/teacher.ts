/**
 * Teacher management API service (API-04).
 *
 * Consumed by ADMIN-02 A-TEACHERS / A-TEACHER-FORM.
 * All endpoints require admin role — auth handled by client.ts interceptor.
 *
 * Endpoints:
 * - GET    /teachers                — paginated list
 * - POST   /teachers                — create (returns initial_password)
 * - PUT    /teachers/:id            — update
 * - DELETE /teachers/:id            — soft delete (is_active=false)
 * - PUT    /teachers/:id/reset-password — reset password
 */

import client from '../api/client';

// ── Types ─────────────────────────────────────────

export interface Teacher {
  id: string;
  username: string;
  phone: string | null;
  name: string;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  hourly_rate: number | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeacherCreateResponse extends Teacher {
  initial_password: string;
}

export interface TeacherListResponse {
  items: Teacher[];
  total: number;
  page: number;
  page_size: number;
}

export interface TeacherDeleteResponse {
  id: string;
  is_active: boolean;
}

export interface TeacherRestoreResponse {
  id: string;
  is_active: boolean;
  new_initial_password: string;
  must_change_password: boolean;
}

export interface TeacherResetPasswordResponse {
  id: string;
  new_initial_password: string;
  must_change_password: boolean;
}

export interface TeacherCreateParams {
  username: string;
  phone?: string;
  name: string;
  hourly_rate?: number;
}

export interface TeacherUpdateParams {
  username?: string;
  phone?: string;
  name?: string;
  hourly_rate?: number;
}

// ── API functions ─────────────────────────────────

/** GET /teachers — paginated list */
export async function getTeacherList(
  page: number = 1,
  pageSize: number = 20,
): Promise<TeacherListResponse> {
  const res = await client.get<TeacherListResponse>('/teachers', {
    params: { page, page_size: pageSize },
  });
  return res.data;
}

/** POST /teachers — create teacher (auto-generates initial password) */
export async function createTeacher(
  params: TeacherCreateParams,
): Promise<TeacherCreateResponse> {
  const res = await client.post<TeacherCreateResponse>('/teachers', params);
  return res.data;
}

/** PUT /teachers/:id — update teacher */
export async function updateTeacher(
  id: string,
  params: TeacherUpdateParams,
): Promise<Teacher> {
  const res = await client.put<Teacher>(`/teachers/${id}`, params);
  return res.data;
}

/** DELETE /teachers/:id — soft delete (is_active=false) */
export async function deleteTeacher(
  id: string,
): Promise<TeacherDeleteResponse> {
  const res = await client.delete<TeacherDeleteResponse>(`/teachers/${id}`);
  return res.data;
}

/** PUT /teachers/:id/restore — restore a soft-deleted teacher (is_active=true) */
export async function restoreTeacher(
  id: string,
): Promise<TeacherRestoreResponse> {
  const res = await client.put<TeacherRestoreResponse>(`/teachers/${id}/restore`);
  return res.data;
}

/** PUT /teachers/:id/reset-password — reset to new auto-generated password */
export async function resetTeacherPassword(
  id: string,
): Promise<TeacherResetPasswordResponse> {
  const res = await client.put<TeacherResetPasswordResponse>(
    `/teachers/${id}/reset-password`,
  );
  return res.data;
}
