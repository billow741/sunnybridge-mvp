import { Tag } from 'antd';

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'blue', label: '待上课' },
  completed: { color: 'green', label: '已完成' },
  cancelled: { color: 'default', label: '已取消' },
};

export default function CourseStatusTag({ status }: { status: string }) {
  const cfg = statusConfig[status] || { color: 'default', label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}
