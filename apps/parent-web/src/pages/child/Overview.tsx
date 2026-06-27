import { useEffect, useState } from 'react';
import {
  Row, Col, Card, Statistic, Tag, Alert, Spin, Avatar, Typography, Modal, Empty
} from 'antd';
import {
  ClockCircleOutlined, UserOutlined, BookOutlined,
  VideoCameraOutlined, CalendarOutlined, HistoryOutlined,
} from '@ant-design/icons';
import client, { extractError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

const { Text } = Typography;

/* ── 从腾讯会议文本中提取链接 ── */
function extractMeetingUrl(raw: string | undefined): { url: string | null; meetingId: string | null } {
  if (!raw) return { url: null, meetingId: null };
  // 1) 先找 https:// 链接
  const urlMatch = raw.match(/https?:\/\/[^\s<>"']+/);
  // 2) 找会议号 #xxx-xxx-xxx 或 纯数字-数字-数字
  const idMatch = raw.match(/#?[Tt]encent[Mm]eeting[：:]\s*(\d[\d-]+\d)/) || raw.match(/(\d{3}-\d{3,6}-\d{2,4})/);
  return {
    url: urlMatch ? urlMatch[0] : null,
    meetingId: idMatch ? idMatch[1] : null,
  };
}

/* ── 类型 ── */
interface Course {
  id: string | number;
  name: string;
  date?: string;
  start_time: string;
  end_time: string;
  status: 'completed' | 'in_progress' | 'scheduled' | 'absent' | 'cancelled' | string;
  teacher?: { name?: string };
  child_id?: string | number;
  students?: any[];
  meeting_link?: string;
  content?: string;
  homework?: string;
  notes?: string;
  hours?: number;
}

interface Child {
  id: string | number;
  name: string;
  english_name?: string;
  cefr_level?: string;
  grade?: string;
  hours_total?: number;
  hours_used?: number;
  remaining_hours?: number;
  totalhours?: number;
  usedhours?: number;
}

/* ── 状态配色 ── */
const STATUS_MAP: Record<string, { color: string; label: string }> = {
  scheduled:   { color: 'orange',  label: '待上课' },
  in_progress: { color: 'blue',    label: '进行中' },
  completed:   { color: 'green',   label: '已完成' },
  absent:      { color: 'red',     label: '学生缺席' },
  cancelled:   { color: 'default', label: '已取消' },
};

const STATUS_TAG_CN: Record<string, { bg: string; text: string; label: string }> = {
  scheduled:   { bg: '#fff7ed', text: '#c2410c', label: '待上课' },
  in_progress: { bg: '#eff6ff', text: '#1d4ed8', label: '进行中' },
  completed:   { bg: '#f0fdf4', text: '#16a34a', label: '已完成' },
  absent:      { bg: '#fef2f2', text: '#dc2626', label: '学生缺席' },
  cancelled:   { bg: '#f9fafb', text: '#6b7280', label: '已取消' },
};

/* ── 星期 ── */
function getDayOfWeek(dateStr?: string) {
  if (!dateStr) return '';
  const days = ['周日','周一','周二','周三','周四','周五','周六'];
  return days[new Date(dateStr + 'T00:00:00').getDay()];
}

export default function ChildOverview() {
  const [child, setChild] = useState<Child | null>(null);
  const [todayCourses, setTodayCourses] = useState<Course[]>([]);
  const [upcomingCourses, setUpcomingCourses] = useState<Course[]>([]);
  const [historyCourses, setHistoryCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);

  // 反馈弹窗
  const [fbModal, setFbModal] = useState<{ open: boolean; course: Course | null }>({ open: false, course: null });

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
            client.get('/courses/history', { params: { child_id: kid.id, page_size: 200 } }).catch(() => ({ data: [] })),
          ]);
          const todayArr = Array.isArray(todayRes.data) ? todayRes.data : (todayRes.data.items || []);
          const histArr = Array.isArray(historyRes.data) ? historyRes.data : (historyRes.data.items || []);
          setTodayCourses(todayArr);

          // 按日期分割: 即将上课 vs 历史
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
          const upcoming = histArr.filter((c: Course) => (c.date || '') > todayStr && c.status === 'scheduled');
          const past = histArr.filter((c: Course) => (c.date || '') < todayStr || c.status !== 'scheduled');
          setUpcomingCourses(upcoming.sort((a: Course, b: Course) => (a.date||'').localeCompare(b.date||'')).slice(0,10));
          setHistoryCourses(past.sort((a: Course, b: Course) => (b.date||'').localeCompare(a.date||'')));
        }
      } catch (err) {
        console.error(extractError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!child) return <Alert type="info" message="暂无关联孩子信息" description="请联系管理员绑定" showIcon />;

  /* ── 渲染今日课程卡片 ── */
  const renderTodayCard = (c: Course, idx: number) => {
    const s = STATUS_TAG_CN[c.status] || STATUS_TAG_CN.scheduled;
    const hasLink = !!c.meeting_link;

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
          borderTop: `4px solid ${c.status === 'completed' ? '#22c55e' : '#f97316'}`,
          transition: 'box-shadow 0.2s, transform 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'none'; }}
      >
        {/* 时间 + 状态 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ClockCircleOutlined style={{ color: '#9ca3af', fontSize: 14 }} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>{c.start_time?.slice(0,5)} - {c.end_time?.slice(0,5)}</span>
          </div>
          <span style={{
            fontSize: 12, padding: '2px 10px', borderRadius: 12,
            background: s.bg, color: s.text, fontWeight: 500,
          }}>
            {s.label}
          </span>
        </div>

        {/* 教师 + 科目 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined style={{ color: '#9ca3af', fontSize: 14 }} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>{c.teacher?.name || '未知老师'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOutlined style={{ color: '#9ca3af', fontSize: 14 }} />
            <span style={{ color: '#6b7280', fontSize: 14 }}>English</span>
          </div>
        </div>

        {/* 会议链接区 */}
        {hasLink && (() => {
          const { url, meetingId } = extractMeetingUrl(c.meeting_link);
          return (
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 10 }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>上课信息</div>
            <div style={{
              background: '#eff6ff', borderRadius: 8, padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              {c.status !== 'completed' ? (
                <>
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer"
                       style={{ color: '#f97316', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <VideoCameraOutlined />
                      进入会议室 →
                    </a>
                  )}
                  {meetingId && (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      会议号：<span style={{ color: '#1f2937', fontWeight: 500, letterSpacing: 0.5 }}>{meetingId}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(meetingId); }}
                        style={{ marginLeft: 8, background: 'none', border: '1px solid #e5e7eb', borderRadius: 4, padding: '1px 8px', fontSize: 11, color: '#6b7280', cursor: 'pointer' }}
                      >复制</button>
                    </div>
                  )}
                  {!url && !meetingId && (
                    <span style={{ color: '#6b7280', fontSize: 13, whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{c.meeting_link}</span>
                  )}
                </>
              ) : (
                <span style={{ color: '#6b7280', fontSize: 12 }}>{url || c.meeting_link}</span>
              )}
            </div>
          </div>
          );
        })()}

        {/* 已完成的课程 → 查看反馈 */}
        {c.status === 'completed' && (c.content || c.homework) && (
          <button
            onClick={() => setFbModal({ open: true, course: c })}
            style={{
              marginTop: 12, width: '100%', padding: '8px 0',
              background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
              borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}
          >
            查看上课反馈
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* ── 顶部: 欢迎栏 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: '#fff7ed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserOutlined style={{ color: '#ea580c', fontSize: 22 }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1f2937' }}>
              {child.name} 的学习情况
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
              年级: {child.grade || '-'} · 剩余 {hoursRemaining} 课时
            </p>
          </div>
        </div>
      </div>

      {/* ── 学生信息卡: 4列统计 ── */}
      <Card style={{ borderRadius: 12, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <Row gutter={16}>
          <Col span={6} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#9ca3af', marginBottom: 4 }}>剩余课时</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#ea580c', margin: 0 }}>{hoursRemaining}</p>
          </Col>
          <Col span={6} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#9ca3af', marginBottom: 4 }}>已用课时</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#6b7280', margin: 0 }}>{hoursUsed}</p>
          </Col>
          <Col span={6} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#9ca3af', marginBottom: 4 }}>总课时</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#6b7280', margin: 0 }}>{hoursTotal}</p>
          </Col>
          <Col span={6} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#9ca3af', marginBottom: 4 }}>年级</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#6b7280', margin: 0 }}>{child.grade || '-'}</p>
          </Col>
        </Row>
      </Card>

      {/* ── 低课时警告 ── */}
      {hoursRemaining < 5 && (
        <Alert
          message="剩余课时不足5小时，请及时续费"
          type="warning"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8, border: '1px solid #fed7aa' }}
        />
      )}

      {/* ── 今日课程: 卡片网格 ── */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <CalendarOutlined style={{ color: '#ea580c', fontSize: 18 }} />
          <span style={{ fontSize: 17, fontWeight: 600, color: '#1f2937' }}>
            今日课程 ({todayCourses.length})
          </span>
        </div>
        {todayCourses.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '32px 0', color: '#9ca3af',
            background: '#fff', borderRadius: 12,
          }}>
            今日无课程
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {todayCourses.map((c, i) => renderTodayCard(c, i))}
          </div>
        )}
      </section>

      {/* ── 即将上课: 表格 ── */}
      {upcomingCourses.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <CalendarOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
            <span style={{ fontSize: 17, fontWeight: 600, color: '#1f2937' }}>
              即将上课 ({upcomingCourses.length})
            </span>
          </div>
          <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={thStyle}>日期</th>
                  <th style={thStyle}>时间</th>
                  <th style={thStyle}>科目</th>
                  <th style={thStyle}>教师</th>
                  <th style={thStyle}>状态</th>
                </tr>
              </thead>
              <tbody>
                {upcomingCourses.map(c => {
                  const s = STATUS_TAG_CN[c.status] || STATUS_TAG_CN.scheduled;
                  return (
                    <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={tdStyle}>
                        {c.date} <span style={{ color: '#ea580c', fontWeight: 500 }}>{getDayOfWeek(c.date)}</span>
                      </td>
                      <td style={tdStyle}>{c.start_time?.slice(0,5)}</td>
                      <td style={tdStyle}>{c.name || 'English'}</td>
                      <td style={tdStyle}>{c.teacher?.name || '-'}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: s.bg, color: s.text }}>
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {/* ── 历史记录: 表格 ── */}
      {historyCourses.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <HistoryOutlined style={{ color: '#6b7280', fontSize: 18 }} />
            <span style={{ fontSize: 17, fontWeight: 600, color: '#1f2937' }}>
              历史记录
            </span>
            <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 400 }}>({historyCourses.length} 条)</span>
          </div>
          <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={thStyle}>日期</th>
                  <th style={thStyle}>时间</th>
                  <th style={thStyle}>科目</th>
                  <th style={thStyle}>教师</th>
                  <th style={thStyle}>反馈</th>
                </tr>
              </thead>
              <tbody>
                {historyCourses.slice(0, 20).map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={tdStyle}>{c.date}</td>
                    <td style={tdStyle}>{c.start_time?.slice(0,5)}</td>
                    <td style={tdStyle}>{c.name || 'English'}</td>
                    <td style={tdStyle}>{c.teacher?.name || '-'}</td>
                    <td style={tdStyle}>
                      {c.status !== 'scheduled' && (c.content || c.homework) ? (
                        <a style={{ color: '#3b82f6', cursor: 'pointer', fontSize: 13 }}
                           onClick={() => setFbModal({ open: true, course: c })}>
                          查看反馈
                        </a>
                      ) : (
                        <span style={{ color: '#d1d5db', fontSize: 13 }}>未提交</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {/* ── 反馈详情弹窗 ── */}
      <Modal
        title="上课反馈详情"
        open={fbModal.open}
        onCancel={() => setFbModal({ open: false, course: null })}
        footer={<button onClick={() => setFbModal({ open: false, course: null })} style={closeBtnStyle}>关闭</button>}
        width={520}
      >
        {fbModal.course && (
          <>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#6b7280' }}>
              <div><b>日期：</b>{fbModal.course.date || '-'}</div>
              <div><b>时间：</b>{fbModal.course.start_time?.slice(0,5)} - {fbModal.course.end_time?.slice(0,5)}</div>
              <div><b>老师：</b>{fbModal.course.teacher?.name || '-'}</div>
              <div><b>科目：</b>English</div>
              {fbModal.course.hours && <div><b>课时：</b>{fbModal.course.hours} 节</div>}
            </div>
            {[
              { icon: '📖', label: '上课内容', value: fbModal.course.content, color: '#7c3aed' },
              { icon: '📝', label: '作业布置', value: fbModal.course.homework, color: '#2563eb' },
              { icon: '💡', label: '备注', value: fbModal.course.notes, color: '#d97706' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#f9fafb', borderRadius: 10, padding: '14px 16px',
                borderLeft: `4px solid ${s.color}`, marginBottom: 12,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: s.color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{s.icon}</span>{s.label}
                </div>
                <div style={{ fontSize: 14, color: '#1f2937', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {s.value || '无'}
                </div>
              </div>
            ))}
          </>
        )}
      </Modal>
    </div>
  );
}

/* ── 共用样式 ── */
const thStyle: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#9ca3af',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 16px', fontSize: 13, color: '#374151',
};

const closeBtnStyle: React.CSSProperties = {
  width: '100%', padding: '10px 0', background: '#7c3aed', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
