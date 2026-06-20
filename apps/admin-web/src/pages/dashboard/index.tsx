import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, List, Button, Typography, Spin } from 'antd';
import { UserAddOutlined, BookOutlined, TeamOutlined, DollarOutlined, AlertOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, teachers: 0, todayCourses: 0, lowHours: [] as any[] });
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [childrenRes, teachersRes, coursesRes] = await Promise.all([
          client.get('/children', { params: { page: 1, page_size: 200 } }),
          client.get('/teachers', { params: { page: 1, page_size: 200 } }),
          client.get('/courses/today'),
        ]);
        const children = childrenRes.data.items || childrenRes.data;
        const teachers = teachersRes.data.items || teachersRes.data;
        const todayCourses = Array.isArray(coursesRes.data) ? coursesRes.data : (coursesRes.data.items || []);
        const lowHours = (Array.isArray(children) ? children : []).filter((c: any) => (c.remaining_hours ?? (c.totalhours - c.usedhours)) < 5);
        setStats({ students: Array.isArray(children) ? children.length : (childrenRes.data.total || 0), teachers: Array.isArray(teachers) ? teachers.length : (teachersRes.data.total || 0), todayCourses: todayCourses.length, lowHours });
        setCourses(todayCourses);
      } catch (err) { console.error(extractError(err)); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  const statCards = [
    { title: '今日课程', value: stats.todayCourses, icon: <CalendarOutlined />, color: '#5CAADF' },
    { title: '学生总数', value: stats.students, icon: <TeamOutlined />, color: '#5CAADF' },
    { title: '教师总数', value: stats.teachers, icon: <BookOutlined />, color: '#F4A230' },
  ];

  return (
    <div>
      <Typography.Title level={4}>仪表盘</Typography.Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {statCards.map((s) => (
          <Col span={8} key={s.title}>
            <Card><Statistic title={s.title} value={s.value} prefix={<span style={{ color: s.color }}>{s.icon}</span>} /></Card>
          </Col>
        ))}
      </Row>

      {stats.lowHours.length > 0 && (
        <Card title={<span><AlertOutlined style={{ color: '#F4A230' }} /> 课时预警</span>} style={{ marginBottom: 24 }}>
          <List size="small" dataSource={stats.lowHours} renderItem={(c: any) => (
            <List.Item actions={[<Button type="link" size="small" onClick={() => navigate(`/students/${c.id}`)}>查看</Button>]}>
              <List.Item.Meta title={c.name} description={`剩余 ${c.remaining_hours ?? (c.totalhours - c.usedhours)} 课时`} />
            </List.Item>
          )} />
        </Card>
      )}

      <Card title="今日课程">
        <Table dataSource={courses} rowKey="id" pagination={false} size="small"
          columns={[
            { title: '时间', render: (_: any, r: any) => `${r.start_time?.slice(0,5) || ''} - ${r.end_time?.slice(0,5) || ''}` },
            { title: '学生', render: (_: any, r: any) => r.children?.map((c: any) => c.name).join(', ') || '-' },
            { title: '教师', dataIndex: ['teacher', 'name'], defaultFilteredValue: undefined },
            { title: '课时', dataIndex: 'hours', render: (v: number) => v ?? 1 },
          ]}
        />
      </Card>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <Button type="primary" onClick={() => navigate('/students')}>添加学生</Button>
        <Button onClick={() => navigate('/payments')}>添加收款</Button>
      </div>
    </div>
  );
}
