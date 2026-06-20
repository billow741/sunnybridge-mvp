import { useEffect, useState } from 'react';
import { Table, Card, Statistic, Row, Col, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message, Space, Input as AntInput } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';

const PAYMENT_METHODS = ['微信', '支付宝', '银行转账', 'GCash', '现金', '其他'];

export default function Payments() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/children', { params: { page: 1, page_size: 200 } });
      setChildren(data.items || []);
    } catch (err) { message.error(extractError(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // 收款记录从children的课时变动推算（MVP暂无独立payments表）
  const payments = children.filter(c => c.totalhours > 0).map(c => ({
    id: c.id, child_name: c.name, totalhours: c.totalhours, usedhours: c.usedhours,
    remaining: c.remaining_hours ?? (c.totalhours - c.usedhours),
  }));

  const onAdd = async (values: any) => {
    try {
      const childId = values.child_id;
      const child = children.find(c => c.id === childId);
      if (!child) { message.error('学生不存在'); return; }
      await client.put(`/children/${childId}`, {
        totalhours: child.totalhours + (values.hours || 0),
      });
      message.success('收款添加成功，课时已更新');
      setModalOpen(false); form.resetFields(); load();
    } catch (err) { message.error(extractError(err)); }
  };

  const totalHours = children.reduce((s, c) => s + c.totalhours, 0);
  const usedHours = children.reduce((s, c) => s + c.usedhours, 0);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}><Card><Statistic title="总课时" value={totalHours} /></Card></Col>
        <Col span={8}><Card><Statistic title="已消耗" value={usedHours} /></Card></Col>
        <Col span={8}><Card><Statistic title="剩余" value={totalHours - usedHours} valueStyle={{ color: '#5CAADF' }} /></Card></Col>
      </Row>

      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加收款</Button>
      </div>

      <Table dataSource={payments} rowKey="id" loading={loading}
        columns={[
          { title: '学生', dataIndex: 'child_name' },
          { title: '总课时', dataIndex: 'totalhours' },
          { title: '已用', dataIndex: 'usedhours' },
          { title: '剩余', dataIndex: 'remaining', render: (v: number) => <Tag color={v < 5 ? 'red' : 'blue'}>{v}</Tag> },
        ]}
      />

      <Modal title="添加收款" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={520}>
        <Form form={form} layout="vertical" onFinish={onAdd}>
          <Form.Item name="child_id" label="学生" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={children.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="hours" label="购买课时数" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true }]}>
            <InputNumber min={0} prefix="¥" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="method" label="付款方式">
            <Select options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item name="note" label="备注"><AntInput.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
