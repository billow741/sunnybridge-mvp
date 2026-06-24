import { useEffect, useState } from 'react';
import { Table, Select, Button, Modal, Form, DatePicker, TimePicker, Input, InputNumber, message, Space, Tag, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';

export default function Classes() {
  const [courses, setCourses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [teacherFilter, setTeacherFilter] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [fbOpen, setFbOpen] = useState(false);
  const [fbCourse, setFbCourse] = useState<any>(null);
  const [fbForm] = Form.useForm();
  const [addForm] = Form.useForm();

  const load = async (p = page) => {
    setLoading(true);
    try {
      const [cRes, tRes, chRes] = await Promise.all([
        client.get('/courses/all', { params: { page: p, page_size: 20 } }),
        client.get('/teachers', { params: { page: 1, page_size: 100 } }),
        client.get('/children', { params: { page: 1, page_size: 100 } }),
      ]);
      setCourses(cRes.data.items || []); setTotal(cRes.data.total || 0);
      setTeachers(tRes.data.items || []); setChildren(chRes.data.items || []);
    } catch (err) { message.error(extractError(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, []);

  const onAdd = async (values: any) => {
    try {
      await client.post('/courses', {
        ...values,
        date: values.date?.format('YYYY-MM-DD'),
        start_time: values.start_time?.format('HH:mm'),
        end_time: values.end_time?.format('HH:mm'),
      });
      message.success('添加成功'); setModalOpen(false); addForm.resetFields(); load();
    } catch (err) { message.error(extractError(err)); }
  };

  const onDelete = async (id: string) => {
    Modal.confirm({ title: '确认删除？', onOk: async () => {
      try { await client.delete(`/courses/${id}`); message.success('已删除'); load(); }
      catch (err) { message.error(extractError(err)); }
    }});
  };

  const submitFeedback = async (values: any) => {
    try {
      if (fbCourse.feedback) {
        await client.put(`/courses/${fbCourse.id}/feedback`, values);
      } else {
        await client.post(`/courses/${fbCourse.id}/feedback`, values);
      }
      message.success('反馈已保存'); setFbOpen(false); fbForm.resetFields(); load();
    } catch (err) { message.error(extractError(err)); }
  };

  const filtered = teacherFilter ? courses.filter(c => c.teacher?.id === teacherFilter) : courses;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Select placeholder="按教师筛选" style={{ width: 160 }} allowClear onChange={setTeacherFilter}
            options={teachers.map(t => ({ value: t.id, label: t.name }))} />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加记录</Button>
      </div>

      <Table dataSource={filtered} rowKey="id" loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: p => { setPage(p); load(p); } }}
        columns={[
          { title: '日期', dataIndex: 'date' },
          { title: '时间', render: (_: any, r: any) => `${r.start_time?.slice(0,5)}-${r.end_time?.slice(0,5)}` },
          { title: '学生', render: (_: any, r: any) => r.students?.map((c: any) => c.name).join(', ') },
          { title: '教师', dataIndex: ['teacher', 'name'] },
          { title: '课时', dataIndex: 'hours', render: (v: number) => v ?? 1 },
          { title: '反馈', render: (_: any, r: any) => r.feedback ? <Tag color="green">已提交</Tag> : <Tag>未提交</Tag> },
          { title: '操作', key: 'act', render: (_: any, r: any) => (
            <Space>
              <Button size="small" onClick={() => { setFbCourse(r); setFbOpen(true); fbForm.setFieldsValue(r.feedback || {}); }}>反馈</Button>
              <Button size="small" danger onClick={() => onDelete(r.id)}>删除</Button>
            </Space>
          )},
        ]}
      />

      <Modal title="添加上课记录" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => addForm.submit()} width={560}>
        <Form form={addForm} layout="vertical" onFinish={onAdd}>
          <Form.Item name="date" label="日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Space>
            <Form.Item name="start_time" label="开始" rules={[{ required: true }]}><TimePicker format="HH:mm" /></Form.Item>
            <Form.Item name="end_time" label="结束" rules={[{ required: true }]}><TimePicker format="HH:mm" /></Form.Item>
          </Space>
          <Form.Item name="teacher_id" label="教师" rules={[{ required: true }]}>
            <Select options={teachers.map(t => ({ value: t.id, label: t.name }))} />
          </Form.Item>
          <Form.Item name="child_ids" label="学生">
            <Select mode="multiple" options={children.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="hours" label="消耗课时" initialValue={1}><InputNumber min={0.5} step={0.5} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="meeting_link" label="会议链接"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title="课程反馈" open={fbOpen} onCancel={() => setFbOpen(false)} onOk={() => fbForm.submit()} width={560}>
        <Form form={fbForm} layout="vertical" onFinish={submitFeedback}>
          <Form.Item name="content" label="上课内容" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="homework" label="作业布置"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="notes" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
