/**
 * 工作台运营数据服务
 * 当前为 Mock API，等后端运营数据接口完成后可替换为真实接口
 */

export interface AlertItem {
  id: string;
  type: 'course_pending' | 'feedback_missing' | 'low_hours' | 'settlement_pending';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  action_path?: string;
}

export interface DashboardSummary {
  pending_courses: number;
  missing_feedback: number;
  low_hours_count: number;
  pending_settlement: number;
}

// ─────────── Mock API ───────────
export async function getAlerts(): Promise<AlertItem[]> {
  await mockDelay(400);
  return [
    { id: 'a1', type: 'course_pending', title: '今日待确认课程', description: '有 3 节课程需确认完成', severity: 'high', action_path: '/courses' },
    { id: 'a2', type: 'feedback_missing', title: '待了结反馈', description: '有 2 节历史课程未填写反馈', severity: 'medium', action_path: '/courses' },
    { id: 'a3', type: 'low_hours', title: '低课时学员', description: '3 名学员剩余课时不足 5 小时', severity: 'medium', action_path: '/students' },
    { id: 'a4', type: 'settlement_pending', title: '教师结算待处理', description: '2 位教师有待结算记录', severity: 'low', action_path: '/finance/settlements' },
  ];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  await mockDelay(300);
  return { pending_courses: 3, missing_feedback: 2, low_hours_count: 3, pending_settlement: 2 };
}

function mockDelay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}
