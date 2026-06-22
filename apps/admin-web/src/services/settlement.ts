/**
 * 教师结算服务 — 真实 API 接口
 *
 * 后端: POST /api/v1/settlements/calc-hours (自动统计课时)
 *       GET  /api/v1/settlements
 *       GET  /api/v1/settlements/summary
 *       POST /api/v1/settlements
 *       PUT  /api/v1/settlements/{id}/pay
 */

import client, { extractError } from '@/api/client';

// ── 类型 ──────────────────────────────
export interface SettlementItem {
  id: string;
  teacher_id: string;
  teacher_name: string;
  period_start: string;
  period_end: string;
  hours: number;
  hourly_rate: number;
  amount: number;
  status: 'pending' | 'paid';
  paid_at?: string;
  note?: string;
  created_at?: string;
}

export interface SettlementSummary {
  total_pending: number;
  total_paid: number;
  total_amount: number;
  teacher_count: number;
}

export interface HoursCalcResult {
  teacher_id: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  course_count: number;
  courses: { id: string; date: string; hours: number; start_time: string; end_time: string }[];
}

// ── API ──────────────────────────────

/** 按教师 + 时间段自动统计课时 */
export async function calcSettlementHours(
  teacherId: string,
  periodStart: string,
  periodEnd: string,
): Promise<HoursCalcResult> {
  const { data } = await client.post('/settlements/calc-hours', {
    teacher_id: teacherId,
    period_start: periodStart,
    period_end: periodEnd,
  });
  return data;
}

/** 获取结算列表 */
export async function getSettlementList(): Promise<SettlementItem[]> {
  const { data } = await client.get('/settlements');
  return data.items || [];
}

/** 获取结算汇总 */
export async function getSettlementSummary(): Promise<SettlementSummary> {
  const { data } = await client.get('/settlements/summary');
  return data;
}

/** 新建结算 */
export async function createSettlement(values: {
  teacher_id: string;
  period_start: string;
  period_end: string;
  hours: number;
  hourly_rate: number;
  note?: string;
}): Promise<SettlementItem> {
  const { data } = await client.post('/settlements', values);
  return data;
}

/** 标记已付款 */
export async function paySettlement(id: string): Promise<SettlementItem> {
  const { data } = await client.put(`/settlements/${id}/pay`);
  return data;
}
