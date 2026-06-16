import { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Space, Slider, message, Typography } from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import apiClient from '../../api/client';
import type { MaterialDetail, ProgressOut } from '../../types';
import { categoryLabels, levelLabels } from '../../utils/labels';

export default function ReadingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<MaterialDetail | null>(null);
  const [progress, setProgress] = useState<ProgressOut | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<MaterialDetail>(`/reading/materials/${id}`),
      apiClient.get<ProgressOut[]>('/reading/progress').catch(() => ({ data: [] })),
    ]).then(([mRes, pRes]) => {
      setMaterial(mRes.data);
      const p = (pRes.data || []).find((pr) => pr.material_id === id);
      if (p) {
        setProgress(p);
        setCurrentPage(p.current_page);
      }
    }).catch((err) => setError(err.response?.data?.detail?.message || '加载失败'))
    .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageContainer><LoadingState /></PageContainer>;
  if (error || !material) return <PageContainer><ErrorState message={error || '未找到'} onRetry={() => navigate(-1)} /></PageContainer>;

  const saveProgress = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/reading/progress/${id}`, { current_page: currentPage });
      message.success('进度已保存');
      if (currentPage >= material!.page_count) {
        setProgress({ ...progress!, completed: true, current_page: currentPage } as ProgressOut);
      }
    } catch (err: any) {
      message.error(err.response?.data?.detail?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const pdfUrl = material.signed_pdf_url || material.pdf_url;

  return (
    <PageContainer title={material.title} extra={
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
        {pdfUrl && <Button type="primary" icon={<FilePdfOutlined />} onClick={() => window.open(pdfUrl, '_blank')}>打开PDF</Button>}
      </Space>
    }>
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Descriptions column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="级别">{levelLabels[material.level] || material.level}</Descriptions.Item>
          <Descriptions.Item label="类型">{categoryLabels[material.category] || material.category}</Descriptions.Item>
          <Descriptions.Item label="总页数">{material.page_count} 页</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="阅读进度" style={{ borderRadius: 12 }}>
        {progress?.completed && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: '#F0FFF4', borderRadius: 8, color: '#38A169' }}>
            <CheckCircleOutlined /> 已完成阅读！
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <Typography.Text>当前页：{currentPage} / {material.page_count}</Typography.Text>
          <Slider
            min={0}
            max={material.page_count}
            value={currentPage}
            onChange={setCurrentPage}
            marks={{ 0: '0', [material.page_count]: `${material.page_count}` }}
          />
        </div>
        <Button type="primary" onClick={saveProgress} loading={saving}>保存进度</Button>
      </Card>
    </PageContainer>
  );
}
