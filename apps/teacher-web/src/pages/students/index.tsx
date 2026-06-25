import { useEffect, useState, useMemo } from 'react';
import { Card, Table, Input, Tag, Spin, Drawer, Descriptions, Space, Typography } from 'antd';
import { SearchOutlined, TeamOutlined, PhoneOutlined, BookOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

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
          <UserOutlined style={{ color: '#5CAADF' }} />
          <span style={{ fontWeight: 600 }}>{s.name}</span>
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
      render: (h: number) => h || 0,
    },
    {
      title: '家长电话',
      dataIndex: 'parent_phone',
      key: 'parent_phone',
      width: 140,
      render: (phone: string) => phone || '-',
    },
    {
      title: '最近上课',
      dataIndex: 'last_course_date',
      key: 'last_course_date',
      width: 120,
      render: (d: string) => d || '-',
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
            onClick: () => { setSelected(record); setDrawerOpen(true); },
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <Drawer
        title={selected?.name || '学员详情'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={400}
      >
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="姓名">{selected.name}</Descriptions.Item>
            <Descriptions.Item label="级别">
              <Tag color={CEFR_COLORS[selected.cefr_level] || 'default'}>
                {selected.cefr_level?.toUpperCase() || 'STARTER'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="累计课时">{selected.total_hours || 0}</Descriptions.Item>
            <Descriptions.Item label="家长电话">{selected.parent_phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="最近上课">{selected.last_course_date || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
