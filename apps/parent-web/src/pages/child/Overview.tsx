import { useEffect, useState } from 'react';
import {
  Card, Row, Col, Statistic, List, Tag, Badge, Alert, Spin, Avatar, Typography
} from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import client, { extractError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

const { Title, Text } = Typography;

interface Course {
  id: string | number;
  name: string;
  start_time: string;
  end_time: string;
  status: 'completed' | 'in_progress' | string;
  teacher?: { name?: string };
  child_id?: string | number;
  students?: any[];
  meeting_link?: string;
}

interface Child {
  id: string | number;
  name: string;
  english_name?: string;
  cefr_level?: string;
  hours_total?: number;
  hours_used?: number;
  remaining_hours?: number;
  totalhours?: number;
  usedhours?: number;
}

export default function ChildOverview() {
  const [child, setChild] = useState<Child | null>(null);
  const [todayCourses, setTodayCourses] = useState<Course[]>([]);
  const [historyCourses, setHistoryCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);

  const hoursTotal = child?.hours_total ?? child?.totalhours ?? 0;
  const hoursUsed = child?.hours_used ?? child?.usedhours ?? 0;
  const hoursRemaining = child?.remaining_hours ?? (hoursTotal - hoursUsed);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const childRes = await client.get('/children/me');
        const kid: Child = childRes.data;
        setChild(kid);

        if (kid?.id) {
          const [todayRes, historyRes] = await Promise.all([
            client.get('/courses/today', { params: { child_id: kid.id } }).catch(() => ({ data: [] })),
            client.get('/courses/history', { params: { child_id: kid.id } }).catch(() => ({ data: [] })),
          ]);
          setTodayCourses(Array.isArray(todayRes.data) ? todayRes.data : (todayRes.data.items || []));
          setHistoryCourses(Array.isArray(historyRes.data) ? historyRes.data : (historyRes.data.items || []));
        }
      } catch (err) {
        console.error(extractError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusBadge = (status: string) => {
    if (status === 'completed') return <Badge color="green" text="已完成" />;
    if (status === 'in_progress') return <Badge color="blue" text="进行中" />;
    return <Badge color="default" text="待上课" />;
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  if (!child) {
    return <Alert type="info" message="暂无关联孩子信息" description="请联系管理员绑定" showIcon />;
  }

  return (
    <div>
      {/* 欢迎栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1e293b' }}>
          欢迎回来，{user?.nickname || user?.name || '家长'}！
        </h2>
        <Tag color="default" style={{ fontSize: 13 }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          今日登录 {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </Tag>
      </div>

      {/* 今日课程 */}
      <Card
        title="今日课程"
        style={{ marginBottom: 24, borderRadius: 12 }}
        headStyle={{ fontWeight: 600 }}
      >
        {todayCourses.length === 0 ? (
          <Text type="secondary">今日暂无课程</Text>
        ) : (
          <List
            dataSource={todayCourses}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#F4A230',
                        marginTop: 6,
                      }}
                    />
                  }
                  title={
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>
                      {item.name}
                    </span>
                  }
                  description={
                    <span style={{ color: '#64748b' }}>
                      {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                      {item.teacher?.name ? ` · 教师: ${item.teacher.name}` : ''}
                    </span>
                  }
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.meeting_link && (
                    <a
                      href={item.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#F4A230',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      进入会议室
                    </a>
                  )}
                  {statusBadge(item.status)}
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 宝贝信息 + 学时统计 */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="宝贝信息" style={{ borderRadius: 12 }} headStyle={{ fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Avatar
                shape="square"
                size={64}
                style={{
                  background: '#F4A230',
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {child.name ? child.name.charAt(0) : '宝'}
              </Avatar>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>
                  {child.name}
                  {child.english_name && (
                    <span style={{ color: '#64748b', marginLeft: 8, fontWeight: 400 }}>
                      {child.english_name}
                    </span>
                  )}
                </div>
                {child.cefr_level && (
                  <Tag color="blue" style={{ marginTop: 8 }}>
                    CEFR: {child.cefr_level}
                  </Tag>
                )}
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="学时统计" style={{ borderRadius: 12 }} headStyle={{ fontWeight: 600 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="总学时"
                  value={hoursTotal}
                  valueStyle={{ color: '#F4A230', fontWeight: 700, fontSize: 24 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="已用"
                  value={hoursUsed}
                  valueStyle={{ color: '#F4A230', fontWeight: 700, fontSize: 24 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="剩余"
                  value={hoursRemaining}
                  valueStyle={{
                    color: hoursRemaining < 5 ? '#F4A230' : '#F4A230',
                    fontWeight: 700,
                    fontSize: 24,
                  }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 低课时警告 */}
      {hoursRemaining < 5 && (
        <Alert
          message="剩余课时少于5小时，请及时续费"
          type="warning"
          showIcon
          style={{
            marginBottom: 24,
            border: '1px solid #F4A230',
            borderRadius: 8,
          }}
        />
      )}

      {/* 最近课程 */}
      <Card
        title="最近课程"
        style={{ borderRadius: 12 }}
        headStyle={{ fontWeight: 600 }}
      >
        {historyCourses.length === 0 ? (
          <Text type="secondary">暂无课程记录</Text>
        ) : (
          <List
            dataSource={historyCourses.slice(0, 5)}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 4,
                        background: '#F4A230',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {item.start_time?.slice(5, 7)}/${item.start_time?.slice(8, 10) || ''}
                    </div>
                  }
                  title={
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.name}</span>
                  }
                  description={
                    <span style={{ color: '#64748b' }}>
                      {item.teacher?.name ? `教师: ${item.teacher.name}` : ''}
                      {item.status ? ` · 反馈: ${item.status}` : ''}
                    </span>
                  }
                />
                <Tag color="default">{item.start_time?.slice(0, 10)}</Tag>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
