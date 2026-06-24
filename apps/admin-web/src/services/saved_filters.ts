import client from '@/api/client';
import { extractError } from '@/api/client';

export interface SavedFilter {
  id: number;
  name: string;
  page: string;
  filters: Record<string, any>;
  is_default: boolean;
  created_by?: string;
  created_at?: string;
}

export interface SavedFilterCreate {
  name: string;
  page: string;
  filters: Record<string, any>;
  is_default?: boolean;
}

export interface SavedFilterUpdate {
  name?: string;
  filters?: Record<string, any>;
  is_default?: boolean;
}

/** 获取已保存筛选列表 */
export async function getSavedFilters(page?: string): Promise<SavedFilter[]> {
  const { data } = await client.get('/saved-filters', { params: { page } });
  return data || [];
}

/** 创建筛选模板 */
export async function createSavedFilter(payload: SavedFilterCreate): Promise<SavedFilter> {
  const { data } = await client.post('/saved-filters', payload);
  return data;
}

/** 更新筛选模板 */
export async function updateSavedFilter(id: number, payload: SavedFilterUpdate): Promise<SavedFilter> {
  const { data } = await client.put(`/saved-filters/${id}`, payload);
  return data;
}

/** 删除筛选模板 */
export async function deleteSavedFilter(id: number): Promise<void> {
  await client.delete(`/saved-filters/${id}`);
}
