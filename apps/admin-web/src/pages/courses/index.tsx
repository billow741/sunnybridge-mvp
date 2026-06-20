import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import client, { extractError } from '@/api/client';

export default function Courses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async (p = page) => {
    setLoading(true);
    try {
      const [cRes, tRes, chRes] = await Promise.all([
        client.get('/courses/all', { params: { page: p, page_size: 20 } }),
        client.get('/teachers', { params: { page: 1, page_size: 200 } }),
        client.get('/children', { params: { page: 1, page_size: 200 } }),
      ]);
      setCourses(cRes.data.items || []); setTotal(cRes.data.total || 0);
      setTeachers(tRes.data.items || []); setChildren(chRes.data.items || []);
    } catch (err) { message.error(extractError(err)); } finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, []);

  const onDelete = async (id: string) => {
    try { await client.delete(`/courses/${id}`); message.success('已删除'); load(); } catch (err) { message.error(extractError(err)); }
  };

  return (
    <div>
      <Table dataSource={courses} rowKey="id" loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: p => { setPage(p); load(p); } }}
        columns={[
          { title: '日期', dataIndex: 'date' },
          { title: '时间', render: (_: any, r: any) => `${r.start_time?.slice(0,5)}-${r.end_time?.slice(0,5)}` },
          { title: '教师', dataIndex: ['teacher', 'name'] },
          { title: '学生', render: (_: any, r: any) => r.children?.map((c: any) => c.name).join(', ') || '-' },
          { title: '课时', dataIndex: 'hours', render: (v: number) => v ?? 1 },
          { title: '反馈', render: (_: any, r: any) => r.feedback ? <Tag color="green">有</Tag> : <Tag>无</Tag> },
          { title: '操作', render: (_: any, r: any) => <Popconfirm title="删除？" onConfirm={() => onDelete(r.id)}><Button size="small" danger>删除</Button></Popconfirm> },
        ]}
      />
    </div>
  );
}
