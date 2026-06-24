import client from '@/api/client';

export interface Setting {
  key: string;
  value: string;
  category: string;
  description?: string;
  updated_at?: string;
}

export interface SettingFormData {
  key: string;
  value: string;
  category: string;
  description?: string;
}

/** 获取设置列表 */
export async function getSettings(category?: string): Promise<Setting[]> {
  const { data } = await client.get('/settings', { params: { category } });
  return data || [];
}

/** 获取单个设置 */
export async function getSetting(key: string): Promise<Setting> {
  const { data } = await client.get(`/settings/${key}`);
  return data;
}

/** 创建或更新设置 */
export async function upsertSetting(key: string, setting: Partial<Setting>): Promise<Setting> {
  const { data } = await client.put(`/settings/${key}`, setting);
  return data;
}

/** 删除设置 */
export async function deleteSetting(key: string): Promise<void> {
  await client.delete(`/settings/${key}`);
}
