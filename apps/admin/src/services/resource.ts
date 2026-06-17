/**
 * 通用资源 API service — 更新版
 * 
 * 变更:
 * - 类型加 metadata JSONB 字段
 * - createParams 允许草稿态 (category/pdf_url 可选)
 * - 新增 uploadResourceCover 封面上传 (存 metadata.cover_url)
 * - updateParams 加 pdf_url / metadata
 */

import client from '../api/client';
import type { ResourceMetadata } from '../constants/resource';

// ── Types ────────────────────────────────────────

export interface Resource {
  id: string;
  title: string;
  category: string | null;
  pdf_url: string | null;
  sort_order: number;
  is_active: boolean;
  metadata: ResourceMetadata | null;
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

/** 草稿态: 只有 title 必填 */
export interface ResourceCreateParams {
  title: string;
  category?: string | null;
  pdf_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
  metadata?: ResourceMetadata;
}

export interface ResourceUpdateParams {
  title?: string;
  category?: string | null;
  pdf_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
  metadata?: ResourceMetadata;
}

// ── API functions ────────────────────────────────

/** GET /resources — 分页列表 */
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
  const res = await client.get<PaginatedResources>('/resources', { params: queryParams });
  return res.data;
}

/** GET /resources/:id — 详情 */
export async function getResourceDetail(id: string): Promise<ResourceDetail> {
  const res = await client.get<ResourceDetail>(`/resources/${id}`);
  return res.data;
}

/** POST /resources — 创建 (草稿态) */
export async function createResource(params: ResourceCreateParams): Promise<Resource> {
  const res = await client.post<Resource>('/resources', params);
  return res.data;
}

/** PUT /resources/:id — 更新 */
export async function updateResource(id: string, params: ResourceUpdateParams): Promise<Resource> {
  const res = await client.put<Resource>(`/resources/${id}`, params);
  return res.data;
}

/** DELETE /resources/:id */
export async function deleteResource(id: string): Promise<{ message: string; resource_id: string }> {
  const res = await client.delete(`/resources/${id}`);
  return res.data;
}

/** POST /resources/:id/upload — 上传 PDF */
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
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      },
      timeout: 120_000,
    },
  );
  return res.data;
}

/** POST /resources/:id/cover — 上传封面 (存 metadata.cover_url) */
export async function uploadResourceCover(
  id: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ResourceDetail> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await client.post<ResourceDetail>(
    `/resources/${id}/cover`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      },
      timeout: 60_000,
    },
  );
  return res.data;
}

/** 下载 URL */
export function getResourceDownloadUrl(id: string): string {
  return `/api/v1/resources/${id}/download`;
}
