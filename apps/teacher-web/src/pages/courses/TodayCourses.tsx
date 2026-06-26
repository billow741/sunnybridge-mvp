import { useEffect, useState } from 'react';
import { Card, List, Tag, Spin, Badge } from 'antd';
import { ClockCircleOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client, { extractError } from '@/api/client';

export default function TodayCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const { data } = await client.get('/courses/today'); setCourses(Array.isArray(data) ? data : (data.items || [])); }
      catch (err) { console.error(extractError(err)); } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  return (
    <List
      grid={{ gutter: 16, xs: 1, sm: 2, md: 3 }}
      dataSource={courses}
      renderItem={(c: any) => {
        const hasFeedback = !!c.feedback;
        const hasMeetingLink = !!c.meeting_link;
        return (
          <List.Item>
            <Card
              hoverable
              onClick={() => navigate(`/courses/${c.id}`)}
              style={{ borderLeft: `4px solid ${hasFeedback ? '#52c41a' : '#722ed1'}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>
                  <ClockCircleOutlined /> {c.start_time?.slice(0,5)} - {c.end_time?.slice(0,5)}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {hasMeetingLink && (
                    <Tag color="blue" icon={<VideoCameraOutlined />}>已发链接</Tag>
                  )}
                  <Tag color={hasFeedback ? 'green' : 'purple'}>
                    {hasFeedback ? '已完成' : '待上课'}
                  </Tag>
                </div>
              </div>
              <div style={{ fontWeight: 600 }}>{c.students?.map((ch: any) => ch.name).join(', ') || '-'}</div>
              {!hasMeetingLink && !hasFeedback && (
                <div style={{ marginTop: 4, color: '#faad14', fontSize: 12 }}>
                  ⚠️ 未设置会议链接，点击填写
                </div>
              )}
            </Card>
          </List.Item>
        );
      }}
    />
  );
}
