import { useEffect, useState, useMemo } from 'react';
import {
  Card, Row, Col, Statistic, Tag, Spin, Input, Button,
  Space, Typography, Dropdown, Badge, Empty, Modal, Form,
} from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined,
  UserOutlined, BookOutlined, SearchOutlined, FilterOutlined,
  ArrowUpOutlined, ArrowDownOutlined, ExclamationCircleOutlined,
  VideoCameraOutlined, LinkOutlined, EditOutlined, HistoryOutlined,
  ThunderboltOutlined,
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
};

/* ── 统计卡片 ── */
function StatsCards({ todayCount, weekDone, weekTotal, pending, weekHours, monthHours }: {
  todayCount: number; weekDone: number; weekTotal: number; pending: number;
  weekHours: number; monthHours: number;
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

/* ── 课时统计卡 ── */
function HoursStats({ weekHours, monthHours, totalCourses }: {
  weekHours: number; monthHours: number; totalCourses: number;
}) {
  return (
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col xs={24} sm={8}>
        <Card bordered={false} style={{ borderRadius: 12, borderTop: '3px solid #722ed1' }}>
          <Statistic
            title={<Text type="secondary" style={{ fontSize: 13 }}>本周课时</Text>}
            value={weekHours}
            prefix={<ClockCircleOutlined style={{ color: '#722ed1' }} />}
            suffix="h"
            valueStyle={{ fontWeight: 600, fontSize: 24, color: '#722ed1' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card bordered={false} style={{ borderRadius: 12, borderTop: '3px solid #5CAADF' }}>
          <Statistic
            title={<Text type="secondary" style={{ fontSize: 13 }}>本月课时</Text>}
            value={monthHours}
            prefix={<ClockCircleOutlined style={{ color: '#5CAADF' }} />}
            suffix="h"
            valueStyle={{ fontWeight: 600, fontSize: 24, color: '#5CAADF' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card bordered={false} style={{ borderRadius: 12, borderTop: '3px solid #22c55e' }}>
          <Statistic
            title={<Text type="secondary" style={{ fontSize: 13 }}>全部课程</Text>}
            value={totalCourses}
            prefix={<BookOutlined style={{ color: '#22c55e' }} />}
            suffix="节"
            valueStyle={{ fontWeight: 600, fontSize: 24, color: '#22c55e' }}
          />
        </Card>
      </Col>
    </Row>
  );
}

/* ── 今日课程: 卡片网格 ── */
function TodayCardGrid({ courses }: { courses: any[] }) {
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
          {filtered.map((c: any) => {
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ClockCircleOutlined style={{ color: '#9ca3af', fontSize: 14 }} />
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{c.start_time?.slice(0,5)} - {c.end_time?.slice(0,5)}</span>
                  </div>
                  <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 12, background: s.bg, color: s.text, fontWeight: 500 }}>
                    {s.label}
                  </span>
                </div>
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

/* ── 课程行 ── */
function CourseRow({ c, onClick }: { c: any; onClick: () => void }) {
  const hasFeedback = !!c.feedback;
  const statusKey = hasFeedback ? 'completed' : (c.status || 'scheduled');
  const s = STATUS_TAG[statusKey] || STATUS_TAG.scheduled;
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#fafafa'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: hasFeedback ? '#f0fdf4' : '#faf5ff',
        }}>
          <ClockCircleOutlined style={{ color: hasFeedback ? '#16a34a' : '#722ed1', fontSize: 14 }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 14, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.students?.map((ch: any) => ch.name).join(', ') || '-'}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            {c.date} · {c.start_time?.slice(0,5)}-{c.end_time?.slice(0,5)}
          </div>
        </div>
      </div>
      <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 12, background: s.bg, color: s.text, fontWeight: 500, flexShrink: 0 }}>
        {s.label}
      </span>
    </div>
  );
}

/* ── 最近课程: 左右两栏 ── */
function RecentCoursesSplit({ courses }: { courses: any[] }) {
  const navigate = useNavigate();
  const upcoming = courses.filter((c: any) => !c.feedback);
  const completed = courses.filter((c: any) => !!c.feedback);

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HistoryOutlined style={{ color: '#6b7280', fontSize: 18 }} />
          <span style={{ fontSize: 17, fontWeight: 600, color: '#1f2937' }}>最近课程</span>
        </div>
        <Button type="link" onClick={() => navigate('/courses')} style={{ padding: 0 }}>查看全部 →</Button>
      </div>

      <Row gutter={16}>
        {/* 左栏: 即将上课 */}
        <Col xs={24} md={12}>
          <div style={{
            background: '#fff', borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            borderTop: '3px solid #722ed1',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6' }}>
              <ThunderboltOutlined style={{ color: '#722ed1', fontSize: 16 }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1f2937' }}>即将上课</span>
              <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>({upcoming.length})</span>
            </div>
            <div style={{ padding: '0 16px', maxHeight: 320, overflowY: 'auto' }}>
              {upcoming.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#d1d5db', fontSize: 13 }}>暂无即将上课</div>
              ) : (
                upcoming.slice(0, 8).map((c: any) => (
                  <CourseRow key={c.id} c={c} onClick={() => navigate(`/courses/${c.id}`)} />
                ))
              )}
            </div>
          </div>
        </Col>

        {/* 右栏: 已完成 */}
        <Col xs={24} md={12}>
          <div style={{
            background: '#fff', borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            borderTop: '3px solid #22c55e',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6' }}>
              <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 16 }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1f2937' }}>已完成</span>
              <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>({completed.length})</span>
            </div>
            <div style={{ padding: '0 16px', maxHeight: 320, overflowY: 'auto' }}>
              {completed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#d1d5db', fontSize: 13 }}>暂无已完成</div>
              ) : (
                completed.slice(0, 8).map((c: any) => (
                  <CourseRow key={c.id} c={c} onClick={() => navigate(`/courses/${c.id}`)} />
                ))
              )}
            </div>
          </div>
        </Col>
      </Row>
    </section>
  );
}

/* ── 主 Dashboard ── */
export default function Dashboard() {
  const [todayCourses, setTodayCourses] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [allCoursesTotal, setAllCoursesTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [todayRes, allRes] = await Promise.all([
          client.get('/courses/today').catch(() => ({ data: [] })),
          client.get('/courses/all/teacher', { params: { page_size: 20 } }).catch(() => ({ data: { items: [], total: 0 } })),
        ]);
        setTodayCourses(Array.isArray(todayRes.data) ? todayRes.data : (todayRes.data.items || []));
        const items = allRes.data?.items || (Array.isArray(allRes.data) ? allRes.data : allRes.data.items || []);
        setAllCourses(items);
        setAllCoursesTotal(allRes.data?.total || items.length);
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

  // 本周/本月课时计算
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekHours = allCourses.filter((c: any) => new Date(c.date + 'T00:00:00') >= weekStart).reduce((s: number, c: any) => s + (c.hours || 1), 0);
  const monthHours = allCourses.filter((c: any) => new Date(c.date + 'T00:00:00') >= monthStart).reduce((s: number, c: any) => s + (c.hours || 1), 0);

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
      <div style={{ marginBottom: 8 }}>
        <StatsCards
          todayCount={todayCourses.length}
          weekDone={weekDone}
          weekTotal={allCourses.length}
          pending={pendingFeedback}
          weekHours={weekHours}
          monthHours={monthHours}
        />
      </div>

      {/* 课时统计面板 */}
      <HoursStats weekHours={weekHours} monthHours={monthHours} totalCourses={allCoursesTotal} />

      {/* 今日课程卡片 */}
      <div style={{ marginBottom: 28, marginTop: 24 }}>
        <TodayCardGrid courses={todayCourses} />
      </div>

      {/* 最近课程: 即将上课 + 已完成 并排 */}
      <RecentCoursesSplit courses={allCourses} />
    </div>
  );
}
