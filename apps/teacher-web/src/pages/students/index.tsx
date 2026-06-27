import { useEffect, useState, useMemo } from 'react';
import { Card, Table, Input, Tag, Spin, Typography, Space } from 'antd';
import { SearchOutlined, TeamOutlined, UserOutlined, PhoneOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client, { extractError } from '@/api/client';

const { Title, Text } = Typography;

const CEFR_COLORS: Record<string, string> = {
  starter: 'default',
  A1: 'blue',
  A2: 'cyan',
  B1: 'green',
  B2: 'lime',
  C1: 'orange',
  C2: 'red',
};

export default function MyStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await client.get('/courses/teacher/me/students');
        setStudents(res.data || []);
      } catch (err) {
        console.error(extractError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter((s: any) =>
      s.name?.toLowerCase().includes(q) ||
      s.cefr_level?.toLowerCase().includes(q) ||
      s.parent_phone?.includes(q)
    );
  }, [students, search]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  const totalHours = students.reduce((sum: number, s: any) => sum + (s.total_hours || 0), 0);

  const columns = [
    {
      title: '学员',
      key: 'name',
      render: (_: any, s: any) => (
        <Space>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#eff6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserOutlined style={{ color: '#5CAADF', fontSize: 14 }} />
          </div>
          <span style={{ fontWeight: 600, color: '#1f2937' }}>{s.name}</span>
        </Space>
      ),
    },
    {
      title: '级别',
      dataIndex: 'cefr_level',
      key: 'cefr_level',
      width: 90,
      render: (level: string) => (
        <Tag color={CEFR_COLORS[level] || 'default'}>{level?.toUpperCase() || 'STARTER'}</Tag>
      ),
    },
    {
      title: '累计课时',
      dataIndex: 'total_hours',
      key: 'total_hours',
      width: 100,
      render: (h: number) => <span style={{ fontWeight: 500 }}>{h || 0}</span>,
    },
    {
      title: '家长电话',
      dataIndex: 'parent_phone',
      key: 'parent_phone',
      width: 140,
      render: (phone: string) => (
        <Space size={4}>
          <PhoneOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
          <span>{phone || '-'}</span>
        </Space>
      ),
    },
    {
      title: '最近上课',
      dataIndex: 'last_course_date',
      key: 'last_course_date',
      width: 120,
      render: (d: string) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
          <span>{d || '-'}</span>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 4 }}>我的学员</Title>
        <Text type="secondary">
          共 {students.length} 名学员，累计 {totalHours} 课时
        </Text>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Input
            placeholder="搜索学员姓名/级别/家长电话..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </div>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="middle"
          pagination={false}
          onRow={(record) => ({
            onClick: () => navigate(`/students/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  );
}
