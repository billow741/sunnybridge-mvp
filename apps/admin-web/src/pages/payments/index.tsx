import { useEffect, useState } from 'react';
import { Table, Card, Statistic, Row, Col, Button, Modal, Form, InputNumber, Select, DatePicker, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';

const PAYMENT_METHODS = ['微信', '支付宝', '银行转账', 'GCash', '现金', '其他'];

interface Payment {
  id: string;
  child_id: string;
  child_name: string;
  date: string;
  method: string;
  hours: number;
  amount: number;
  note: string;
}

interface Stats {
  total_income: number;
  month_income: number;
  payment_count: number;
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats>({ total_income: 0, month_income: 0, payment_count: 0 });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [payRes, childRes] = await Promise.all([
        client.get('/payments', { params: { page: 1, page_size: 100 } }),
        client.get('/children', { params: { page: 1, page_size: 100 } }),
      ]);
      setPayments(payRes.data?.items || []);
      setStats(payRes.data?.stats || { total_income: 0, month_income: 0, payment_count: 0 });
      setChildren(childRes.data?.items || []);
    } catch (err) { message.error(extractError(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onAdd = async (values: any) => {
    try {
      await client.post('/payments', {
        child_id: values.child_id,
        date: values.date?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
        method: values.method || '现金',
        hours: values.hours,
        amount: values.amount,
        note: values.note || '',
      });
      message.success('收款添加成功');
      setModalOpen(false); form.resetFields(); load();
    } catch (err) { message.error(extractError(err)); }
  };

  const onDelete = async (id: string) => {
    try {
      await client.delete(`/payments/${id}`);
      message.success('已删除');
      load();
    } catch (err) { message.error(extractError(err)); }
  };

  const columns = [
    {
      title: '日期', dataIndex: 'date', width: 110,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
    },
    { title: '学生', dataIndex: 'child_name', width: 120 },
    { title: '付款方式', dataIndex: 'method', width: 100, render: (v: string) => v || '-' },
    {
      title: '课时数', dataIndex: 'hours', width: 80, align: 'center' as const,
      render: (v: number) => v ? <Tag color="blue">{v}h</Tag> : '-',
    },
    { title: '备注', dataIndex: 'note', ellipsis: true, render: (v: string) => v || '-' },
    {
      title: '金额', dataIndex: 'amount', width: 100, align: 'right' as const,
      render: (v: number) => v != null ? <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>¥{Number(v).toFixed(2)}</span> : '-',
    },
    {
      title: '操作', width: 60, align: 'center' as const,
      render: (_: any, r: Payment) => (
        <Popconfirm title="确认删除？" onConfirm={() => onDelete(r.id)} okText="删除" cancelText="取消">
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="累计总收入" value={stats.total_income} prefix="¥" precision={2}
              valueStyle={{ fontVariantNumeric: 'tabular-nums' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="本月收入" value={stats.month_income} prefix="¥" precision={2}
              valueStyle={{ color: '#5CAADF', fontVariantNumeric: 'tabular-nums' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="收款次数" value={stats.payment_count}
              valueStyle={{ color: '#F4A230' }} />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加收款</Button>
      </div>

      <Table dataSource={payments} rowKey="id" loading={loading} columns={columns}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="middle" />

      <Modal title="添加收款" open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()} width={520}>
        <Form form={form} layout="vertical" onFinish={onAdd}
          initialValues={{ date: dayjs(), method: '现金' }}>
          <Form.Item name="child_id" label="学生" rules={[{ required: true, message: '请选择学生' }]}>
            <Select showSearch optionFilterProp="label" placeholder="选择学生"
              options={children.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="date" label="日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="hours" label="课时数" rules={[{ required: true, message: '请输入' }]}>
                <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} placeholder="2" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请输入' }]}>
                <InputNumber min={0} prefix="¥" style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="method" label="付款方式">
            <Select options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
