import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Card } from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined, DownloadOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';
import type { ResourceOut } from '../../types';
import { LoadingPage, ErrorBanner } from '../../components/shared';

const { Title, Text } = Typography;

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resource, setResource] = useState<ResourceOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/resources/${id}`);
        setResource(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || '获取资源详情失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingPage rows={4} />;
  if (error) return <div className="page-container"><ErrorBanner message={error} /></div>;
  if (!resource) return null;

  return (
    <div className="page-container">
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}
        style={{ marginBottom: 12, padding: 0, color: '#F4A230' }}>
        返回
      </Button>

      <Card style={{ borderRadius: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, background: '#FFF5E6',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <FilePdfOutlined style={{ fontSize: 26, color: '#F4A230' }} />
          </div>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: '0 0 4px 0' }}>{resource.title}</Title>
            {resource.category && <span className="sun-tag">{resource.category}</span>}
          </div>
        </div>
      </Card>

      {resource.pdf_url ? (
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #F0E6D6', background: '#fff' }}>
          <iframe
            src={resource.pdf_url}
            title={resource.title}
            style={{ width: '100%', height: '70vh', border: 'none' }}
          />
        </div>
      ) : (
        <Card style={{ borderRadius: 14, textAlign: 'center', padding: 48 }}>
          <FilePdfOutlined style={{ fontSize: 48, color: '#E2E8F0', marginBottom: 12 }} />
          <div style={{ color: '#A0AEC0' }}>暂无 PDF 文件</div>
        </Card>
      )}
    </div>
  );
}
