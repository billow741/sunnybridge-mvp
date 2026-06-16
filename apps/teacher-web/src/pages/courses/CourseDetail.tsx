import { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Space, Typography } from 'antd';
import { ArrowLeftOutlined, LinkOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import CourseStatusTag from '../../components/CourseStatusTag';
import FeedbackCard from '../../components/FeedbackCard';
import FeedbackForm from '../../components/FeedbackForm';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import apiClient from '../../api/client';
import type { CourseDetail, FeedbackOut } from '../../types';
import { formatTime, formatDate } from '../../utils/dayjs';

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFeedback, setEditingFeedback] = useState(false);

  const fetchCourse = () => {
    setLoading(true);
    setError(null);
    apiClient.get<CourseDetail>(`/courses/${id}`)
      .then((res) => setCourse(res.data))
      .catch((err) => setError(err.response?.data?.detail?.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCourse(); }, [id]);

  if (loading) return <PageContainer><LoadingState /></PageContainer>;
  if (error || !course) return <PageContainer><ErrorState message={error || '未找到课程'} onRetry={fetchCourse} /></PageContainer>;

  const handleFeedbackSuccess = (feedback: FeedbackOut) => {
    setCourse({ ...course, feedback });
    setEditingFeedback(false);
  };

  return (
    <PageContainer title="课程详情" extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>}>
      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="日期">{formatDate(course.date)}</Descriptions.Item>
          <Descriptions.Item label="时间">{formatTime(course.start_time)} - {formatTime(course.end_time)}</Descriptions.Item>
          <Descriptions.Item label="教师">{course.teacher?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="状态"><CourseStatusTag status={course.status} /></Descriptions.Item>
          {course.meeting_link && (
            <Descriptions.Item label="课堂链接">
              <a href={course.meeting_link} target="_blank" rel="noreferrer"><LinkOutlined /> 进入课堂</a>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title={`学生 (${course.children.length})`} style={{ marginBottom: 16 }}>
        <Space wrap>
          {course.children.map((c) => (
            <Tag key={c.id} color="blue" style={{ padding: '4px 12px', borderRadius: 16 }}>
              {c.name}{c.english_name ? ` (${c.english_name})` : ''}
            </Tag>
          ))}
          {course.children.length === 0 && <Typography.Text type="secondary">无学生信息</Typography.Text>}
        </Space>
      </Card>

      <Card title="课后反馈" extra={course.feedback && !editingFeedback ? <Button size="small" onClick={() => setEditingFeedback(true)}>编辑反馈</Button> : undefined}>
        {editingFeedback ? (
          <FeedbackForm courseId={course.id} initialData={course.feedback} onSuccess={handleFeedbackSuccess} onCancel={() => setEditingFeedback(false)} />
        ) : course.feedback ? (
          <FeedbackCard feedback={course.feedback} />
        ) : (
          <FeedbackForm courseId={course.id} onSuccess={handleFeedbackSuccess} />
        )}
      </Card>
    </PageContainer>
  );
}
