import { Card, Typography, Tag } from 'antd';
import type { ChildOut } from '../types';
import { levelLabels } from '../utils/labels';

export default function ChildCard({ child }: { child: ChildOut }) {
  return (
    <Card style={{ borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #54C5F8, #FFA726)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: '#fff', fontWeight: 600, flexShrink: 0,
        }}>
          {(child.name || '?')[0]}
        </div>
        <div>
          <Typography.Text strong style={{ fontSize: 17 }}>{child.name}</Typography.Text>
          {child.english_name && <Typography.Text type="secondary" style={{ marginLeft: 8 }}>{child.english_name}</Typography.Text>}
          <div style={{ marginTop: 4 }}>
            {child.level && <Tag color="blue">{levelLabels[child.level] || child.level}</Tag>}
          </div>
        </div>
      </div>
    </Card>
  );
}
