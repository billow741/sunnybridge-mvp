import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  DatePicker,
  Button,
  Spin,
  Tag,
  Typography,
  Empty,
  Space,
} from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import client, { extractError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

const { Title } = Typography;

interface Course {
  id: string;
  name: string;
  cefr_level: string;
  teacher_name: string;
  duration_minutes: number;
  date: string;
  feedback_status?: string;
}

export default function CourseList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const childId = user?.childId || user?.child_id;

  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const fetchCourses = async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { child_id: String(childId) };
      if (dateRange?.[0]) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
      }
      if (dateRange?.[1]) {
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      const res = await client.get('/courses/history', { params });
      setCourses(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [childId]);

  const handleFilter = () => {
    fetchCourses();
  };

  const getFeedbackTag = (status?: string) => {
    switch (status) {
      case 'completed':
        return <Tag color="success">已反馈</Tag>;
      case 'pending':
        return <Tag color="warning">待反馈</Tag>;
      default:
        return <Tag>未反馈</Tag>;
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 顶部标题 + 筛选区 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          课程记录
        </Title>
        <Space>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
            placeholder={['开始日期', '结束日期']}
          />
          <Button type="primary" icon={<FilterOutlined />} onClick={handleFilter}>
            筛选
          </Button>
        </Space>
      </div>

      {/* 课程列表 */}
      <Spin spinning={loading}>
        {courses.length === 0 ? (
          <Empty description="暂无课程记录" />
        ) : (
          <Space direction="vertical" size={16} style={{ display: 'flex' }}>
            {courses.map((course) => {
              const courseDate = dayjs(course.date);
              return (
                <Card
                  key={course.id}
                  hoverable
                  onClick={() => navigate(`/courses/${course.id}`)}
                  bodyStyle={{ padding: 16 }}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* 日期方块 */}
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        backgroundColor: '#F4A230',
                        borderRadius: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 12, lineHeight: 1 }}>
                        {courseDate.format('MM')}
                      </span>
                      <span style={{ fontSize: 18, fontWeight: 'bold', lineHeight: 1 }}>
                        {courseDate.format('DD')}
                      </span>
                    </div>

                    {/* 课程信息 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 500 }}>{course.name}</span>
                        <Tag color="#5CAADF">{course.cefr_level}</Tag>
                      </div>
                      <div style={{ color: '#666', fontSize: 14 }}>
                        教师：{course.teacher_name}
                      </div>
                    </div>

                    {/* 课时 + 反馈状态 */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, marginBottom: 4 }}>
                        {course.duration_minutes} 分钟
                      </div>
                      {getFeedbackTag(course.feedback_status)}
                    </div>
                  </div>
                </Card>
              );
            })}
          </Space>
        )}
      </Spin>
    </div>
  );
}
