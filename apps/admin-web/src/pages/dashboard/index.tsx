/**
 * 工作台 — 真实运营首页
 *
 * 设计要点：
 * - 所有提醒按"派生型"实现，不引入独立任务系统
 * - 每条提醒都能直达相关详情或处理动作
 * - 重点：快速判断 + 快速进入处理
 */
import { useEffect, useState } from 'react';
import {
  Row, Col, Card, Statistic, Tag, Button, Typography,
  Spin, Space, Tooltip, Divider,
} from 'antd';
import {
  TeamOutlined, BookOutlined, TrophyOutlined, DollarOutlined, FileTextOutlined,
  AlertOutlined, BellOutlined, ExclamationCircleOutlined,
  ArrowRightOutlined, ClockCircleOutlined, CommentOutlined,
  CheckCircleOutlined, ReloadOutlined, PlusOutlined,
  DollarCircleOutlined, CalendarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';
import type { AlertItem, DashboardSummary } from '@/services/dashboard';
import { getAlerts, getDashboardSummary } from '@/services/dashboard';
import { useEntityDrawerStore } from '@/store/entityDrawerStore';

const { Text, Title } = Typography;

// 提醒类型的图标和颜色映射
const ALERT_STYLES: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  course_pending:    { icon: <BookOutlined />,           color: '#F4A230', bg: '#fffbe6' },
  feedback_missing:  { icon: <CommentOutlined />,        color: '#5CAADF', bg: '#e6f4ff' },
  low_hours:         { icon: <ExclamationCircleOutlined />, color: '#ff4d4f', bg: '#fff2f0' },
  settlement_pending:{ icon: <DollarOutlined />,         color: '#F4A230', bg: '#fffbe6' },
};

