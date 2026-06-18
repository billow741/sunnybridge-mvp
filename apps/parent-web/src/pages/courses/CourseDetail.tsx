import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Typography, Button, Divider, Avatar } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, ClockCircleOutlined, TeamOutlined, FormOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';
import type { CourseDetail } from '../../types';
import { StatusTag, LoadingPage, ErrorBanner } from '../../components/shared';

const { Title, Text, Paragraph } = Typography;

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/courses/${id}`);
        setCourse(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || '获取课程详情失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingPage rows={6} />;
  if (error) return <div className="page-container"><ErrorBanner message={error} /></div>;
  if (!course) return null;

  const teacherName = course.teacher?.name || '—';
  const childrenNames = course.children?.map(c => c.english_name || c.name).join('、') || '—';

  return (
    <div className="page-container">
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}
        style={{ marginBottom: 12, padding: 0, color: '#F4A230' }}>
        返回
      </Button>

      <Card style={{ borderRadius: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Title level={4} style={{ margin: 0 }}>{course.date} 课程</Title>
          <StatusTag status={course.status} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#718096' }}>
          <CalendarOutlined style={{ color: '#F4A230' }} />
          <span>{course.date}</span>
          <ClockCircleOutlined style={{ marginLeft: 12, color: '#F4A230' }} />
          <span>{course.start_time} - {course.end_time}</span>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Avatar size={32} style={{ background: '#5CAADF', color: '#fff' }}>{teacherName[0]}</Avatar>
          <div>
            <div style={{ fontSize: 12, color: '#A0AEC0' }}>授课老师</div>
            <div style={{ fontWeight: 600 }}>{teacherName} 老师</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TeamOutlined style={{ color: '#F4A230', fontSize: 18 }} />
          <div>
            <div style={{ fontSize: 12, color: '#A0AEC0' }}>上课学生</div>
            <div style={{ fontWeight: 600 }}>{childrenNames}</div>
          </div>
        </div>

        {course.meeting_link && (
          <div style={{ marginTop: 12 }}>
            <Button type="primary" href={course.meeting_link} target="_blank" block style={{ borderRadius: 12 }}>
              进入会议室
            </Button>
          </div>
        )}
      </Card>

      {/* 反馈 */}
      {course.feedback && (
        <Card style={{ borderRadius: 14 }} title={<span><FormOutlined style={{ color: '#F4A230', marginRight: 6 }} />老师反馈</span>}>
          <Paragraph style={{ whiteSpace: 'pre-wrap', color: '#2D3748' }}>{course.feedback.content}</Paragraph>
          {course.feedback.homework && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ fontWeight: 600, marginBottom: 6 }}>📝 课后作业</div>
              <Paragraph style={{ whiteSpace: 'pre-wrap', color: '#4A5568' }}>{course.feedback.homework}</Paragraph>
            </>
          )}
          {course.feedback.notes && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ fontWeight: 600, marginBottom: 6 }}>💡 备注</div>
              <Paragraph style={{ whiteSpace: 'pre-wrap', color: '#718096', fontStyle: 'italic' }}>{course.feedback.notes}</Paragraph>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
