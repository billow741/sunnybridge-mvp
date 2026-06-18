/**
 * Reading material management API service (API-08).
 *
 * Consumed by ADMIN-05 A-READING / A-READING-FORM.
 * All endpoints require admin role — auth handled by client.ts interceptor.
 *
 * Endpoints:
 * - GET    /reading/materials              — paginated list (level/category/is_active filter)
 * - POST   /reading/materials              — create material
 * - GET    /reading/materials/:id          — material detail
 * - PUT    /reading/materials/:id          — update material
 * - DELETE /reading/materials/:id          — delete material
 * - POST   /reading/materials/:id/upload   — upload PDF (multipart/form-data)
 */

import client from '../api/client';

// ── Constants ────────────────────────────────────

/** Level enum — L1 through L6 */
export const LEVEL_OPTIONS = [
  { value: 'L1', label: 'L1' },
  { value: 'L2', label: 'L2' },
  { value: 'L3', label: 'L3' },
  { value: 'L4', label: 'L4' },
  { value: 'L5', label: 'L5' },
  { value: 'L6', label: 'L6' },
] as const;

/** Category enum — matches backend schema regex */
export const CATEGORY_OPTIONS = [
  { value: 'picture_book', label: '绘本' },
  { value: 'short_text', label: '短文' },
  { value: 'story', label: '故事' },
  { value: 'read_aloud', label: '跟读' },
] as const;

/** Map category value → Chinese label */
export const CATEGORY_LABEL_MAP: Record<string, string> = {
  picture_book: '绘本',
  short_text: '短文',
  story: '故事',
  read_aloud: '跟读',
};

/** Placeholder pdf_url for materials created before PDF upload */
export const PENDING_UPLOAD_URL = 'pending_upload';

// ── Types ────────────────────────────────────────

export interface ReadingMaterial {
  id: string;
  title: string;
  level: string;
  category: string;
  cover_url: string | null;
  pdf_url: string | null;
  page_count: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReadingMaterialDetail extends ReadingMaterial {
  pdf_url: string | null;
  signed_pdf_url: string | null;
}

export interface PaginatedMaterials {
  items: ReadingMaterial[];
  total: number;
  page: number;
  page_size: number;
}

export interface MaterialCreateParams {
  title: string;
  level: string;
  category: string;
  cover_url?: string | null;
  pdf_url: string;
  page_count?: number;
  sort_order?: number;
  is_active?: boolean;
}

export interface MaterialUpdateParams {
  title?: string;
  level?: string;
  category?: string;
  cover_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

// ── API functions ────────────────────────────────

/** GET /reading/materials — paginated list with optional filters */
export async function getMaterialList(params?: {
  level?: string;
  category?: string;
  is_active?: boolean | null;
  page?: number;
  page_size?: number;
}): Promise<PaginatedMaterials> {
  const queryParams: Record<string, unknown> = {
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 20,
  };
  if (params?.level) queryParams.level = params.level;
  if (params?.category) queryParams.category = params.category;
  // For admin: default is no is_active filter (see all); explicitly pass if provided
  if (params?.is_active !== undefined && params?.is_active !== null) {
    queryParams.is_active = params.is_active;
  }

  const res = await client.get<PaginatedMaterials>('/reading/materials', {
    params: queryParams,
  });
  return res.data;
}

/** GET /reading/materials/:id — material detail */
export async function getMaterialDetail(id: string): Promise<ReadingMaterialDetail> {
  const res = await client.get<ReadingMaterialDetail>(`/reading/materials/${id}`);
  return res.data;
}

/** POST /reading/materials — create material */
export async function createMaterial(params: MaterialCreateParams): Promise<ReadingMaterial> {
  const res = await client.post<ReadingMaterial>('/reading/materials', params);
  return res.data;
}

/** PUT /reading/materials/:id — update material */
export async function updateMaterial(
  id: string,
  params: MaterialUpdateParams,
): Promise<ReadingMaterial> {
  const res = await client.put<ReadingMaterial>(`/reading/materials/${id}`, params);
  return res.data;
}

/** DELETE /reading/materials/:id — delete material */
export async function deleteMaterial(id: string): Promise<{ message: string; material_id: string }> {
  const res = await client.delete(`/reading/materials/${id}`);
  return res.data;
}

/** POST /reading/materials/:id/upload — upload PDF (multipart/form-data) */
export async function uploadMaterialPdf(
  id: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ReadingMaterialDetail> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await client.post<ReadingMaterialDetail>(
    `/reading/materials/${id}/upload`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
      timeout: 120_000, // PDF may be large — 2min timeout
    },
  );
  return res.data;
}
