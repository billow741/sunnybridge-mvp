import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Spin } from 'antd';
import { CalendarOutlined, EditOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import CourseStatusTag from '../components/CourseStatusTag';
import EmptyState from '../components/EmptyState';
import apiClient from '../api/client';
import type { CourseOut } from '../types';
import { getGreeting, formatTime } from '../utils/dayjs';

const { Text } = Typography;

export default function Dashboard() {
  const [courses, setCourses] = useState<CourseOut[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get<CourseOut[]>('/courses/today')
      .then((res) => setCourses(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pendingFeedback = courses.filter((c) => c.status === 'completed').length;
  const children = courses.flatMap((c) => c.children);
  const uniqueChildren = new Set(children.map((c) => c.id)).size;

  const statCards = [
    { title: '今日课程', value: courses.length, icon: <CalendarOutlined />, color: '#54C5F8' },
    { title: '待写反馈', value: pendingFeedback, icon: <EditOutlined />, color: '#ECC94B' },
    { title: '学生总数', value: uniqueChildren, icon: <TeamOutlined />, color: '#48BB78' },
  ];

  return (
    <PageContainer title={`${getGreeting()}，老师`}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {statCards.map((s) => (
          <Col xs={24} sm={8} key={s.title}>
            <Card hoverable>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: s.color }}>
                  {s.icon}
                </div>
                <div>
                  <Text type="secondary">{s.title}</Text>
                  <Typography.Title level={2} style={{ margin: 0 }}>{s.value}</Typography.Title>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="今日课程" extra={<a onClick={() => navigate('/courses/today')}>查看全部</a>}>
        {loading ? <Spin /> : courses.length === 0 ? <EmptyState title="今天没有课程安排 🌤️" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {courses.slice(0, 5).map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: '#F7FAFC' }}>
                <div>
                  <Text strong>{formatTime(c.start_time)} - {formatTime(c.end_time)}</Text>
                  <Text type="secondary" style={{ marginLeft: 12 }}>{c.children.map((ch) => ch.name).join('、')}</Text>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <CourseStatusTag status={c.status} />
                  <a onClick={() => navigate(`/courses/${c.id}`)}>查看详情</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
