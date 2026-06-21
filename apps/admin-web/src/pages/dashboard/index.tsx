/**
 * 工作台 — 运营提醒 + KPI + 快捷操作
 *
 * 设计要点：
 * - 待办按"运营提醒"设计，不是独立任务系统
 * - 派生提醒：今日待确认课程 / 待补反馈 / 低课时预警 / 待结算教师
 * - 不做数据大屏，是运营任务启动器
 * - 每个元素导向具体动作
 */
import { useEffect, useState } from 'react';
import {
  Row, Col, Card, Statistic, Table, Tag, Button, Typography,
  Spin, Badge, Progress, Space, Alert, message,
} from 'antd';
import {
  TeamOutlined, BookOutlined, TrophyOutlined, DollarOutlined,
  AlertOutlined, BellOutlined, ExclamationCircleOutlined,
  ArrowRightOutlined, ClockCircleOutlined, CommentOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';
import type { AlertItem, DashboardSummary } from '@/services/dashboard';
import { getAlerts, getDashboardSummary } from '@/services/dashboard';

const { Text, Title } = Typography;

// 提醒类型的图标和颜色映射
const ALERT_STYLES: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  course_pending:   { icon: <BookOutlined />,         color: '#F4A230', bg: '#fffbe6' },
  feedback_missing: { icon: <CommentOutlined />,       color: '#5CAADF', bg: '#e6f4ff' },
  low_hours:        { icon: <ExclamationCircleOutlined />, color: '#ff4d4f', bg: '#fff2f0' },
  settlement_pending: { icon: <DollarOutlined />,      color: '#F4A230', bg: '#fffbe6' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, teachers: 0, todayCourses: 0, lowHours: [] as any[] });
  const [courses, setCourses] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    pending_courses: 0, missing_feedback: 0, low_hours_count: 0, pending_settlement: 0,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 并行加载
        const [childrenRes, teachersRes, coursesRes, alertsData, summaryData] = await Promise.allSettled([
          client.get('/children', { params: { page: 1, page_size: 500 } }),
          client.get('/teachers', { params: { page: 1, page_size: 100 } }),
          client.get('/courses/all', { params: { page: 1, page_size: 100 } }),
          getAlerts(),
          getDashboardSummary(),
        ]);

        // 学员统计
        if (childrenRes.status === 'fulfilled') {
          const items = childrenRes.value.data?.items || [];
          const lowH = items.filter((s: any) => {
            const rem = s.remaining_hours ?? ((s.totalhours ?? 0) - (s.usedhours ?? 0));
            return rem <= 5;
          });
          setStats(prev => ({
            ...prev,
            students: items.length,
            lowHours: lowH,
          }));
        }

        // 教师统计
        if (teachersRes.status === 'fulfilled') {
          const items = teachersRes.value.data?.items || [];
          setStats(prev => ({ ...prev, teachers: items.length }));
        }

        // 今日课程
        if (coursesRes.status === 'fulfilled') {
          const all = coursesRes.value.data?.items || [];
          const today = all.filter((c: any) => dayjs(c.date).isSame(dayjs(), 'day'));
          setCourses(today);
          setStats(prev => ({ ...prev, todayCourses: today.length }));
        }

        if (alertsData.status === 'fulfilled') setAlerts(alertsData.value);
        if (summaryData.status === 'fulfilled') setSummary(summaryData.value);
      } catch (err) {
        message.error(extractError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>;

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      {/* ── 顶部概览 KPI ── */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card className="sb-card" hoverable onClick={() => navigate('/students')}>
            <Statistic title="学员总数" value={stats.students} prefix={<TeamOutlined />}
              valueStyle={{ color: '#5CAADF' }}
            />
            {stats.lowHours.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <Tag color="error">{stats.lowHours.length} 人课时偏低</Tag>
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
          <Card className="sb-card" hoverable onClick={() => navigate('/finance/settlements')}>
            <Statistic title="待结算" value={summary.pending_settlement} prefix="₱"
              suffix="笔" valueStyle={{ color: '#F4A230', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── 运营提醒（核心） ── */}
      <Row gutter={16}>
        <Col span={14}>
          <Card className="sb-card"
            title={<span><BellOutlined style={{marginRight:6}}/>运营提醒</span>}
            extra={<Text type="secondary">派生自业务数据</Text>}
          >
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CheckCircleOutlined style={{ fontSize: 40, color: '#52c41a', marginBottom: 12 }} />
                <br/>
                <Text type="secondary">暂无待处理提醒</Text>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {alerts.map(item => {
                  const style = ALERT_STYLES[item.type] || { icon: <AlertOutlined />, color: '#666', bg: '#fafafa' };
                  const severityRank = item.severity === 'high' ? 0 : item.severity === 'medium' ? 1 : 2;
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
                          onClick={() => navigate(item.action_path!)}>
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

        {/* ── 今日课程 ── */}
        <Col span={10}>
          <Card className="sb-card"
            title={<span><BookOutlined style={{marginRight:6}}/>今日课程</span>}
            extra={<Button type="link" size="small" onClick={() => navigate('/courses')}>全部课程 →</Button>}
          >
            {courses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <Text type="secondary">今日暂无课程</Text>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {courses.map((c: any) => (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', background: '#fafafa', borderRadius: 6,
                  }}>
                    <Space>
                      <ClockCircleOutlined style={{ color: '#5CAADF' }} />
                      <div>
                        <Text strong style={{ fontSize: 13 }}>
                          {c.start_time?.slice(0,5)} - {c.end_time?.slice(0,5)}
                        </Text>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {c.teacher?.name} · {c.children?.[0]?.name}
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

          {/* ── 快捷操作 ── */}
          <Card className="sb-card" style={{ marginTop: 16 }}
            title="快捷操作"
          >
            <Space wrap>
              <Button onClick={() => navigate('/courses')}>📋 确认课程</Button>
              <Button onClick={() => navigate('/students')}>👤 学员管理</Button>
              <Button onClick={() => navigate('/finance/settlements')}>💰 教师结算</Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
