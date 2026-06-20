import { useEffect, useState } from 'react';
import { Table, Button, Input, Select, Modal, Form, message, Tag, Space } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client, { extractError } from '@/api/client';

export default function Students() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async (p = page) => {
    setLoading(true);
    try {
      const { data: res } = await client.get('/children', { params: { page: p, page_size: 20 } });
      setData(res.items || []); setTotal(res.total || 0);
    } catch (err) { message.error(extractError(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, []);

  const onAdd = async (values: any) => {
    try {
      await client.post('/children', values);
      message.success('添加成功');
      setModalOpen(false); form.resetFields(); load();
    } catch (err) { message.error(extractError(err)); }
  };

  const onDelete = async (id: string) => {
    Modal.confirm({ title: '确认删除此学生？', onOk: async () => {
      try { await client.delete(`/children/${id}`); message.success('已删除'); load(); }
      catch (err) { message.error(extractError(err)); }
    }});
  };

  const filtered = data.filter(s => {
    if (search && !s.name?.includes(search) && !s.parent_phone?.includes(search)) return false;
    if (statusFilter === 'low' && (s.remaining_hours ?? 0) >= 5) return false;
    if (statusFilter === 'empty' && (s.remaining_hours ?? 0) > 0) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Input placeholder="搜索姓名/电话" prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} allowClear />
          <Select placeholder="状态筛选" style={{ width: 120 }} allowClear onChange={setStatusFilter} options={[
            { value: 'low', label: '课时不足' }, { value: 'empty', label: '已无课时' },
          ]} />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加学生</Button>
      </div>

      <Table dataSource={filtered} rowKey="id" loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: (p) => { setPage(p); load(p); } }}
        onRow={(r) => ({ onClick: () => navigate(`/students/${r.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: '姓名', dataIndex: 'name' },
          { title: '英文名', dataIndex: 'english_name' },
          { title: '家长电话', dataIndex: 'parent_phone' },
          { title: '总课时', dataIndex: 'totalhours' },
          { title: '已用', dataIndex: 'usedhours' },
          { title: '剩余', key: 'remaining', render: (_: any, r: any) => {
            const rem = r.remaining_hours ?? (r.totalhours - r.usedhours);
            return <Tag color={rem < 5 ? 'red' : 'blue'}>{rem}</Tag>;
          }},
          { title: '操作', key: 'act', render: (_: any, r: any) => <Button danger size="small" onClick={e => { e.stopPropagation(); onDelete(r.id); }}>删除</Button> },
        ]}
      />

      <Modal title="添加学生" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={onAdd}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="english_name" label="英文名"><Input /></Form.Item>
          <Form.Item name="parent_phone" label="家长电话" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="birth_date" label="出生日期"><Input type="date" /></Form.Item>
          <Form.Item name="level" label="级别"><Select options={['L1','L2','L3','L4','L5','L6'].map(l => ({ value: l, label: l }))} allowClear /></Form.Item>
          <Form.Item name="totalhours" label="总课时" initialValue={0}><Input type="number" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
