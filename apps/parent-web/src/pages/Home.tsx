import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Spin } from 'antd';

import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import ChildCard from '../components/ChildCard';
import CourseStatusTag from '../components/CourseStatusTag';
import apiClient from '../api/client';
import type { ChildOut, CourseOut, ProgressOut } from '../types';
import { formatTime, getGreeting } from '../utils/dayjs';

const { Text, Title } = Typography;

export default function Home() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildOut[]>([]);
  const [courses, setCourses] = useState<CourseOut[]>([]);
  const [progress, setProgress] = useState<ProgressOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<ChildOut[]>('/children/me').catch(() => ({ data: [] })),
      apiClient.get<CourseOut[]>('/courses/today').catch(() => ({ data: [] })),
      apiClient.get<ProgressOut[]>('/reading/progress').catch(() => ({ data: [] })),
    ]).then(([childrenRes, coursesRes, progressRes]) => {
      setChildren(childrenRes.data || []);
      setCourses(coursesRes.data || []);
      setProgress(progressRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageContainer><Spin size="large" style={{ display: 'block', margin: '64px auto' }} /></PageContainer>;

  const activeReading = progress.filter((p) => !p.completed).length;
  const completedReading = progress.filter((p) => p.completed).length;

  return (
    <PageContainer title={`${getGreeting()}，家长`}>
      {/* 孩子信息 */}
      {children.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Title level={5} style={{ marginBottom: 12 }}>我的孩子</Title>
          <Row gutter={[16, 12]}>
            {children.map((c) => (
              <Col xs={24} sm={12} md={8} key={c.id}>
                <ChildCard child={c} />
              </Col>
            ))}
          </Row>
        </div>
      )}

      <Row gutter={16}>
        {/* 今日课程 */}
        <Col xs={24} lg={14} style={{ marginBottom: 16 }}>
          <Card title="今日课程" extra={<a onClick={() => navigate('/courses/today')}>查看全部</a>} style={{ borderRadius: 12 }}>
            {courses.length === 0 ? (
              <Text type="secondary">今天没有课程安排 🌤️</Text>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {courses.slice(0, 4).map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, background: '#FFFDF7' }}>
                    <div>
                      <Text strong>{formatTime(c.start_time)} - {formatTime(c.end_time)}</Text>
                      <Text type="secondary" style={{ marginLeft: 8 }}>老师：{c.teacher?.name || '—'}</Text>
                    </div>
                    <CourseStatusTag status={c.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* 阅读概览 */}
        <Col xs={24} lg={10} style={{ marginBottom: 16 }}>
          <Card title="阅读进度" extra={<a onClick={() => navigate('/reading')}>查看全部</a>} style={{ borderRadius: 12 }}>
            <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div style={{ textAlign: 'center', padding: '16px 0', background: '#FFFDF7', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 600, color: '#FFA726' }}>{activeReading}</div>
                  <Text type="secondary">进行中</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'center', padding: '16px 0', background: '#F0FFF4', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 600, color: '#48BB78' }}>{completedReading}</div>
                  <Text type="secondary">已完成</Text>
                </div>
              </Col>
            </Row>
            {progress.filter((p) => !p.completed).slice(0, 2).map((p) => (
              <div key={p.id} style={{ padding: '8px 0', borderTop: '1px solid #F0E6D6' }}>
                <Text>{p.title || '未知材料'}</Text>
                <Text type="secondary" style={{ float: 'right' }}>{p.current_page}/{p.page_count || '?'} 页</Text>
              </div>
            ))}
            {progress.length === 0 && <Text type="secondary">还没有开始阅读哦 📖</Text>}
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
