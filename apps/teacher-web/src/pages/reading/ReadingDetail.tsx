import { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Space } from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import apiClient from '../../api/client';
import type { MaterialDetail } from '../../types';
import { categoryLabels, levelLabels } from '../../utils/labels';

export default function ReadingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<MaterialDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<MaterialDetail>(`/reading/materials/${id}`)
      .then((res) => setMaterial(res.data))
      .catch((err) => setError(err.response?.data?.detail?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageContainer><LoadingState /></PageContainer>;
  if (error || !material) return <PageContainer><ErrorState message={error || '未找到'} onRetry={() => navigate(-1)} /></PageContainer>;

  const pdfUrl = material.signed_pdf_url || material.pdf_url;

  return (
    <PageContainer title={material.title} extra={
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
        {pdfUrl && <Button type="primary" icon={<FilePdfOutlined />} onClick={() => window.open(pdfUrl, '_blank')}>打开PDF</Button>}
      </Space>
    }>
      <Card>
        <Descriptions column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="级别">{levelLabels[material.level] || material.level}</Descriptions.Item>
          <Descriptions.Item label="类型">{categoryLabels[material.category] || material.category}</Descriptions.Item>
          <Descriptions.Item label="页数">{material.page_count} 页</Descriptions.Item>
        </Descriptions>
      </Card>
    </PageContainer>
  );
}
