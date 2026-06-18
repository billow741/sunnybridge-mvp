import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Space, DatePicker } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';
import type { CourseOut } from '../../types';
import { CourseCard, EmptyState, ErrorBanner, LoadingPage } from '../../components/shared';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function CourseHistoryPage() {
  const [courses, setCourses] = useState<CourseOut[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [month, setMonth] = useState<string>('');
  const navigate = useNavigate();

  const fetchCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (status) params.status = status;
      if (month) params.month = month;
      const res = await apiClient.get('/courses/history', { params });
      setCourses(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load course history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCourses(); }, [page, status, month]);

  if (loading) return <LoadingPage rows={6} />;
  if (error) return <div style={{ padding: 24 }}><ErrorBanner message={error} onRetry={fetchCourses} /></div>;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A2B4A', margin: '0 0 24px 0' }}>
        All Courses
      </h1>

      <Space style={{ marginBottom: 20 }}>
        <DatePicker
          picker="month"
          placeholder="Select month"
          onChange={(_, ds) => setMonth(ds as string)}
          style={{ width: 160 }}
          allowClear
        />
        <Select
          value={status || undefined}
          options={STATUS_OPTIONS}
          onChange={v => { setStatus(v); setPage(1); }}
          style={{ width: 140 }}
          placeholder="Filter status"
          allowClear
        />
      </Space>

      {courses.length === 0 ? (
        <EmptyState
          icon={<HistoryOutlined style={{ fontSize: 40, color: '#CBD5E1' }} />}
          title="No courses in this period"
          description="Try adjusting the filters"
        />
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => navigate(`/courses/${course.id}`)}
            />
          ))}
        </Space>
      )}
    </div>
  );
}
