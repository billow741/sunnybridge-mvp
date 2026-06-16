import { Card, Typography, Progress, Tag } from 'antd';
import type { ProgressOut } from '../types';
import { categoryLabels, levelLabels } from '../utils/labels';

export default function ReadingProgressCard({ progress }: { progress: ProgressOut }) {
  const pct = progress.page_count ? Math.round((progress.current_page / progress.page_count) * 100) : 0;

  return (
    <Card style={{ borderRadius: 12 }}>
      <Typography.Text strong style={{ fontSize: 15 }}>{progress.title || '未知材料'}</Typography.Text>
      <div style={{ margin: '8px 0' }}>
        {progress.level && <Tag color="blue" style={{ marginRight: 4 }}>{levelLabels[progress.level]}</Tag>}
        {progress.category && <Tag>{categoryLabels[progress.category]}</Tag>}
      </div>
      <Progress percent={pct} size="small" status={progress.completed ? 'success' : 'active'} />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {progress.current_page} / {progress.page_count || '?'} 页
      </Typography.Text>
    </Card>
  );
}
