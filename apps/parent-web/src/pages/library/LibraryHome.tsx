import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Select, Row, Col, Tabs } from 'antd';
import { ReadOutlined, BookOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';
import type { MaterialOut } from '../../types';
import { MaterialCard, EmptyState, ErrorBanner, LoadingPage } from '../../components/shared';

const { Title } = Typography;

const LEVEL_OPTIONS = [
  { value: '', label: '全部等级' },
  { value: 'L1', label: 'L1 启蒙' },
  { value: 'L2', label: 'L2 入门' },
  { value: 'L3', label: 'L3 基础' },
  { value: 'L4', label: 'L4 进阶' },
  { value: 'L5', label: 'L5 中级' },
  { value: 'L6', label: 'L6 高级' },
];

const CATEGORY_TABS = [
  { key: '', label: '全部' },
  { key: 'picture_book', label: '绘本' },
  { key: 'short_text', label: '短文' },
  { key: 'story', label: '故事' },
  { key: 'read_aloud', label: '朗读' },
];

export default function LibraryHomePage() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<MaterialOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => { fetchMaterials(); }, [level, category]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const params: any = { page_size: 100, is_active: true };
      if (level) params.level = level;
      if (category) params.category = category;
      const res = await apiClient.get('/reading/materials', { params });
      const data = res.data;
      setMaterials(Array.isArray(data) ? data : data.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || '获取阅读材料失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Title level={4} className="page-title">
        <ReadOutlined style={{ color: '#F4A230', marginRight: 8 }} />
        分级阅读
      </Title>

      <Select
        value={level || undefined}
        onChange={v => setLevel(v || '')}
        options={LEVEL_OPTIONS}
        allowClear
        placeholder="选择等级"
        style={{ width: '100%', marginBottom: 12, borderRadius: 12 }}
      />

      <Tabs
        activeKey={category}
        onChange={setCategory}
        items={CATEGORY_TABS.map(t => ({ key: t.key, label: t.label }))}
        style={{ marginBottom: 12 }}
      />

      {loading ? <LoadingPage rows={4} /> :
        error ? <ErrorBanner message={error} onRetry={fetchMaterials} /> :
          materials.length === 0 ? (
            <EmptyState
              icon={<BookOutlined />}
              title="暂无阅读材料"
              description="换个等级或分类试试"
            />
          ) : (
            <Row gutter={[12, 12]}>
              {materials.map(m => (
                <Col span={12} key={m.id}>
                  <MaterialCard material={m} onClick={id => navigate(`/reading/${id}`)} />
                </Col>
              ))}
            </Row>
          )
      }
    </div>
  );
}
