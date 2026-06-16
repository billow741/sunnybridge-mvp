import { useState, useEffect } from 'react';
import { Card, Select, List, Tag } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import apiClient from '../../api/client';
import type { ResourceOut, PaginatedResponse } from '../../types';
import { resourceCategoryLabels } from '../../utils/labels';

const categoryOptions = [
  { value: '', label: '全部类型' },
  ...Object.entries(resourceCategoryLabels).map(([v, l]) => ({ value: v, label: l })),
];

const categoryColors: Record<string, string> = {
  phonics: '#54C5F8', word_card: '#48BB78', recommended: '#ED8936',
};

export default function ResourceList() {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse<ResourceOut>>({ items: [], total: 0, page: 1, page_size: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');

  const fetchResources = () => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = { page: '1', page_size: '20' };
    if (category) params.category = category;
    apiClient.get<PaginatedResponse<ResourceOut>>('/resources', { params })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail?.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchResources(); }, [category]);

  return (
    <PageContainer title="教学资源" extra={
      <Select value={category} onChange={setCategory} options={categoryOptions} style={{ width: 140 }} />
    }>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={fetchResources} /> :
        data.items.length === 0 ? <EmptyState title="暂无教学资源" /> : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, lg: 3 }}
            dataSource={data.items}
            renderItem={(r) => (
              <List.Item>
                <Card hoverable onClick={() => navigate(`/resources/${r.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 8,
                      background: `${categoryColors[r.category] || '#54C5F8'}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, color: categoryColors[r.category] || '#54C5F8',
                    }}>
                      <FolderOutlined />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{r.title}</div>
                      <Tag color={categoryColors[r.category] || 'blue'} style={{ marginTop: 4 }}>
                        {resourceCategoryLabels[r.category] || r.category}
                      </Tag>
                    </div>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        )
      }
    </PageContainer>
  );
}
