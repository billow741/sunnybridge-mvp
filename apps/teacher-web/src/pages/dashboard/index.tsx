import { useEffect, useState, useMemo } from 'react';
import {
  Card, Row, Col, Statistic, List, Tag, Spin, Input, Button, Table,
  Space, Typography, Dropdown, Badge, Empty, Avatar, Progress,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  SearchOutlined,
  FilterOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BookOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client, { extractError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { useDashboardStore } from '@/store/dashboardStore';

const { Title, Text } = Typography;

/* ─── 统计卡片 ─── */
function StatsCards({ todayCount, weekDone, weekTotal, pending }: {
  todayCount: number; weekDone: number; weekTotal: number; pending: number;
}) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false} style={{ borderRadius: 12 }}>
          <Statistic
            title={<Text type="secondary" style={{ fontSize: 13 }}>今日课程</Text>}
            value={todayCount}
            prefix={<CalendarOutlined style={{ color: '#5CAADF' }} />}
            valueStyle={{ fontWeight: 600, fontSize: 28 }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false} style={{ borderRadius: 12 }}>
          <Statistic
            title={<Text type="secondary" style={{ fontSize: 13 }}>本周已完成</Text>}
            value={weekDone}
            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            suffix={weekTotal > 0 ? <span style={{ fontSize: 14, color: '#94a3b8' }}>/ {weekTotal}</span> : undefined}
            valueStyle={{ fontWeight: 600, fontSize: 28 }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false} style={{ borderRadius: 12 }}>
          <Statistic
            title={<Text type="secondary" style={{ fontSize: 13 }}>待反馈</Text>}
            value={pending}
            prefix={<ExclamationCircleOutlined style={{ color: '#F4A230' }} />}
            valueStyle={{ fontWeight: 600, fontSize: 28 }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false} style={{ borderRadius: 12 }}>
          <Statistic
            title={<Text type="secondary" style={{ fontSize: 13 }}>本周完成率</Text>}
            value={weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0}
            suffix="%"
            prefix={weekTotal > 0 && (weekDone / weekTotal) >= 0.8
              ? <ArrowUpOutlined style={{ color: '#52c41a' }} />
              : <ArrowDownOutlined style={{ color: '#F4A230' }} />}
            valueStyle={{ fontWeight: 600, fontSize: 28 }}
          />
        </Card>
      </Col>
    </Row>
  );
}

