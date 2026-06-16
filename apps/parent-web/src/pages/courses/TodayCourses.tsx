import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography } from 'antd';
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import CourseStatusTag from '../../components/CourseStatusTag';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import apiClient from '../../api/client';
import type { CourseOut } from '../../types';
import { formatTime } from '../../utils/dayjs';

const { Text } = Typography;

export default function TodayCourses() {
  const [courses, setCourses] = useState<CourseOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchCourses = () => {
    setLoading(true);
    setError(null);
    apiClient.get<CourseOut[]>('/courses/today')
      .then((res) => setCourses(res.data))
      .catch((err) => setError(err.response?.data?.detail?.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCourses(); }, []);

  if (loading) return <PageContainer><LoadingState /></PageContainer>;
  if (error) return <PageContainer><ErrorState message={error} onRetry={fetchCourses} /></PageContainer>;

  return (
    <PageContainer title="今日课程">
      {courses.length === 0 ? (
        <EmptyState title="今天没有课程安排 🌤️" />
      ) : (
        <Row gutter={[16, 16]}>
          {courses.map((c) => (
            <Col xs={24} sm={12} md={8} key={c.id}>
              <Card hoverable onClick={() => navigate(`/courses/${c.id}`)} style={{ borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <Text strong style={{ fontSize: 16 }}>
                      <ClockCircleOutlined style={{ marginRight: 6, color: '#FFA726' }} />
                      {formatTime(c.start_time)} - {formatTime(c.end_time)}
                    </Text>
                  </div>
                  <CourseStatusTag status={c.status} />
                </div>
                <div>
                  <Text type="secondary"><UserOutlined style={{ marginRight: 6 }} />老师：{c.teacher?.name || '—'}</Text>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">学生：{c.children.map((ch:{name:string}) => ch.name).join('、') || '—'}</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </PageContainer>
  );
}
