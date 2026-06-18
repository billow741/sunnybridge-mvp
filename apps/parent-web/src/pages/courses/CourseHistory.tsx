import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Typography, Select, Button, Space } from 'antd';
import { HistoryOutlined, CalendarOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';
import type { CourseOut } from '../../types';
import { CourseCard, EmptyState, ErrorBanner, LoadingPage } from '../../components/shared';

const { Title } = Typography;

export default function CourseHistoryPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { fetchCourses(); }, [status, page]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params: any = { page_size: 20, page };
      if (status) params.status = status;
      const res = await apiClient.get('/courses', { params });
      const data = res.data;
      setCourses(Array.isArray(data) ? data : data.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || '获取课程失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Title level={4} className="page-title">
        <HistoryOutlined style={{ color: '#F4A230', marginRight: 8 }} />
        课程记录
      </Title>

      <Space style={{ marginBottom: 16, width: '100%' }} size={8}>
        <Select
          value={status || undefined}
          onChange={v => { setStatus(v || ''); setPage(1); }}
          placeholder="全部状态"
          allowClear
          style={{ width: 120, borderRadius: 12 }}
          options={[
            { value: '', label: '全部' },
            { value: 'completed', label: '已完成' },
            { value: 'pending', label: '待上课' },
            { value: 'cancelled', label: '已取消' },
          ]}
        />
        <Button type="link" icon={<CalendarOutlined />} onClick={() => navigate('/courses/today')}>
          今日课程
        </Button>
      </Space>

      {loading ? <LoadingPage rows={4} /> :
        error ? <ErrorBanner message={error} onRetry={fetchCourses} /> :
          courses.length === 0 ? (
            <EmptyState
              icon={<HistoryOutlined />}
              title="暂无课程记录"
            />
          ) : courses.map(c => (
            <CourseCard key={c.id} course={c} onClick={id => navigate(`/courses/${id}`)} />
          ))
      }

      {courses.length >= 20 && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => setPage(p => p + 1)} type="link">加载更多</Button>
        </div>
      )}
    </div>
  );
}
