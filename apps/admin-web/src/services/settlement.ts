/**
 * 教师结算服务
 * 当前为 Mock API，等后端结算模块完成后可替换为真实接口
 */

// ─────────── Type Definitions ───────────
export interface SettlementTeacher {
  id: string;
  name: string;
}

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
}

export interface SettlementSummary {
  total_pending: number;
  total_paid: number;
  total_amount: number;
  teacher_count: number;
}

export interface MockSettlementData {
  items: SettlementItem[];
  summary: SettlementSummary;
}

// ─────────── Mock Data ───────────
const mockSettlements: SettlementItem[] = [
  {
    id: 'set-1', teacher_id: 't-1', teacher_name: 'Ms. Sarah', period_start: '2025-06-01', period_end: '2025-06-15',
    hours: 12, hourly_rate: 500, amount: 6000, status: 'pending', note: '半月结算'
  },
  {
    id: 'set-2', teacher_id: 't-2', teacher_name: 'Mr. James', period_start: '2025-06-01', period_end: '2025-06-15',
    hours: 8, hourly_rate: 450, amount: 3600, status: 'pending', note: '半月结算'
  },
];

// ─────────── Mock API ───────────
export async function getSettlementList(teacherId?: string): Promise<SettlementItem[]> {
  await mockDelay(400);
  if (teacherId) return mockSettlements.filter(s => s.teacher_id === teacherId);
  return [...mockSettlements];
}

export async function getSettlementSummary(): Promise<SettlementSummary> {
  await mockDelay(300);
  const pending = mockSettlements.filter(s => s.status === 'pending');
  const paid = mockSettlements.filter(s => s.status === 'paid');
  return {
    total_pending: pending.reduce((s, i) => s + i.amount, 0),
    total_paid: paid.reduce((s, i) => s + i.amount, 0),
    total_amount: mockSettlements.reduce((s, i) => s + i.amount, 0),
    teacher_count: new Set(mockSettlements.map(s => s.teacher_id)).size,
  };
}

export async function createSettlement(item: Omit<SettlementItem, 'id'>): Promise<SettlementItem> {
  await mockDelay(500);
  const newItem: SettlementItem = { ...item, id: `set-${Date.now()}` };
  mockSettlements.push(newItem);
  return newItem;
}

export async function paySettlement(id: string): Promise<SettlementItem> {
  await mockDelay(300);
  const item = mockSettlements.find(s => s.id === id);
  if (!item) throw new Error('记录不存在');
  item.status = 'paid';
  item.paid_at = new Date().toISOString().split('T')[0];
  return { ...item };
}

function mockDelay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}
