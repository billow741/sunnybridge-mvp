import { useEffect, useState } from 'react';
import { Card, List, Tag, Spin, Typography, Button } from 'antd';
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';

export default function Dashboard() {
  const navigate = useNavigate();
  const [todayCourses, setTodayCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/courses/today');
        setTodayCourses(Array.isArray(data) ? data : (data.items || []));
      } catch (err) { console.error(extractError(err)); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  return (
    <div>
      <Typography.Title level={4}>今日课程</Typography.Title>
      {todayCourses.length === 0 ? (
        <Card><div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>今天没有课程安排 🎉</div></Card>
      ) : (
        <List grid={{ gutter: 16, xs: 1, sm: 2, md: 3 }} dataSource={todayCourses} renderItem={(c: any) => (
          <List.Item>
            <Card hoverable onClick={() => navigate(`/courses/${c.id}`)} style={{ borderLeft: `4px solid ${c.feedback ? '#52c41a' : '#722ed1'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span><ClockCircleOutlined /> {c.start_time?.slice(0,5)} - {c.end_time?.slice(0,5)}</span>
                <Tag color={c.feedback ? 'green' : 'purple'}>{c.feedback ? '已完成' : '待上课'}</Tag>
              </div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{c.children?.map((ch: any) => ch.name).join(', ') || '未分配'}</div>
              <div style={{ color: '#64748b', marginTop: 4 }}>课时: {c.hours ?? 1}</div>
            </Card>
          </List.Item>
        )} />
      )}
    </div>
  );
}
