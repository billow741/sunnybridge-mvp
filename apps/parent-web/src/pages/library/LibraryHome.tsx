import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Tag, Typography, Spin, Carousel, Button } from 'antd';
import { BookOutlined, StarOutlined, FireOutlined, ClockCircleOutlined, ReadOutlined, SoundOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import {
  fromReadingMaterial,
  fromResource,
  parentVisibleFilter,
  groupByLevel,
  LEVEL_LABELS,
  LEVEL_COLORS,
  READING_CATEGORY_LABELS,
  RESOURCE_CATEGORY_LABELS,
} from '../../library/adapter';
import type { ResourceItem, MaterialLevel } from '../../library/adapter';

const { Title, Text } = Typography;

function ResourceCard({ item, onClick }: { item: ResourceItem; onClick: () => void }) {
  return (
    <Card
      hoverable
      style={{ borderRadius: 12, overflow: 'hidden' }}
      bodyStyle={{ padding: 16 }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        {item.coverUrl ? (
          <img src={item.coverUrl} alt={item.title} style={{ width: 80, height: 100, objectFit: 'cover', borderRadius: 8 }} />
        ) : (
          <div style={{
            width: 80, height: 100, borderRadius: 8, background: '#f0f5ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <BookOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 6 }}>{item.title}</Text>
          <div style={{ marginBottom: 4 }}>
            {item.level && <Tag color={LEVEL_COLORS[item.level]}>{LEVEL_LABELS[item.level]}</Tag>}
            <Tag>{READING_CATEGORY_LABELS[item.category] || RESOURCE_CATEGORY_LABELS[item.category] || item.category}</Tag>
          </div>
          {item.pageCount && <Text type="secondary" style={{ fontSize: 12 }}>{item.pageCount} 页</Text>}
        </div>
      </div>
    </Card>
  );
}

function SectionTitle({ icon, title, extra }: { icon: React.ReactNode; title: string; extra?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <Title level={5} style={{ margin: 0 }}>{title}</Title>
      {extra}
    </div>
  );
}

export default function ParentLibraryHome() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [mRes, rRes] = await Promise.all([
          apiClient.get('/reading/materials', { params: { page_size: 999, is_active: true } }),
          apiClient.get('/resources', { params: { page_size: 999, is_active: true } }),
        ]);
        setMaterials(mRes.data?.items || mRes.data || []);
        setResources(rRes.data?.items || rRes.data || []);
        // Try fetching reading progress
        try {
          const pRes = await apiClient.get('/reading/progress/my');
          setProgress(pRes.data?.items || pRes.data || []);
        } catch { /* progress is nice-to-have */ }
      } catch (e) {
        console.error('Failed to load library', e);
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
  const visibleItems = parentVisibleFilter(allItems);
  const byLevel = groupByLevel(visibleItems);
  // reading items available under library='reading'
  const featuredItems = visibleItems.filter(i => i.isFeatured);
  const newItems = [...visibleItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);

  // Recent progress: materials with progress
  const recentProgress = progress.slice(0, 5);

  const goToDetail = (item: ResourceItem) => {
    if (item.source === 'reading') navigate(`/reading/${item.id}`);
    else navigate(`/resources/${item.id}`);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* ── 今日推荐/精选 ── */}
      {featuredItems.length > 0 && (
        <>
          <SectionTitle icon={<StarOutlined style={{ color: '#722ed1' }} />} title="今日推荐" extra={<Button type="link" size="small" onClick={() => navigate('/reading')}>查看全部</Button>} />
          <Carousel autoplay dots style={{ marginBottom: 16 }}>
            {featuredItems.slice(0, 5).map(item => (
              <div key={item.id}>
                <Card style={{ margin: '0 8px', borderRadius: 12, cursor: 'pointer' }} onClick={() => goToDetail(item)}>
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <BookOutlined style={{ fontSize: 40, color: '#722ed1', marginBottom: 8 }} />
                    <Title level={4}>{item.title}</Title>
                    <div>
                      {item.level && <Tag color={LEVEL_COLORS[item.level]}>{LEVEL_LABELS[item.level]}</Tag>}
                      <Tag>{READING_CATEGORY_LABELS[item.category] || item.category}</Tag>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </Carousel>
        </>
      )}

      {/* ── 最近阅读 ── */}
      {recentProgress.length > 0 && (
        <>
          <SectionTitle icon={<ClockCircleOutlined style={{ color: '#fa8c16' }} />} title="继续阅读" extra={<Button type="link" size="small" onClick={() => navigate('/my-reading')}>我的阅读</Button>} />
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            {recentProgress.map((p: any) => {
              const mat = materials.find((m: any) => m.id === p.material_id);
              return mat ? (
                <Col span={12} key={p.id}>
                  <Card size="small" hoverable onClick={() => navigate(`/reading/${mat.id}`)}>
                    <Text strong>{p.title || mat.title}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>第 {p.current_page}/{p.page_count || '?'} 页</Text>
                    {p.completed && <Tag color="green" style={{ marginLeft: 8 }}>已完成</Tag>}
                  </Card>
                </Col>
              ) : null;
            })}
          </Row>
        </>
      )}

      {/* ── 按 Level 浏览 ── */}
      <SectionTitle icon={<BookOutlined style={{ color: '#1890ff' }} />} title="按级别浏览" />
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        {(['L1','L2','L3','L4','L5','L6'] as MaterialLevel[]).map(lv => (
          <Col key={lv}>
            <Button
              size="large"
              style={{ borderColor: LEVEL_COLORS[lv], color: LEVEL_COLORS[lv], borderRadius: 20, fontWeight: 600 }}
              onClick={() => navigate(`/reading?level=${lv}`)}
            >
              {LEVEL_LABELS[lv]}
              <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>({(byLevel[lv] || []).length})</span>
            </Button>
          </Col>
        ))}
      </Row>

      {/* ── 新上架 ── */}
      <SectionTitle icon={<FireOutlined style={{ color: '#f5222d' }} />} title="新上架" extra={<Button type="link" size="small" onClick={() => navigate('/reading')}>更多</Button>} />
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {newItems.slice(0, 6).map(item => (
          <Col span={12} key={item.id}>
            <ResourceCard item={item} onClick={() => goToDetail(item)} />
          </Col>
        ))}
      </Row>

      {/* ── 快捷入口 ── */}
      <SectionTitle icon={<SoundOutlined style={{ color: '#52c41a' }} />} title="快捷入口" />
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card hoverable style={{ textAlign: 'center', borderRadius: 12 }} bodyStyle={{ padding: 20 }} onClick={() => navigate('/reading?category=phonics')}>
            <SoundOutlined style={{ fontSize: 28, color: '#52c41a' }} />
            <div style={{ marginTop: 8 }}><Text strong>Phonics</Text></div>
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable style={{ textAlign: 'center', borderRadius: 12 }} bodyStyle={{ padding: 20 }} onClick={() => navigate('/reading?category=word_card')}>
            <BookOutlined style={{ fontSize: 28, color: '#fa8c16' }} />
            <div style={{ marginTop: 8 }}><Text strong>词卡</Text></div>
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable style={{ textAlign: 'center', borderRadius: 12 }} bodyStyle={{ padding: 20 }} onClick={() => navigate('/resources')}>
            <ReadOutlined style={{ fontSize: 28, color: '#1890ff' }} />
            <div style={{ marginTop: 8 }}><Text strong>推荐资源</Text></div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
