import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Card, InputNumber } from 'antd';
import { ArrowLeftOutlined, BookOutlined, FilePdfOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';
import type { MaterialDetail } from '../../types';
import { LevelTag, LoadingPage, ErrorBanner } from '../../components/shared';

const { Title, Text } = Typography;

export default function ReadingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<MaterialDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/reading/materials/${id}`);
        setMaterial(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || '获取材料详情失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingPage rows={4} />;
  if (error) return <div className="page-container"><ErrorBanner message={error} /></div>;
  if (!material) return null;

  const pdfUrl = material.signed_pdf_url || material.pdf_url;

  return (
    <div className="page-container">
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}
        style={{ marginBottom: 12, padding: 0, color: '#F4A230' }}>
        返回
      </Button>

      <Card style={{ borderRadius: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <Title level={4} style={{ margin: 0, flex: 1, marginRight: 8 }}>{material.title}</Title>
          {material.level && <LevelTag level={material.level} />}
        </div>
        <Text style={{ color: '#A0AEC0' }}>{material.page_count} 页</Text>
      </Card>

      {/* PDF 阅读器 */}
      {pdfUrl ? (
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #F0E6D6', background: '#fff' }}>
          <iframe
            src={pdfUrl}
            title={material.title}
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
