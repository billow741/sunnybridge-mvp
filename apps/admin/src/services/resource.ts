/**
 * Resource management API service (API-09).
 *
 * Consumed by ADMIN-06 A-RESOURCE / A-RESOURCE-FORM.
 * All admin-write endpoints require admin role — auth handled by client.ts interceptor.
 *
 * Endpoints:
 * - GET    /resources              — paginated list (category/is_active filter)
 * - POST   /resources              — create resource
 * - GET    /resources/:id          — resource detail
 * - PUT    /resources/:id          — update resource
 * - DELETE /resources/:id          — delete resource
 * - POST   /resources/:id/upload   — upload PDF (multipart/form-data)
 */

import client from '../api/client';

// ── Constants ────────────────────────────────────

/** Category enum — matches backend schema regex: phonics | word_card | recommended */
export const RESOURCE_CATEGORY_OPTIONS = [
  { value: 'phonics', label: '自然拼读' },
  { value: 'word_card', label: '单词卡' },
  { value: 'recommended', label: '推荐' },
] as const;

/** Map category value → Chinese label */
export const RESOURCE_CATEGORY_LABEL_MAP: Record<string, string> = {
  phonics: '自然拼读',
  word_card: '单词卡',
  recommended: '推荐',
};

/** Placeholder pdf_url for resources created before PDF upload */
export const PENDING_UPLOAD_URL = 'pending_upload';

// ── Types ────────────────────────────────────────

export interface Resource {
  id: string;
  title: string;
  category: string;
  pdf_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceDetail extends Resource {
  signed_pdf_url: string | null;
}

export interface PaginatedResources {
  items: Resource[];
  total: number;
  page: number;
  page_size: number;
}

export interface ResourceCreateParams {
  title: string;
  category: string;
  pdf_url: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ResourceUpdateParams {
  title?: string;
  category?: string;
  sort_order?: number;
  is_active?: boolean;
}

// ── API functions ────────────────────────────────

/** GET /resources — paginated list with optional filters */
export async function getResourceList(params?: {
  category?: string;
  is_active?: boolean | null;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResources> {
  const queryParams: Record<string, unknown> = {
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 20,
  };
  if (params?.category) queryParams.category = params.category;
  if (params?.is_active !== undefined && params?.is_active !== null) {
    queryParams.is_active = params.is_active;
  }

  const res = await client.get<PaginatedResources>('/resources', {
    params: queryParams,
  });
  return res.data;
}

/** GET /resources/:id — resource detail */
export async function getResourceDetail(id: string): Promise<ResourceDetail> {
  const res = await client.get<ResourceDetail>(`/resources/${id}`);
  return res.data;
}

/** POST /resources — create resource */
export async function createResource(params: ResourceCreateParams): Promise<Resource> {
  const res = await client.post<Resource>('/resources', params);
  return res.data;
}

/** PUT /resources/:id — update resource */
export async function updateResource(
  id: string,
  params: ResourceUpdateParams,
): Promise<Resource> {
  const res = await client.put<Resource>(`/resources/${id}`, params);
  return res.data;
}

/** DELETE /resources/:id — delete resource */
export async function deleteResource(id: string): Promise<{ message: string; resource_id: string }> {
  const res = await client.delete(`/resources/${id}`);
  return res.data;
}

/** POST /resources/:id/upload — upload PDF (multipart/form-data) */
export async function uploadResourcePdf(
  id: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ResourceDetail> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await client.post<ResourceDetail>(
    `/resources/${id}/upload`,
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