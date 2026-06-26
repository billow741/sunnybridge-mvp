import { useEffect, useState } from 'react';
import { Tag, Select, Spin, Card, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CalendarOutlined, ClockCircleOutlined, HistoryOutlined, EyeOutlined } from '@ant-design/icons';
import client, { extractError } from '@/api/client';

const STATUS_TAG: Record<string, { bg: string; text: string; label: string }> = {
  scheduled:   { bg: '#fff7ed', text: '#c2410c', label: '待上课' },
  in_progress: { bg: '#eff6ff', text: '#1d4ed8', label: '进行中' },
  completed:   { bg: '#f0fdf4', text: '#16a34a', label: '已完成' },
  absent:      { bg: '#fef2f2', text: '#dc2626', label: '学生缺席' },
  cancelled:   { bg: '#f9fafb', text: '#6b7280', label: '已取消' },
};

const thS = { padding: '10px 16px', textAlign: 'left' as const, fontSize: 12, fontWeight: 500 as const, color: '#9ca3af' };
const tdS = { padding: '10px 16px', fontSize: 13, color: '#374151' };

export default function CourseHistory() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const { data } = await client.get('/courses/all', { params: { page: p, page_size: 20 } });
      setCourses(data.items || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(extractError(err)); } finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, []);

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <HistoryOutlined style={{ color: '#722ed1', fontSize: 20 }} />
        <span style={{ fontSize: 17, fontWeight: 600, color: '#1f2937' }}>全部课程</span>
        <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 400 }}>({total} 条)</span>
      </div>

      <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <Spin style={{ display: 'block', margin: '40px auto' }} />
        ) : courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>暂无课程记录</div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={thS}>日期</th>
                  <th style={thS}>时间</th>
                  <th style={thS}>学生</th>
                  <th style={thS}>课时</th>
                  <th style={thS}>状态</th>
                  <th style={thS}>反馈</th>
                  <th style={thS}>操作</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(c => {
                  const s = STATUS_TAG[c.status] || STATUS_TAG[c.feedback ? 'completed' : 'scheduled'] || STATUS_TAG.scheduled;
                  return (
                    <tr
                      key={c.id}
                      style={{ borderTop: '1px solid #f3f4f6', cursor: 'pointer' }}
                      onClick={() => navigate(`/courses/${c.id}`)}
                    >
                      <td style={tdS}>{c.date}</td>
                      <td style={tdS}>{c.start_time?.slice(0,5)}-{c.end_time?.slice(0,5)}</td>
                      <td style={tdS}>{c.students?.map((ch: any) => ch.name).join(', ') || '-'}</td>
                      <td style={tdS}>{c.hours ?? 1}</td>
                      <td style={tdS}>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: s.bg, color: s.text }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={tdS}>
                        {c.feedback
                          ? <span style={{ color: '#16a34a', fontSize: 12 }}>已提交</span>
                          : <span style={{ color: '#d1d5db', fontSize: 12 }}>未提交</span>}
                      </td>
                      <td style={tdS}>
                        <EyeOutlined style={{ color: '#722ed1', cursor: 'pointer' }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px 0', borderTop: '1px solid #f3f4f6' }}>
                <Button size="small" disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1); }}>上一页</Button>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{page} / {totalPages}</span>
                <Button size="small" disabled={page >= totalPages} onClick={() => { setPage(page + 1); load(page + 1); }}>下一页</Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
