import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button } from 'antd';
import { CalendarOutlined, HistoryOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';
import type { CourseOut } from '../../types';
import { CourseCard, EmptyState, ErrorBanner, LoadingPage } from '../../components/shared';

const { Title } = Typography;

export default function TodayCoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const res = await apiClient.get('/courses', { params: { date: today, page_size: 50 } });
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <CalendarOutlined style={{ color: '#F4A230', marginRight: 8 }} />
          今日课程
        </Title>
        <Button type="link" icon={<HistoryOutlined />} onClick={() => navigate('/courses/history')}>
          课程记录
        </Button>
      </div>

      {loading ? <LoadingPage rows={3} /> :
        error ? <ErrorBanner message={error} onRetry={fetchCourses} /> :
          courses.length === 0 ? (
            <EmptyState
              icon={<CalendarOutlined />}
              title="今天没有课程"
              description="查看课程记录或去阅读库"
            />
          ) : courses.map(c => (
            <CourseCard key={c.id} course={c} onClick={id => navigate(`/courses/${id}`)} />
          ))
      }
    </div>
  );
}
