import { useEffect, useState } from 'react';
import { Table, Tag, Select, DatePicker, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';

export default function CourseHistory() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try { const { data } = await client.get('/courses/all', { params: { page: p, page_size: 20 } }); setCourses(data.items || []); setTotal(data.total || 0); }
    catch (err) { console.error(extractError(err)); } finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, []);

  return (
    <Table dataSource={courses} rowKey="id" loading={loading}
      pagination={{ current: page, total, pageSize: 20, onChange: p => { setPage(p); load(p); } }}
      onRow={(r) => ({ onClick: () => navigate(`/courses/${r.id}`), style: { cursor: 'pointer' } })}
      columns={[
        { title: '日期', dataIndex: 'date' },
        { title: '时间', render: (_: any, r: any) => `${r.start_time?.slice(0,5)}-${r.end_time?.slice(0,5)}` },
        { title: '学生', render: (_: any, r: any) => r.students?.map((c: any) => c.name).join(', ') },
        { title: '课时', dataIndex: 'hours', render: (v: number) => v ?? 1 },
        { title: '反馈', render: (_: any, r: any) => <Tag color={r.feedback ? 'green' : 'default'}>{r.feedback ? '已提交' : '未提交'}</Tag> },
      ]}
    />
  );
}
