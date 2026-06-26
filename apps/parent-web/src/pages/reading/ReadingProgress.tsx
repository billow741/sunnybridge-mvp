import { useState, useEffect } from 'react';
import {
  Card,
  Tag,
  Spin,
  Typography,
  Empty,
  List,
  Divider,
} from 'antd';
import dayjs from 'dayjs';
import client from '@/api/client';
import { useAuthStore } from '@/store/authStore';

const { Title } = Typography;

interface ProgressItem {
  material_id: string;
  material_name: string;
  completed_at?: string;
  status: string; // 'in_progress' | 'completed'
}

export default function ReadingProgress() {
  const { user } = useAuthStore();
  const childId = user?.childId || user?.child_id;

  const [loading, setLoading] = useState(false);
  const [inProgress, setInProgress] = useState<ProgressItem[]>([]);
  const [completed, setCompleted] = useState<ProgressItem[]>([]);

  const fetchProgress = async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const res = await client.get('/reading/progress', {
        params: { child_id: String(childId) },
      });
      const items: ProgressItem[] = res.data?.items || [];
      setInProgress(items.filter((item) => item.status === 'in_progress'));
      setCompleted(items.filter((item) => item.status === 'completed'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [childId]);

  const renderItem = (item: ProgressItem) => (
    <List.Item
      style={{
        padding: '12px 0',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{item.material_name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {item.completed_at && (
            <span style={{ color: '#999', fontSize: 13 }}>
              {dayjs(item.completed_at).format('YYYY-MM-DD')}
            </span>
          )}
          <Tag color={item.status === 'completed' ? 'success' : 'processing'}>
            {item.status === 'completed' ? '已完成' : '进行中'}
          </Tag>
        </div>
      </div>
    </List.Item>
  );

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        阅读进度
      </Title>

      <Spin spinning={loading}>
        {/* 进行中 */}
        <Card
          title="进行中"
          bordered={false}
          style={{ marginBottom: 24, backgroundColor: '#fafafa' }}
        >
          {inProgress.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无进行中的阅读" />
          ) : (
            <List dataSource={inProgress} renderItem={renderItem} />
          )}
        </Card>

        {/* 已完成 */}
        <Card
          title="已完成"
          bordered={false}
          style={{ backgroundColor: '#fafafa' }}
        >
          {completed.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无已完成的阅读" />
          ) : (
            <List dataSource={completed} renderItem={renderItem} />
          )}
        </Card>
      </Spin>
    </div>
  );
}
