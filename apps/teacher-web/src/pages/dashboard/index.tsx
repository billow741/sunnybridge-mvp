import { useEffect, useState, useMemo } from 'react';
import {
  Card, Row, Col, Statistic, Tag, Spin, Input, Button, Table,
  Space, Typography, Dropdown, Badge, Empty, Modal, Form,
} from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined,
  UserOutlined, BookOutlined, SearchOutlined, FilterOutlined,
  ArrowUpOutlined, ArrowDownOutlined, ExclamationCircleOutlined,
  VideoCameraOutlined, LinkOutlined, EditOutlined, HistoryOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client, { extractError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { useDashboardStore } from '@/store/dashboardStore';

const { Title, Text } = Typography;

/* ── 状态样式 ── */
const STATUS_TAG: Record<string, { bg: string; text: string; label: string }> = {
  scheduled:   { bg: '#fff7ed', text: '#c2410c', label: '待上课' },
  in_progress: { bg: '#eff6ff', text: '#1d4ed8', label: '进行中' },
  completed:   { bg: '#f0fdf4', text: '#16a34a', label: '已完成' },
  absent:      { bg: '#fef2f2', text: '#dc2626', label: '学生缺席' },
  cancelled:   { bg: '#f9fafb', text: '#6b7280', label: '已取消' },
};

/* ── 统计卡片 ── */
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
            prefix={<CalendarOutlined style={{ color: '#722ed1' }} />}
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

/* ── 今日课程: 卡片网格 ── */
function TodayCardGrid({ courses, onOpenFeedback, onEditLink }: {
  courses: any[];
  onOpenFeedback: (idx: number) => void;
  onEditLink: (idx: number) => void;
}) {
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
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <VideoCameraOutlined style={{ color: '#722ed1', fontSize: 20 }} />
          <span style={{ fontSize: 17, fontWeight: 600, color: '#1f2937' }}>
            今日课程 ({courses.length})
          </span>
        </div>
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
              筛选{courseStatusFilter !== 'all' && <Badge color="#722ed1" style={{ marginLeft: 4 }} />}
            </Button>
          </Dropdown>
        </Space>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', background: '#fff', borderRadius: 12 }}>
          今天没有排课
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map((c: any, idx: number) => {
            const hasFeedback = !!c.feedback;
            const hasLink = !!c.meeting_link;
            const statusKey = hasFeedback ? 'completed' : (c.status || 'scheduled');
            const s = STATUS_TAG[statusKey] || STATUS_TAG.scheduled;

            return (
              <div
                key={c.id}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: `4px solid ${hasFeedback ? '#22c55e' : '#722ed1'}`,
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/courses/${c.id}`)}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'none'; }}
              >
                {/* 时间 + 状态 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ClockCircleOutlined style={{ color: '#9ca3af', fontSize: 14 }} />
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{c.start_time?.slice(0,5)} - {c.end_time?.slice(0,5)}</span>
                  </div>
                  <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 12, background: s.bg, color: s.text, fontWeight: 500 }}>
                    {s.label}
                  </span>
                </div>

                {/* 学生 + 科目 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UserOutlined style={{ color: '#9ca3af', fontSize: 14 }} />
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{c.students?.map((ch: any) => ch.name).join(', ') || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BookOutlined style={{ color: '#9ca3af', fontSize: 14 }} />
                    <span style={{ color: '#6b7280', fontSize: 14 }}>English</span>
                  </div>
                </div>

                {/* 会议链接指示 */}
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {hasLink ? (
                    <span style={{ fontSize: 12, color: '#722ed1', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <LinkOutlined /> 会议链接已设置
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#d1d5db' }}>未设置会议链接</span>
                  )}
                  {hasFeedback ? (
                    <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>已提交反馈</span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#F4A230', fontWeight: 500 }}>待提交反馈</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── 最近课程: 表格 ── */
function RecentCoursesTable({ courses }: { courses: any[] }) {
  const navigate = useNavigate();
  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
    { title: '学生', key: 'students', render: (_: any, c: any) => c.students?.map((ch: any) => ch.name).join(', ') || '-' },
    { title: '时间', key: 'time', width: 110, render: (_: any, c: any) => `${c.start_time?.slice(0,5)}-${c.end_time?.slice(0,5)}` },
    { title: '课时', dataIndex: 'hours', key: 'hours', width: 60, render: (v: number) => v ?? 1 },
    {
      title: '状态', key: 'status', width: 90,
      render: (_: any, c: any) => {
        const s = STATUS_TAG[c.feedback ? 'completed' : (c.status || 'scheduled')] || STATUS_TAG.scheduled;
        return <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: s.bg, color: s.text }}>{s.label}</span>;
      },
    },
    {
      title: '反馈', key: 'feedback', width: 70,
      render: (_: any, c: any) => (
        <Button type="link" size="small" onClick={() => navigate(`/courses/${c.id}`)}>查看</Button>
      ),
    },
  ];

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HistoryOutlined style={{ color: '#6b7280', fontSize: 18 }} />
          <span style={{ fontSize: 17, fontWeight: 600, color: '#1f2937' }}>最近课程</span>
        </div>
        <Button type="link" onClick={() => navigate('/courses')} style={{ padding: 0 }}>查看全部 →</Button>
      </div>
      <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 12, overflow: 'hidden' }}>
        <Table
          dataSource={courses.slice(0, 10)}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          onRow={(r) => ({ onClick: () => navigate(`/courses/${r.id}`), style: { cursor: 'pointer' } })}
        />
      </Card>
    </section>
  );
}

/* ── 主 Dashboard ── */
export default function Dashboard() {
  const [todayCourses, setTodayCourses] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // 反馈弹窗
  const [fbModal, setFbModal] = useState<{ open: boolean; courseIndex: number }>({ open: false, courseIndex: -1 });
  const [fbForm] = Form.useForm();
  const [fbSubmitting, setFbSubmitting] = useState(false);

  // 会议链接弹窗
  const [linkModal, setLinkModal] = useState<{ open: boolean; courseIndex: number; value: string; saving: boolean }>({
    open: false, courseIndex: -1, value: '', saving: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const [todayRes, allRes] = await Promise.all([
          client.get('/courses/today').catch(() => ({ data: [] })),
          client.get('/courses/all/teacher', { params: { page_size: 20 } }).catch(() => ({ data: { items: [] } })),
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
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* 欢迎区 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>欢迎回来，{user?.name || user?.username || '老师'} 👋</Title>
          <Text type="secondary">今日 {todayCourses.length} 节课，{pendingFeedback} 条待反馈</Text>
        </div>
        <Space>
          <Button onClick={() => navigate('/today')}>今日课程</Button>
          <Button type="primary" icon={<CalendarOutlined />} onClick={() => navigate('/courses')} style={{ background: '#722ed1', borderColor: '#722ed1' }}>
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

      {/* 今日课程卡片 */}
      <div style={{ marginBottom: 28 }}>
        <TodayCardGrid courses={todayCourses} onOpenFeedback={() => {}} onEditLink={() => {}} />
      </div>

      {/* 最近课程表格 */}
      <RecentCoursesTable courses={allCourses} />
    </div>
  );
}
