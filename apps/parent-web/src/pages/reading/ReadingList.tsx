import { useState, useEffect } from 'react';
import { Card, Select, Row, Col, Tag, Typography, Space, Tabs } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import ReadingProgressCard from '../../components/ReadingProgressCard';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import apiClient from '../../api/client';
import type { MaterialOut as MaterialOut, ProgressOut, PaginatedResponse } from '../../types';
import { categoryLabels, levelLabels } from '../../utils/labels';

const levelOptions = [{ value: '', label: '全部级别' }, ...Object.entries(levelLabels).map(([v, l]) => ({ value: v, label: l }))];
const categoryOptions = [{ value: '', label: '全部类型' }, ...Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l }))];

const levelColors: Record<string, string> = {
  L1: '#48BB78', L2: '#54C5F8', L3: '#9F7AEA', L4: '#ED8936', L5: '#E53E3E', L6: '#01579B',
};

export default function ReadingList() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<PaginatedResponse<MaterialOut>>({ items: [], total: 0, page: 1, page_size: 20 });
  const [progress, setProgress] = useState<ProgressOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [tab, setTab] = useState('all');

  const fetchData = () => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = { page: '1', page_size: '20' };
    if (level) params.level = level;
    if (category) params.category = category;
    Promise.all([
      apiClient.get<PaginatedResponse<MaterialOut>>('/reading/materials', { params }),
      apiClient.get<ProgressOut[]>('/reading/progress').catch(() => ({ data: [] })),
    ]).then(([mRes, pRes]) => {
      setMaterials(mRes.data);
      setProgress(pRes.data || []);
    }).catch((err) => setError(err.response?.data?.detail?.message || '加载失败'))
    .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [level, category]);

  if (error) return <PageContainer><ErrorState message={error} onRetry={fetchData} /></PageContainer>;

  return (
    <PageContainer title="阅读" extra={
      <Space>
        <Select value={level} onChange={setLevel} options={levelOptions} style={{ width: 120 }} />
        <Select value={category} onChange={setCategory} options={categoryOptions} style={{ width: 120 }} />
      </Space>
    }>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'all', label: '全部材料' },
        { key: 'progress', label: `阅读进度 (${progress.length})` },
      ]} />

      {tab === 'progress' ? (
        progress.length === 0 ? <EmptyState title="还没有开始阅读哦 📖" /> : (
          <Row gutter={[16, 16]}>
            {progress.map((p) => (
              <Col xs={24} sm={12} md={8} key={p.id}>
                <ReadingProgressCard progress={p} />
              </Col>
            ))}
          </Row>
        )
      ) : loading ? <LoadingState /> : materials.items.length === 0 ? <EmptyState title="暂无阅读材料" /> : (
        <Row gutter={[16, 16]}>
          {materials.items.map((m:MaterialOut) => (
            <Col xs={24} sm={12} lg={8} key={m.id}>
              <Card hoverable onClick={() => navigate(`/reading/${m.id}`)} style={{ height: '100%', borderRadius: 12 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 10,
                    background: `${levelColors[m.level] || '#54C5F8'}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, color: levelColors[m.level] || '#54C5F8', flexShrink: 0,
                  }}>
                    <BookOutlined />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Typography.Text strong ellipsis style={{ fontSize: 15, display: 'block' }}>{m.title}</Typography.Text>
                    <Space style={{ marginTop: 4 }}>
                      <Tag color={levelColors[m.level] || 'blue'}>{levelLabels[m.level] || m.level}</Tag>
                      <Tag>{categoryLabels[m.category] || m.category}</Tag>
                    </Space>
                  </div>
                </div>
                <Typography.Text type="secondary">{m.page_count} 页</Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </PageContainer>
  );
}
