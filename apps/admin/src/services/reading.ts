/**
 * 阅读材料 API service — 更新版
 * 
 * 变更:
 * - 类型加 metadata JSONB 字段
 * - createParams 允许草稿态 (level/category/pdf_url 可选)
 * - 新增 uploadMaterialCover 封面上传
 * - downloadUrl 返回下载端点
 */

import client from '../api/client';
import type { ResourceMetadata } from '../constants/resource';

// ── Types ────────────────────────────────────────

export interface ReadingMaterial {
  id: string;
  title: string;
  level: string | null;
  category: string | null;
  cover_url: string | null;
  pdf_url: string | null;
  page_count: number;
  sort_order: number;
  is_active: boolean;
  metadata: ResourceMetadata | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingMaterialDetail extends ReadingMaterial {
  signed_pdf_url: string | null;
}

export interface PaginatedMaterials {
  items: ReadingMaterial[];
  total: number;
  page: number;
  page_size: number;
}

/** 草稿态: 只有 title 必填 */
export interface MaterialCreateParams {
  title: string;
  level?: string | null;
  category?: string | null;
  cover_url?: string | null;
  pdf_url?: string | null;
  page_count?: number;
  sort_order?: number;
  is_active?: boolean;
  metadata?: ResourceMetadata;
}

export interface MaterialUpdateParams {
  title?: string;
  level?: string | null;
  category?: string | null;
  cover_url?: string | null;
  pdf_url?: string | null;
  page_count?: number;
  sort_order?: number;
  is_active?: boolean;
  metadata?: ResourceMetadata;
}

// ── API functions ────────────────────────────────

/** GET /reading/materials — 分页列表 */
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
  if (params?.is_active !== undefined && params?.is_active !== null) {
    queryParams.is_active = params.is_active;
  }
  const res = await client.get<PaginatedMaterials>('/reading/materials', { params: queryParams });
  return res.data;
}

/** GET /reading/materials/:id — 详情 */
export async function getMaterialDetail(id: string): Promise<ReadingMaterialDetail> {
  const res = await client.get<ReadingMaterialDetail>(`/reading/materials/${id}`);
  return res.data;
}

/** POST /reading/materials — 创建 (草稿态) */
export async function createMaterial(params: MaterialCreateParams): Promise<ReadingMaterial> {
  const res = await client.post<ReadingMaterial>('/reading/materials', params);
  return res.data;
}

/** PUT /reading/materials/:id — 更新 */
export async function updateMaterial(id: string, params: MaterialUpdateParams): Promise<ReadingMaterial> {
  const res = await client.put<ReadingMaterial>(`/reading/materials/${id}`, params);
  return res.data;
}

/** DELETE /reading/materials/:id */
export async function deleteMaterial(id: string): Promise<{ message: string; material_id: string }> {
  const res = await client.delete(`/reading/materials/${id}`);
  return res.data;
}

/** POST /reading/materials/:id/upload — 上传 PDF */
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
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      },
      timeout: 120_000,
    },
  );
  return res.data;
}

/** POST /reading/materials/:id/cover — 上传封面 */
export async function uploadMaterialCover(
  id: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ReadingMaterialDetail> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await client.post<ReadingMaterialDetail>(
    `/reading/materials/${id}/cover`,
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
export function getReadingDownloadUrl(id: string): string {
  return `/api/v1/reading/materials/${id}/download`;
}
