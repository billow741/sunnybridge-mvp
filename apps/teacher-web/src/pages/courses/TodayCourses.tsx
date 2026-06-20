import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Space } from 'antd';
import { CalendarOutlined, FormOutlined } from '@ant-design/icons';
const formatDate = () => {
  const d = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
};
import apiClient from '../../api/client';
import type { CourseOut } from '../../types';
import { CourseCard, EmptyState, ErrorBanner, LoadingPage } from '../../components/shared';

export default function TodayCoursesPage() {
  const [courses, setCourses] = useState<CourseOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchToday = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/courses/today');
      setCourses(res.data?.items || res.data || []);
    } catch (err: any) {
      const d = err?.response?.data?.detail;
      setError((typeof d === 'string' ? d : (d?.message)) || 'Failed to load today\'s classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchToday(); }, []);

  if (loading) return <LoadingPage rows={4} />;
  if (error) return <div style={{ padding: 24 }}><ErrorBanner message={error} onRetry={fetchToday} /></div>;

  const today = formatDate();

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A2B4A', margin: 0 }}>Today's Classes</h1>
          <div style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>{today}</div>
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={<CalendarOutlined style={{ fontSize: 40, color: '#CBD5E1' }} />}
          title="No classes today"
          description="Enjoy your break! 🎉"
        />
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => navigate(`/courses/${course.id}`)}
              action={
                course.status === 'completed' && !course.feedback ? (
                  <Button
                    type="link"
                    size="small"
                    icon={<FormOutlined />}
                    style={{ color: '#5CAADF', padding: 0, height: 'auto' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/courses/${course.id}`, { state: { openFeedback: true } });
                    }}
                  >
                    Feedback
                  </Button>
                ) : undefined
              }
            />
          ))}
        </Space>
      )}
    </div>
  );
}
