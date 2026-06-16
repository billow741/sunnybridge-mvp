import { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Space } from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import apiClient from '../../api/client';
import type { ResourceDetail } from '../../types';
import { resourceCategoryLabels } from '../../utils/labels';

export default function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<ResourceDetail>(`/resources/${id}`)
      .then((res) => setResource(res.data))
      .catch((err) => setError(err.response?.data?.detail?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageContainer><LoadingState /></PageContainer>;
  if (error || !resource) return <PageContainer><ErrorState message={error || '未找到'} onRetry={() => navigate(-1)} /></PageContainer>;

  return (
    <PageContainer title={resource.title} extra={
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
        <Button type="primary" icon={<FilePdfOutlined />} onClick={() => window.open(resource.signed_pdf_url || resource.pdf_url, '_blank')}>打开PDF</Button>
      </Space>
    }>
      <Card style={{ borderRadius: 12 }}>
        <Descriptions column={1}>
          <Descriptions.Item label="类型">{resourceCategoryLabels[resource.category] || resource.category}</Descriptions.Item>
        </Descriptions>
      </Card>
    </PageContainer>
  );
}
