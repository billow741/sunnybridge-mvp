import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Tag, Typography, Spin, Button } from 'antd';
import { BookOutlined, SoundOutlined, ReadOutlined, AppstoreOutlined, CalendarOutlined, StarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import {
  fromReadingMaterial,
  fromResource,
  teacherVisibleFilter,
  LEVEL_LABELS,
  LEVEL_COLORS,
  READING_CATEGORY_LABELS,
  RESOURCE_CATEGORY_LABELS,
} from '../library/adapter';
import type { ResourceItem, MaterialLevel } from '../library/adapter';

const { Title, Text } = Typography;

function QuickEntry({ icon, title, color, onClick }: { icon: React.ReactNode; title: string; color: string; onClick: () => void }) {
  return (
    <Card hoverable style={{ textAlign: 'center', borderRadius: 12 }} bodyStyle={{ padding: 20 }} onClick={onClick}>
      <div style={{ fontSize: 32, color, marginBottom: 8 }}>{icon}</div>
      <Text strong>{title}</Text>
    </Card>
  );
}

function ResourceRow({ title, icon, items, onViewAll, onItemClick }: {
  title: string; icon: React.ReactNode; items: ResourceItem[];
  onViewAll: () => void; onItemClick: (item: ResourceItem) => void;
}) {
  return (
    <Card title={<>{icon} {title}</>} style={{ marginBottom: 16, borderRadius: 12 }}
      extra={<Button type="link" size="small" onClick={onViewAll}>查看全部</Button>}
    >
      <Row gutter={[12, 12]}>
        {items.slice(0, 6).map(item => (
          <Col span={8} key={item.id}>
            <Card size="small" hoverable style={{ borderRadius: 8 }} onClick={() => onItemClick(item)}>
              <Text strong ellipsis style={{ display: 'block', marginBottom: 4 }}>{item.title}</Text>
              <div>
                {item.level && <Tag color={LEVEL_COLORS[item.level]} style={{ marginRight: 4 }}>{LEVEL_LABELS[item.level]}</Tag>}
                <Tag>{READING_CATEGORY_LABELS[item.category] || RESOURCE_CATEGORY_LABELS[item.category] || item.category}</Tag>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
}

export default function TeacherResourceHome() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [mRes, rRes] = await Promise.all([
          apiClient.get('/reading/materials', { params: { page_size: 999, is_active: true } }),
          apiClient.get('/resources', { params: { page_size: 999, is_active: true } }),
        ]);
        setMaterials(mRes.data?.items || mRes.data || []);
        setResources(rRes.data?.items || rRes.data || []);
      } catch (e) {
        console.error('Failed to load', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const allItems: ResourceItem[] = [
    ...materials.map(fromReadingMaterial),
    ...resources.map(fromResource),
  ];
  const visibleItems = teacherVisibleFilter(allItems);
  const phonicsItems = visibleItems.filter(i => i.category === 'phonics');
  const wordCardItems = visibleItems.filter(i => i.category === 'word_card');
  const recentItems = [...visibleItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
  const featuredItems = visibleItems.filter(i => i.isFeatured);

  const goDetail = (item: ResourceItem) => {
    if (item.source === 'reading') navigate(`/reading/${item.id}`);
    else navigate(`/resources/${item.id}`);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Title level={4}>🎓 教学资源库</Title>

      {/* 快捷入口 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <QuickEntry icon={<SoundOutlined />} title="Phonics" color="#52c41a" onClick={() => navigate('/reading?category=phonics')} />
        </Col>
        <Col span={6}>
          <QuickEntry icon={<AppstoreOutlined />} title="词卡" color="#fa8c16" onClick={() => navigate('/reading?category=word_card')} />
        </Col>
        <Col span={6}>
          <QuickEntry icon={<ReadOutlined />} title="教案" color="#1890ff" onClick={() => navigate('/resources')} />
        </Col>
        <Col span={6}>
          <QuickEntry icon={<CalendarOutlined />} title="课堂活动" color="#722ed1" onClick={() => navigate('/resources')} />
        </Col>
      </Row>

      {/* 今日推荐 */}
      {featuredItems.length > 0 && (
        <ResourceRow title="今日推荐" icon={<StarOutlined style={{ color: '#722ed1' }} />} items={featuredItems} onViewAll={() => navigate('/resources')} onItemClick={goDetail} />
      )}

      {/* Phonics */}
      <ResourceRow title="Phonics" icon={<SoundOutlined style={{ color: '#52c41a' }} />} items={phonicsItems} onViewAll={() => navigate('/reading?category=phonics')} onItemClick={goDetail} />

      {/* 词卡 */}
      <ResourceRow title="词卡" icon={<AppstoreOutlined style={{ color: '#fa8c16' }} />} items={wordCardItems} onViewAll={() => navigate('/reading?category=word_card')} onItemClick={goDetail} />

      {/* 新上架 */}
      <ResourceRow title="新上架" icon={<BookOutlined style={{ color: '#1890ff' }} />} items={recentItems} onViewAll={() => navigate('/reading')} onItemClick={goDetail} />
    </div>
  );
}