/* ─── 今日任务列表 ─── */
function TodaysCourses({ courses }: { courses: any[] }) {
  const navigate = useNavigate();
  const { courseSearchQuery, setCourseSearchQuery, courseStatusFilter, setCourseStatusFilter } = useDashboardStore();

  const filtered = useMemo(() => {
    let result = courses;
    if (courseSearchQuery.trim()) {
      const q = courseSearchQuery.toLowerCase();
      result = result.filter((c: any) =>
        (c.students?.map((ch: any) => ch.name).join(', ') || '').toLowerCase().includes(q)
      );
    }
    if (courseStatusFilter !== 'all') {
      result = result.filter((c: any) =>
        courseStatusFilter === 'done' ? !!c.feedback : !c.feedback
      );
    }
    return result;
  }, [courses, courseSearchQuery, courseStatusFilter]);

  return (
    <Card
      title="今日课程"
      bordered={false}
      style={{ borderRadius: 12 }}
      extra={
        <Space>
          <Input
            placeholder="搜索学生..."
            prefix={<SearchOutlined />}
            size="small"
            style={{ width: 160 }}
            value={courseSearchQuery}
            onChange={(e) => setCourseSearchQuery(e.target.value)}
            allowClear
          />
          <Dropdown
            menu={{
              items: [
                { key: 'all', label: '全部', onClick: () => setCourseStatusFilter('all') },
                { key: 'pending', label: '待上课', onClick: () => setCourseStatusFilter('pending') },
                { key: 'done', label: '已完成', onClick: () => setCourseStatusFilter('done') },
              ],
              selectedKeys: [courseStatusFilter],
            }}
          >
            <Button size="small" icon={<FilterOutlined />}>
              筛选{courseStatusFilter !== 'all' && <Badge color="#5CAADF" style={{ marginLeft: 4 }} />}
            </Button>
          </Dropdown>
        </Space>
      }
    >
      {filtered.length === 0 ? (
        <Empty description="没有匹配的课程" />
      ) : (
        <List
          dataSource={filtered}
          renderItem={(c: any) => (
            <List.Item
              style={{ cursor: 'pointer', padding: '12px 0', borderRadius: 8, paddingLeft: 12, paddingRight: 12 }}
              onClick={() => navigate(`/courses/${c.id}`)}
              actions={[
                <Tag key="status" color={c.feedback ? 'green' : 'purple'}>
                  {c.feedback ? '已完成' : '待上课'}
                </Tag>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    size={40}
                    style={{
                      backgroundColor: c.feedback ? '#f6ffed' : '#f9f0ff',
                      color: c.feedback ? '#52c41a' : '#722ed1',
                    }}
                    icon={c.feedback ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                  />
                }
                title={
                  <span style={{ fontWeight: 600 }}>
                    {c.students?.map((ch: any) => ch.name).join(', ') || '未分配学生'}
                  </span>
                }
                description={
                  <Space size={16}>
                    <span><ClockCircleOutlined /> {c.start_time?.slice(0, 5)} - {c.end_time?.slice(0, 5)}</span>
                    <span><BookOutlined /> 课时: {c.hours ?? 1}</span>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}

/* ─── 课程历史表格 ─── */
function RecentCoursesTable({ courses }: { courses: any[] }) {
  const navigate = useNavigate();
  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: '学生',
      key: 'students',
      render: (_: any, c: any) => c.students?.map((ch: any) => ch.name).join(', ') || '-',
    },
    {
      title: '时间',
      key: 'time',
      width: 120,
      render: (_: any, c: any) => `${c.start_time?.slice(0, 5)} - ${c.end_time?.slice(0, 5)}`,
    },
    {
      title: '课时',
      dataIndex: 'hours',
      key: 'hours',
      width: 80,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, c: any) => (
        <Tag color={c.feedback ? 'green' : 'orange'}>
          {c.feedback ? '已反馈' : '待反馈'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, c: any) => (
        <Button type="link" size="small" onClick={() => navigate(`/courses/${c.id}`)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="最近课程"
      bordered={false}
      style={{ borderRadius: 12 }}
      extra={
        <Button type="link" onClick={() => navigate('/courses')}>
          查看全部 →
        </Button>
      }
    >
      <Table
        dataSource={courses.slice(0, 10)}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: 600 }}
      />
    </Card>
  );
}

/* ─── 主 Dashboard ─── */
export default function Dashboard() {
  const [todayCourses, setTodayCourses] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [todayRes, allRes] = await Promise.all([
          client.get('/courses/today').catch(() => ({ data: [] })),
          client.get('/courses?limit=20').catch(() => ({ data: { items: [] } })),
        ]);
        setTodayCourses(Array.isArray(todayRes.data) ? todayRes.data : (todayRes.data.items || []));
        setAllCourses(allRes.data?.items || Array.isArray(allRes.data) ? (Array.isArray(allRes.data) ? allRes.data : allRes.data.items || []) : []);
      } catch (err) {
        console.error(extractError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  const todayDone = todayCourses.filter((c: any) => c.feedback).length;
  const pendingFeedback = allCourses.filter((c: any) => !c.feedback).length;
  const weekDone = allCourses.filter((c: any) => c.feedback).length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* 欢迎区 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>欢迎回来，{user?.name || user?.username || '老师'} 👋</Title>
          <Text type="secondary">今日 {todayCourses.length} 节课，{pendingFeedback} 条待反馈</Text>
        </div>
        <Space>
          <Button onClick={() => navigate('/today')}>今日课程</Button>
          <Button type="primary" icon={<CalendarOutlined />} onClick={() => navigate('/courses')}>
            全部课程
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <div style={{ marginBottom: 24 }}>
        <StatsCards
          todayCount={todayCourses.length}
          weekDone={weekDone}
          weekTotal={allCourses.length}
          pending={pendingFeedback}
        />
      </div>

      {/* 今日任务 + 数据表格 两栏 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <TodaysCourses courses={todayCourses} />
        </Col>
        <Col xs={24} lg={10}>
          <RecentCoursesTable courses={allCourses} />
        </Col>
      </Row>
    </div>
  );
}
