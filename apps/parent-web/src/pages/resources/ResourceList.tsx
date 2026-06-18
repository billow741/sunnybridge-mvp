import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Select, Space } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';
import type { ResourceOut } from '../../types';
import { ResourceCard, EmptyState, ErrorBanner, LoadingPage } from '../../components/shared';

const { Title } = Typography;

export default function ResourceListPage() {
  const navigate = useNavigate();
  const [resources, setResources] = useState<ResourceOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => { fetchResources(); }, [category]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const params: any = { page_size: 100, is_active: true };
      if (category) params.category = category;
      const res = await apiClient.get('/resources', { params });
      const data = res.data;
      setResources(Array.isArray(data) ? data : data.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || '获取资源失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Title level={4} className="page-title">
        <FolderOutlined style={{ color: '#F4A230', marginRight: 8 }} />
        资源库
      </Title>

      <Select
        value={category || undefined}
        onChange={v => setCategory(v || '')}
        allowClear
        placeholder="全部分类"
        style={{ width: '100%', marginBottom: 12, borderRadius: 12 }}
        options={[
          { value: '', label: '全部' },
          { value: 'phonics', label: '自然拼读' },
          { value: 'word_card', label: '单词卡' },
          { value: 'recommended', label: '推荐资源' },
        ]}
      />

      {loading ? <LoadingPage rows={4} /> :
        error ? <ErrorBanner message={error} onRetry={fetchResources} /> :
          resources.length === 0 ? (
            <EmptyState
              icon={<FolderOutlined />}
              title="暂无资源"
              description="换个分类试试"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {resources.map(r => (
                <ResourceCard key={r.id} resource={r} onClick={id => navigate(`/resources/${id}`)} />
              ))}
            </div>
          )
      }
    </div>
  );
}
