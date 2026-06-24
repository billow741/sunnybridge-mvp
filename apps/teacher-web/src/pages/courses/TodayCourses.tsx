import { useEffect, useState } from 'react';
import { Card, List, Tag, Spin } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
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
    <List grid={{ gutter: 16, xs: 1, sm: 2, md: 3 }} dataSource={courses} renderItem={(c: any) => (
      <List.Item>
        <Card hoverable onClick={() => navigate(`/courses/${c.id}`)} style={{ borderLeft: `4px solid ${c.feedback ? '#52c41a' : '#722ed1'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span><ClockCircleOutlined /> {c.start_time?.slice(0,5)} - {c.end_time?.slice(0,5)}</span>
            <Tag color={c.feedback ? 'green' : 'purple'}>{c.feedback ? '已完成' : '待上课'}</Tag>
          </div>
          <div style={{ fontWeight: 600 }}>{c.students?.map((ch: any) => ch.name).join(', ') || '-'}</div>
        </Card>
      </List.Item>
    )} />
  );
}
