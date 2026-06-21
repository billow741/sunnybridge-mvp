import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, DatePicker, Input, Tag, message, Card, Statistic, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';

export default function TeacherPayments() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    client.get('/teachers', { params: { page: 1, page_size: 100 } })
      .then(res => setTeachers(res.data.items || []))
      .catch(err => message.error(extractError(err)));
  }, []);

  const totalAmount = records.reduce((s, r) => s + r.amount, 0);
  const pendingAmount = records.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0);

  const onCreate = (values: any) => {
    const teacher = teachers.find(t => t.id === values.teacher_id);
    const newRecord = {
      id: String(Date.now()), teacher_id: values.teacher_id, teacher_name: teacher?.name || '',
      period_start: values.period_start?.format('YYYY-MM-DD'), period_end: values.period_end?.format('YYYY-MM-DD'),
      hours: values.hours || 0, hourly_rate: teacher?.hourly_rate || 0,
      amount: (values.hours || 0) * (teacher?.hourly_rate || 0), status: 'pending', note: values.note,
    };
    setRecords(r => [...r, newRecord]); message.success('结算已创建'); setModalOpen(false); form.resetFields();
  };

  const markPaid = (id: string) => {
    setRecords(r => r.map(rec => rec.id === id ? { ...rec, status: 'paid', paid_at: dayjs().format('YYYY-MM-DD') } : rec));
    message.success('已标记为已支付');
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}><Card><Statistic title="总应付" value={totalAmount} prefix="¥" /></Card></Col>
        <Col span={8}><Card><Statistic title="待付" value={pendingAmount} prefix="¥" valueStyle={{ color: '#F4A230' }} /></Card></Col>
      </Row>
      <div style={{ textAlign: 'right', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>新建结算</Button>
      </div>
      <Table dataSource={records} rowKey="id" columns={[
        { title: '教师', dataIndex: 'teacher_name' },
        { title: '周期', render: (_: any, r: any) => `${r.period_start} ~ ${r.period_end}` },
        { title: '课时', dataIndex: 'hours' },
        { title: '时薪', dataIndex: 'hourly_rate', render: (v: number) => `¥${v}` },
        { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${v.toFixed(2)}` },
        { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={s==='paid'?'green':'orange'}>{s==='paid'?'已付':'待付'}</Tag> },
        { title: '操作', render: (_: any, r: any) => r.status === 'pending' ? <Button size="small" type="primary" onClick={() => markPaid(r.id)}>确认支付</Button> : null },
      ]} />
      <Modal title="新建结算" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={560}>
        <Form form={form} layout="vertical" onFinish={onCreate}>
          <Form.Item name="teacher_id" label="教师" rules={[{ required: true }]}>
            <Select options={teachers.map(t => ({ value: t.id, label: `${t.name} (¥${t.hourly_rate}/h)` }))} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8 }}>
            <Form.Item name="period_start" label="开始日期" rules={[{ required: true }]} style={{ flex: 1 }}><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="period_end" label="结束日期" rules={[{ required: true }]} style={{ flex: 1 }}><DatePicker style={{ width: '100%' }} /></Form.Item>
          </div>
          <Form.Item name="hours" label="课时数" rules={[{ required: true }]}><InputNumber min={0} step={0.5} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="note" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
