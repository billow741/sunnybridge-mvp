import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Tag, Typography, Spin, Empty, List, Button, Progress } from 'antd';
import { BookOutlined, CheckCircleOutlined, ClockCircleOutlined, ReadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';

const { Title, Text } = Typography;

interface ProgressItem {
  id: string;
  material_id: string;
  child_id: string;
  current_page: number;
  completed: boolean;
  last_read_at: string;
  title?: string;
  level?: string;
  category?: string;
  cover_url?: string;
  page_count?: number;
}

export default function MyReading() {
  const [progressList, setProgressList] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/reading/progress/my');
        const data = res.data?.items || res.data || [];
        setProgressList(data);
      } catch (e) {
        console.error('Failed to load progress', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const readingItems = progressList.filter(p => !p.completed);
  const completedItems = progressList.filter(p => p.completed);

  if (loading) return <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>;

  const renderProgressCard = (p: ProgressItem) => {
    const percent = p.page_count ? Math.round((p.current_page / p.page_count) * 100) : 0;
    return (
      <Card
        hoverable
        style={{ borderRadius: 12, marginBottom: 12 }}
        bodyStyle={{ padding: 16 }}
        onClick={() => navigate(`/reading/${p.material_id}`)}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          {p.cover_url ? (
            <img src={p.cover_url} alt="" style={{ width: 56, height: 70, objectFit: 'cover', borderRadius: 8 }} />
          ) : (
            <div style={{
              width: 56, height: 70, borderRadius: 8, background: '#f0f5ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <BookOutlined style={{ fontSize: 22, color: '#1890ff' }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 14 }}>{p.title || p.material_id}</Text>
            <div style={{ marginTop: 4, marginBottom: 4 }}>
              {p.level && <Tag color="blue" style={{ marginRight: 4 }}>{p.level}</Tag>}
              {p.category && <Tag>{p.category}</Tag>}
            </div>
            <Progress percent={percent} size="small" status={p.completed ? 'success' : 'active'} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {p.current_page}/{p.page_count || '?'} 页 · {new Date(p.last_read_at).toLocaleDateString('zh-CN')}
            </Text>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 20 }}>📖 我的阅读</Title>

      {/* 正在读 */}
      <Card title={<><ClockCircleOutlined /> 正在读</>} style={{ marginBottom: 20, borderRadius: 12 }}>
        {readingItems.length === 0 ? (
          <Empty description="还没有开始阅读" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" onClick={() => navigate('/library')}>去资源馆看看</Button>
          </Empty>
        ) : (
          readingItems.map(p => <div key={p.id}>{renderProgressCard(p)}</div>)
        )}
      </Card>

      {/* 已完成 */}
      <Card title={<><CheckCircleOutlined /> 已完成</>} style={{ borderRadius: 12 }}>
        {completedItems.length === 0 ? (
          <Empty description="还没有完成的阅读" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          completedItems.map(p => <div key={p.id}>{renderProgressCard(p)}</div>)
        )}
      </Card>
    </div>
  );
}
