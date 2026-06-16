import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import CourseStatusTag from '../../components/CourseStatusTag';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import apiClient from '../../api/client';
import type { CourseOut } from '../../types';
import { formatTime } from '../../utils/dayjs';

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

  const columns = [
    { title: '时间', key: 'time', render: (_: unknown, r: CourseOut) => `${formatTime(r.start_time)} - ${formatTime(r.end_time)}` },
    { title: '学生', key: 'children', render: (_: unknown, r: CourseOut) => r.children.map((c) => c.name).join('、') || '—' },
    { title: '状态', key: 'status', render: (_: unknown, r: CourseOut) => <CourseStatusTag status={r.status} /> },
    {
      title: '反馈', key: 'feedback',
      render: (_: unknown, r: CourseOut) => {
        // We don't have feedback info in CourseOut, will check on detail page
        return r.status === 'completed' ? <Tag color="orange">待填写</Tag> : <Tag>—</Tag>;
      },
    },
    {
      title: '操作', key: 'actions',
      render: (_: unknown, r: CourseOut) => (
        <Space>
          <a onClick={() => navigate(`/courses/${r.id}`)}>查看详情</a>
          {r.meeting_link && <Button type="link" size="small" href={r.meeting_link} target="_blank">进入课堂</Button>}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="今日课程安排">
      {courses.length === 0 ? (
        <EmptyState title="今天没有课程安排 🌤️" />
      ) : (
        <Table dataSource={courses} columns={columns} rowKey="id" pagination={false} />
      )}
    </PageContainer>
  );
}
