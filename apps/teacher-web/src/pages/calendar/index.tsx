import { useEffect, useState, useMemo } from 'react';
import { Card, Tag, Spin, Segmented, Typography, Empty, Space, Button } from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, LeftOutlined, RightOutlined,
  UserOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client, { extractError } from '@/api/client';

const { Title, Text } = Typography;

const STATUS_TAG: Record<string, { bg: string; text: string; label: string }> = {
  scheduled:   { bg: '#fff7ed', text: '#c2410c', label: '待上课' },
  in_progress: { bg: '#eff6ff', text: '#1d4ed8', label: '进行中' },
  completed:   { bg: '#f0fdf4', text: '#16a34a', label: '已完成' },
  absent:      { bg: '#fef2f2', text: '#dc2626', label: '学生缺席' },
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS_FULL = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function sameDay(a: string, b: Date) {
  const da = new Date(a + 'T00:00:00');
  return da.getFullYear() === b.getFullYear() && da.getMonth() === b.getMonth() && da.getDate() === b.getDate();
}

function getWeekDays(center: Date): Date[] {
  const day = center.getDay();
  const start = new Date(center);
  start.setDate(center.getDate() - day); // Sunday
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: Date[] = [];
  // fill leading days from prev month
  const startDay = first.getDay();
  for (let i = startDay - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }
  // month days
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  // fill trailing
  const remaining = 42 - days.length; // 6 rows
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }
  return days;
}

export default function CalendarView() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/courses/all/teacher', { params: { page_size: 500 } });
        setCourses(data?.items || []);
      } catch (err) {
        console.error(extractError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const coursesForDay = (day: Date) => courses.filter(c => sameDay(c.date, day));

  const navigateDate = (delta: number) => {
    const next = new Date(currentDate);
    if (view === 'week') {
      next.setDate(next.getDate() + delta * 7);
    } else {
      next.setMonth(next.getMonth() + delta);
    }
    setCurrentDate(next);
  };

  const today = new Date();
  const isToday = (d: Date) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const headerLabel = view === 'week'
    ? (() => { const days = getWeekDays(currentDate); return `${days[0].getFullYear()}年${days[0].getMonth() + 1}月${days[0].getDate()}日 - ${days[6].getMonth() + 1}月${days[6].getDate()}日`; })()
    : `${year}年${month + 1}月`;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* 顶部控制栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarOutlined style={{ color: '#722ed1', fontSize: 22 }} />
          <Title level={4} style={{ margin: 0 }}>课程日历</Title>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            size="small"
            onClick={() => setCurrentDate(new Date())}
            style={{ fontSize: 12 }}
          >
            今天
          </Button>
          <Space>
            <Button type="text" icon={<LeftOutlined />} onClick={() => navigateDate(-1)} size="small" />
            <span style={{ fontWeight: 600, fontSize: 15, minWidth: 180, textAlign: 'center' }}>{headerLabel}</span>
            <Button type="text" icon={<RightOutlined />} onClick={() => navigateDate(1)} size="small" />
          </Space>
          <Segmented
            options={[
              { label: '周视图', value: 'week' },
              { label: '月视图', value: 'month' },
            ]}
            value={view}
            onChange={(v) => setView(v as 'week' | 'month')}
            size="small"
          />
        </div>
      </div>

      {/* ── 周视图 ── */}
      {view === 'week' && (() => {
        const days = getWeekDays(currentDate);
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {days.map((day, i) => {
              const dc = coursesForDay(day);
              return (
                <div key={i} style={{
                  background: '#fff', borderRadius: 10,
                  borderTop: isToday(day) ? '3px solid #722ed1' : '3px solid transparent',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  minHeight: 200, padding: 12,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{WEEKDAYS_FULL[day.getDay()]}</span>
                    <span style={{
                      fontSize: 16, fontWeight: 700,
                      color: isToday(day) ? '#722ed1' : '#1f2937',
                      background: isToday(day) ? '#faf5ff' : 'transparent',
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {day.getDate()}
                    </span>
                  </div>
                  {dc.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#d1d5db', fontSize: 12 }}>无课程</div>
                  ) : dc.map(c => {
                    const hasFeedback = !!c.feedback;
                    return (
                      <div
                        key={c.id}
                        onClick={() => navigate(`/courses/${c.id}`)}
                        style={{
                          padding: '6px 8px', marginBottom: 4, borderRadius: 6,
                          background: hasFeedback ? '#f0fdf4' : '#faf5ff',
                          cursor: 'pointer', fontSize: 12,
                          borderLeft: `3px solid ${hasFeedback ? '#22c55e' : '#722ed1'}`,
                          transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <div style={{ fontWeight: 600, color: '#374151' }}>
                          {c.start_time?.slice(0,5)}-{c.end_time?.slice(0,5)}
                        </div>
                        <div style={{ color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.students?.map((ch: any) => ch.name).join(', ') || '-'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── 月视图 ── */}
      {view === 'month' && (() => {
        const days = getMonthDays(year, month);
        return (
          <>
            {/* 星期头 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 2 }}>
              {WEEKDAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', fontWeight: 500, padding: '6px 0', background: '#f9fafb' }}>
                  {d}
                </div>
              ))}
            </div>
            {/* 日期格 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
              {days.map((day, i) => {
                const dc = coursesForDay(day);
                const outOfMonth = day.getMonth() !== month;
                return (
                  <div
                    key={i}
                    style={{
                      background: isToday(day) ? '#faf5ff' : (outOfMonth ? '#f9fafb' : '#fff'),
                      minHeight: 90, padding: '4px 6px',
                      border: isToday(day) ? '1px solid #722ed1' : '1px solid #f3f4f6',
                      borderRadius: 4, position: 'relative',
                    }}
                  >
                    <span style={{
                      fontSize: 13, fontWeight: isToday(day) ? 700 : 400,
                      color: outOfMonth ? '#d1d5db' : (isToday(day) ? '#722ed1' : '#374151'),
                    }}>
                      {day.getDate()}
                    </span>
                    {dc.slice(0, 3).map(c => (
                      <div
                        key={c.id}
                        onClick={(e) => { e.stopPropagation(); navigate(`/courses/${c.id}`); }}
                        style={{
                          fontSize: 11, padding: '1px 4px', marginTop: 2, borderRadius: 3,
                          background: c.feedback ? '#dcfce7' : '#faf5ff',
                          color: '#374151', cursor: 'pointer', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {c.start_time?.slice(0,5)} {c.students?.map((ch: any) => ch.name).join(',')}
                      </div>
                    ))}
                    {dc.length > 3 && (
                      <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>
                        +{dc.length - 3} 更多
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}
    </div>
  );
}
