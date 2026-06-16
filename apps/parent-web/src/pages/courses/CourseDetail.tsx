import { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Space, Typography } from 'antd';
import { ArrowLeftOutlined, LinkOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import CourseStatusTag from '../../components/CourseStatusTag';
import FeedbackCard from '../../components/FeedbackCard';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import apiClient from '../../api/client';
import type { CourseDetail } from '../../types';
import { formatTime, formatDate } from '../../utils/dayjs';

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<CourseDetail>(`/courses/${id}`)
      .then((res) => setCourse(res.data))
      .catch((err) => setError(err.response?.data?.detail?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageContainer><LoadingState /></PageContainer>;
  if (error || !course) return <PageContainer><ErrorState message={error || '未找到课程'} onRetry={() => navigate(-1)} /></PageContainer>;

  return (
    <PageContainer title="课程详情" extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>}>
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Descriptions column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="日期">{formatDate(course.date)}</Descriptions.Item>
          <Descriptions.Item label="时间">{formatTime(course.start_time)} - {formatTime(course.end_time)}</Descriptions.Item>
          <Descriptions.Item label="老师">{course.teacher?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="状态"><CourseStatusTag status={course.status} /></Descriptions.Item>
          {course.meeting_link && (
            <Descriptions.Item label="课堂链接">
              <a href={course.meeting_link} target="_blank" rel="noreferrer"><LinkOutlined /> 进入课堂</a>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title={`学生 (${course.children.length})`} style={{ marginBottom: 16, borderRadius: 12 }}>
        <Space wrap>
          {course.children.map((c: {id:string;name:string;english_name?:string}) => (
            <span key={c.id} style={{ padding: '4px 12px', background: '#FFFDF7', borderRadius: 16, fontSize: 14 }}>
              {c.name}{c.english_name ? ` (${c.english_name})` : ''}
            </span>
          ))}
          {course.children.length === 0 && <Typography.Text type="secondary">无学生信息</Typography.Text>}
        </Space>
      </Card>

      <Card title="老师反馈" style={{ borderRadius: 12 }}>
        {course.feedback ? (
          <FeedbackCard feedback={course.feedback} />
        ) : (
          <Typography.Text type="secondary">老师还没有提交反馈</Typography.Text>
        )}
      </Card>
    </PageContainer>
  );
}
