import { useEffect, useState } from 'react';
import { List, Tag, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import client, { extractError } from '@/api/client';

export default function CourseList() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/courses/history');
        setCourses(Array.isArray(data) ? data : (data.items || []));
      } catch (err) { console.error(extractError(err)); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16 }}>课程记录</div>
      <List dataSource={courses} renderItem={(c: any) => (
        <List.Item extra={<Tag color={c.feedback ? 'green' : 'default'}>{c.feedback ? '有反馈' : '待反馈'}</Tag>}
          onClick={() => navigate(`/courses/${c.id}`)} style={{ cursor: 'pointer', background: '#fff', borderRadius: 8, marginBottom: 8, padding: '12px 16px' }}>
          <List.Item.Meta
            title={`${c.date} ${c.start_time?.slice(0,5)} - ${c.end_time?.slice(0,5)}`}
            description={<><span>教师: {c.teacher?.name || '-'}</span><span style={{ marginLeft: 12 }}>课时: {c.hours ?? 1}</span></>}
          />
        </List.Item>
      )} />
    </div>
  );
}
