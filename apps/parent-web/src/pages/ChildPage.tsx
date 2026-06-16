import { useState, useEffect } from 'react';
import { Row, Col } from 'antd';
import PageContainer from '../components/PageContainer';
import ChildCard from '../components/ChildCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import apiClient from '../api/client';
import type { ChildOut } from '../types';

export default function ChildPage() {
  const [children, setChildren] = useState<ChildOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = () => {
    setLoading(true);
    setError(null);
    apiClient.get('/children/me')
      .then((res) => {
        // Backend returns a single ChildOut object, not an array
        const data = res.data;
        if (Array.isArray(data)) {
          setChildren(data);
        } else if (data && typeof data === 'object') {
          setChildren([data]);
        } else {
          setChildren([]);
        }
      })
      .catch((err) => setError(err.response?.data?.detail?.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchChildren(); }, []);

  if (loading) return <PageContainer><LoadingState /></PageContainer>;
  if (error) return <PageContainer><ErrorState message={error} onRetry={fetchChildren} /></PageContainer>;

  return (
    <PageContainer title="我的孩子">
      {children.length === 0 ? (
        <EmptyState title="还没有添加孩子信息" />
      ) : (
        <Row gutter={[16, 16]}>
          {children.map((c) => (
            <Col xs={24} sm={12} md={8} key={c.id}>
              <ChildCard child={c} />
            </Col>
          ))}
        </Row>
      )}
    </PageContainer>
  );
}
