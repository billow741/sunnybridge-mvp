import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Spin, Button, Space, Typography, Progress, Empty, Descriptions } from 'antd';
import {
  ArrowLeftOutlined, UserOutlined, BookOutlined, ClockCircleOutlined,
  CalendarOutlined, HistoryOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import client, { extractError } from '@/api/client';

const { Title, Text } = Typography;

const CEFR_COLORS: Record<string, string> = {
  starter: 'default', A1: 'blue', A2: 'cyan', B1: 'green', B2: 'lime', C1: 'orange', C2: 'red',
};

const STATUS_TAG: Record<string, { bg: string; text: string; label: string }> = {
  scheduled:   { bg: '#fff7ed', text: '#c2410c', label: '待上课' },
  in_progress: { bg: '#eff6ff', text: '#1d4ed8', label: '进行中' },
  completed:   { bg: '#f0fdf4', text: '#16a34a', label: '已完成' },
  absent:      { bg: '#fef2f2', text: '#dc2626', label: '学生缺席' },
};

/* ── 反馈三段式卡片 — 带图标色块标题栏 ── */
function FeedbackCard({ feedback }: { feedback: any }) {
  const sections = [
    { key: 'content', icon: '📖', label: '上课内容', value: feedback.content, bg: '#faf5ff', headerBg: '#ede9fe', titleColor: '#6d28d9', borderColor: '#7c3aed' },
    { key: 'homework', icon: '📝', label: '布置作业', value: feedback.homework, bg: '#eff6ff', headerBg: '#dbeafe', titleColor: '#1d4ed8', borderColor: '#3b82f6' },
    { key: 'notes', icon: '💡', label: '备注', value: feedback.notes, bg: '#fffbeb', headerBg: '#fef3c7', titleColor: '#b45309', borderColor: '#f59e0b' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sections.map(s => s.value ? (
        <div key={s.key} style={{
          border: `1px solid ${s.borderColor}20`,
          borderLeft: `5px solid ${s.borderColor}`,
          background: s.bg,
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {/* 标题栏 */}
          <div style={{
            background: s.headerBg,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderBottom: `1px solid ${s.borderColor}15`,
          }}>
            <span style={{ fontSize: 16 }}>{s.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: s.titleColor }}>{s.label}</span>
          </div>
          {/* 内容区 */}
          <div style={{ padding: '12px 14px', fontSize: 14, color: '#1f2937', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {s.value}
          </div>
        </div>
      ) : null)}
    </div>
  );
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        // 并行拉学员信息和课程列表
        const [stuRes, courseRes] = await Promise.all([
          client.get('/courses/teacher/me/students').catch(() => ({ data: [] })),
          client.get('/courses/all/teacher', { params: { child_id: id, page_size: 100 } }).catch(() => ({ data: { items: [] } })),
        ]);
        const stuList: any[] = stuRes.data || [];
        const found = stuList.find((s: any) => s.id === id);
        setStudent(found || null);
        setCourses(courseRes.data?.items || []);
      } catch (err) {
        console.error(extractError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  const completedCount = courses.filter(c => c.feedback).length;
  const totalCount = courses.length;
  const totalHours = courses.reduce((sum: number, c: any) => sum + (c.hours || 1), 0);
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* 返回按钮 */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/students')}
        style={{ marginBottom: 16, color: '#6b7280' }}
      >
        返回学员列表
      </Button>

      {/* ── 学员信息卡 ── */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          borderTop: `4px solid #5CAADF`,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserOutlined style={{ color: '#5CAADF', fontSize: 20 }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontSize: 20 }}>{student?.name || '学员'}</Title>
                <Space size={8} style={{ marginTop: 4 }}>
                  <Tag color={CEFR_COLORS[student?.cefr_level] || 'default'}>
                    {student?.cefr_level?.toUpperCase() || 'STARTER'}
                  </Tag>
                </Space>
              </div>
            </div>
            <Descriptions column={2} size="small" style={{ marginTop: 12 }}>
              <Descriptions.Item label="家长电话">
                <Space size={4}>
                  <PhoneOutlined style={{ color: '#9ca3af' }} />
                  {student?.parent_phone || '-'}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="最近上课">
                <Space size={4}>
                  <CalendarOutlined style={{ color: '#9ca3af' }} />
                  {student?.last_course_date || '-'}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </div>
          {/* 统计概览 */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#722ed1' }}>{totalHours}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>累计课时</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{completedCount}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>已提交反馈</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#5CAADF' }}>{completionRate}%</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>反馈率</div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 课程记录列表 ── */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <HistoryOutlined style={{ color: '#722ed1', fontSize: 18 }} />
        <span style={{ fontSize: 17, fontWeight: 600, color: '#1f2937' }}>课程记录</span>
        <span style={{ fontSize: 13, color: '#9ca3af' }}>({totalCount} 节)</span>
      </div>

      {courses.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 12, textAlign: 'center' }}>
          <Empty description="暂无课程记录" />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {courses.map(c => {
            const hasFeedback = !!c.feedback;
            const s = STATUS_TAG[c.status] || (hasFeedback ? STATUS_TAG.completed : STATUS_TAG.scheduled);
            return (
              <Card
                key={c.id}
                bordered={false}
                style={{
                  borderRadius: 12,
                  borderTop: `3px solid ${hasFeedback ? '#22c55e' : '#722ed1'}`,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                }}
                hoverable
                onClick={() => navigate(`/courses/${c.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Space size={12}>
                    <Space size={4}>
                      <CalendarOutlined style={{ color: '#9ca3af', fontSize: 13 }} />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{c.date}</span>
                    </Space>
                    <Space size={4}>
                      <ClockCircleOutlined style={{ color: '#9ca3af', fontSize: 13 }} />
                      <span style={{ fontSize: 14 }}>{c.start_time?.slice(0,5)} - {c.end_time?.slice(0,5)}</span>
                    </Space>
                    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: s.bg, color: s.text, fontWeight: 500 }}>
                      {s.label}
                    </span>
                  </Space>
                  <Space>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{c.hours || 1} 课时</span>
                    {hasFeedback
                      ? <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}><CheckCircleOutlined /> 已反馈</span>
                      : <span style={{ fontSize: 12, color: '#F4A230', fontWeight: 500 }}><ExclamationCircleOutlined /> 待反馈</span>}
                  </Space>
                </div>

                {/* 反馈内容 */}
                {c.feedback && <FeedbackCard feedback={c.feedback} />}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