const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default function Dashboard() {
  const navigate = useNavigate();
  const openEntity = useEntityDrawerStore(s => s.openEntity);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, teachers: 0, todayCourses: 0, lowHours: [] as any[], monthPayments: 0 });
  const [courses, setCourses] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    pending_courses: 0, missing_feedback: 0, low_hours_count: 0, pending_settlement: 0,
  });
  const [recentStudents, setRecentStudents] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [childrenRes, teachersRes, coursesRes, paymentsRes, alertsData, summaryData] = await Promise.allSettled([
        client.get('/children', { params: { page: 1, page_size: 100 } }),
        client.get('/teachers', { params: { page: 1, page_size: 100 } }),
        client.get('/courses/all', { params: { page: 1, page_size: 100 } }),
        client.get('/payments', { params: { page: 1, page_size: 1 } }),
        getAlerts(),
        getDashboardSummary(),
      ]);

      if (childrenRes.status === 'fulfilled') {
        const items = childrenRes.value.data?.items || [];
        const lowH = items.filter((s: any) => {
          const rem = s.remaining_hours ?? ((s.totalhours ?? 0) - (s.usedhours ?? 0));
          return rem <= 5 && rem > 0;
        });
        setStats(prev => ({ ...prev, students: items.length, lowHours: lowH }));
        setRecentStudents(items.slice(0, 5));
      }

      if (teachersRes.status === 'fulfilled') {
        const items = teachersRes.value.data?.items || [];
        setStats(prev => ({ ...prev, teachers: items.length }));
      }

      if (coursesRes.status === 'fulfilled') {
        const all = coursesRes.value.data?.items || [];
        const today = all.filter((c: any) => dayjs(c.date).isSame(dayjs(), 'day'));
        setCourses(today);
        setStats(prev => ({ ...prev, todayCourses: today.length }));
      }

      if (paymentsRes.status === 'fulfilled') {
        const payStats = paymentsRes.value.data?.stats;
        setStats(prev => ({ ...prev, monthPayments: payStats?.month_amount || 0 }));
      }

      if (alertsData.status === 'fulfilled') setAlerts(alertsData.value);
      if (summaryData.status === 'fulfilled') setSummary(summaryData.value);
    } catch (err) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>;

  // 按严重程度排序提醒
  const sortedAlerts = [...alerts].sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      {/* ── 顶部概览 KPI ── */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card className="sb-card" hoverable onClick={() => navigate('/students')}>
            <Statistic title="学员总数" value={stats.students} prefix={<TeamOutlined />}
              valueStyle={{ color: '#5CAADF' }}
            />
            {summary.low_hours_count > 0 && (
              <div style={{ marginTop: 4 }}>
                <Tag color="error">{summary.low_hours_count} 人课时偏低</Tag>
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card className="sb-card" hoverable onClick={() => navigate('/teachers')}>
            <Statistic title="教师" value={stats.teachers} prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="sb-card" hoverable onClick={() => navigate('/courses')}>
            <Statistic title="今日课程" value={stats.todayCourses} prefix={<BookOutlined />}
              valueStyle={{ color: '#F4A230' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="sb-card" hoverable onClick={() => navigate('/finance/payments')}>
            <Statistic title="本月收款" value={stats.monthPayments} prefix="¥"
              precision={2}
              valueStyle={{ color: '#5CAADF', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── 运营提醒（核心） ── */}
      <Row gutter={16}>
        <Col span={14}>
          <Card className="sb-card"
            title={<span><BellOutlined style={{marginRight:6}}/>运营提醒</span>}
            extra={
              <Button type="text" icon={<ReloadOutlined />} size="small" onClick={load} />
            }
          >
            {sortedAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CheckCircleOutlined style={{ fontSize: 40, color: '#52c41a', marginBottom: 12 }} />
                <br/>
                <Text type="secondary">暂无待处理提醒</Text>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sortedAlerts.map(item => {
                  const style = ALERT_STYLES[item.type] || { icon: <AlertOutlined />, color: '#666', bg: '#fafafa' };
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: style.bg, borderRadius: 8, padding: '12px 16px',
                      borderLeft: `3px solid ${style.color}`,
                    }}>
                      <Space>
                        <span style={{ color: style.color, fontSize: 16 }}>{style.icon}</span>
                        <div>
                          <Text strong>{item.title}</Text><br/>
                          <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                        </div>
                      </Space>
                      {item.action_path && (
                        <Button type="link" icon={<ArrowRightOutlined />}
                          onClick={() => navigate(item.action_path)}>
                          去处理
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        <Col span={10}>
          {/* ── 今日课程 ── */}
          <Card className="sb-card"
            title={<span><BookOutlined style={{marginRight:6}}/>今日课程</span>}
            extra={<Button type="link" size="small" onClick={() => navigate('/courses')}>全部课程 →</Button>}
          >
            {courses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <CalendarOutlined style={{ fontSize: 28, color: '#d9d9d9', marginBottom: 8 }} />
                <br/>
                <Text type="secondary">今日暂无课程</Text>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {courses.map((c: any) => (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', background: '#fafafa', borderRadius: 6, cursor: 'pointer',
                  }}
                  onClick={() => openEntity('course', c.id)}>
                    <Space>
                      <ClockCircleOutlined style={{ color: '#5CAADF' }} />
                      <div>
                        <Text strong style={{ fontSize: 13 }}>
                          {c.start_time?.slice(0,5)} - {c.end_time?.slice(0,5)}
                        </Text>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {(c.teacher?.name || c.teachers?.name || '—')} · {(c.students?.[0]?.name || '—')}
                          </Text>
                        </div>
                      </div>
                    </Space>
                    <Tag color={c.status === 'completed' ? 'green' : c.status === 'cancelled' ? 'red' : 'orange'}>
                      {c.status === 'completed' ? '已完成' : c.status === 'cancelled' ? '已取消' : '待上课'}
                    </Tag>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── 最近学员（快速入口） ── */}
          <Card className="sb-card" style={{ marginTop: 16 }}
            title={<span><TeamOutlined style={{marginRight:6}}/>最近学员</span>}
            extra={<Button type="link" size="small" onClick={() => navigate('/students')}>全部 →</Button>}
          >
            {recentStudents.length === 0 ? (
              <Text type="secondary">暂无学员</Text>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentStudents.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                  }}
                  onClick={() => openEntity('student', s.id)}
                  >
                    <Text style={{ fontSize: 13 }}>{s.name}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {(((s.remaining_hours ?? (s.totalhours ?? 0)) - (s.usedhours ?? 0))).toFixed(1)}h
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── 快捷操作 ── */}
          <Card className="sb-card" style={{ marginTop: 16 }} title="快捷操作">
            <Space wrap>
              <Button icon={<CheckCircleOutlined />} onClick={() => navigate('/courses')}>确认课程</Button>
              <Button icon={<PlusOutlined />} onClick={() => navigate('/finance/payments')}>添加收款</Button>
              <Button icon={<DollarCircleOutlined />} onClick={() => navigate('/finance/settlements')}>教师结算</Button>
              <Button icon={<TeamOutlined />} onClick={() => navigate('/students')}>学员管理</Button>
              <Button icon={<BookOutlined />} onClick={() => navigate('/courses')}>课程排期</Button>
              <Button icon={<FileTextOutlined />} onClick={() => navigate('/content')}>内容管理</Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
