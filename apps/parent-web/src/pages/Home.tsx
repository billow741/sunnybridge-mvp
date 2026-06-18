import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, Avatar, Button } from 'antd';
import { CalendarOutlined, ReadOutlined, FolderOutlined, HistoryOutlined } from '@ant-design/icons';
import apiClient from '../api/client';
import type { CourseOut } from '../types';
import { CourseCard, EmptyState, ErrorBanner, LoadingPage } from '../components/shared';
import { useAuthStore } from '../store/authStore';

const { Title } = Typography;

const quickLinks = [
  { key: 'courses', icon: <CalendarOutlined style={{ fontSize: 24, color: '#F4A230' }} />, label: '今日课程', path: '/courses/today' },
  { key: 'history', icon: <HistoryOutlined style={{ fontSize: 24, color: '#5CAADF' }} />, label: '课程记录', path: '/courses/history' },
  { key: 'library', icon: <ReadOutlined style={{ fontSize: 24, color: '#E53E3E' }} />, label: '分级阅读', path: '/library' },
  { key: 'resources', icon: <FolderOutlined style={{ fontSize: 24, color: '#38A169' }} />, label: '资源库', path: '/resources' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { children: childList, currentChildId, fetchChildren } = useAuthStore();
  const [courses, setCourses] = useState<CourseOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (childList.length === 0) fetchChildren();
    fetchTodayCourses();
  }, []);

  const fetchTodayCourses = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const res = await apiClient.get('/courses', { params: { date: today, page_size: 20 } });
      const data = res.data;
      setCourses(Array.isArray(data) ? data : data.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || '获取课程失败');
    } finally {
      setLoading(false);
    }
  };

  const currentChild = childList.find(c => c.id === currentChildId);

  return (
    <div className="page-container">
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ marginBottom: 4 }}>
          {currentChild ? `${currentChild.english_name || currentChild.name}，你好！` : '你好！'}
        </Title>
        <Typography.Text style={{ color: '#A0AEC0', fontSize: 14 }}>
          {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Typography.Text>
      </div>

      {/* 快捷入口 */}
      <Row gutter={12} style={{ marginBottom: 24 }}>
        {quickLinks.map(q => (
          <Col span={6} key={q.key}>
            <Card
              hoverable
              onClick={() => navigate(q.path)}
              bodyStyle={{ padding: '14px 8px', textAlign: 'center' }}
              style={{ borderRadius: 14, border: '1px solid #F0E6D6' }}
            >
              {q.icon}
              <div style={{ fontSize: 12, color: '#4A5568', marginTop: 6 }}>{q.label}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 今日课程 */}
      <Title level={5} className="section-title">今日课程</Title>
      {loading ? <LoadingPage rows={2} /> :
        error ? <ErrorBanner message={error} onRetry={fetchTodayCourses} /> :
          courses.length === 0 ? (
            <EmptyState
              icon={<CalendarOutlined />}
              title="今日暂无课程"
              description="看看阅读库有没有新内容吧"
              action={<Button type="primary" onClick={() => navigate('/library')}>去读书</Button>}
            />
          ) : courses.map(c => (
            <CourseCard key={c.id} course={c} onClick={id => navigate(`/courses/${id}`)} />
          ))
      }
    </div>
  );
}
