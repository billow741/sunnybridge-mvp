/**
 * 工作台运营数据服务 — 对接后端真实 API
 */
import client from '@/api/client';

export interface AlertItem {
  id: string;
  type: 'course_pending' | 'feedback_missing' | 'low_hours' | 'settlement_pending';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  action_path: string;
}

export interface DashboardSummary {
  pending_courses: number;
  missing_feedback: number;
  low_hours_count: number;
  pending_settlement: number;
}

export async function getAlerts(): Promise<AlertItem[]> {
  const { data } = await client.get('/dashboard/alerts');
  return data || [];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await client.get('/dashboard/summary');
  return data || { pending_courses: 0, missing_feedback: 0, low_hours_count: 0, pending_settlement: 0 };
}
