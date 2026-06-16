import { Empty } from 'antd';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ title = '暂无数据', description }: EmptyStateProps) {
  return <Empty description={description || title} />;
}