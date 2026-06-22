/**
 * 收款记录 — 增强版
 *
 * - 统计区：本月收款 + 按 payment_method 分组 + 收款笔数
 * - 筛选：时间范围 / 学员 / 支付方式
 * - 详情 Drawer：展示完整字段
 * - 明确区分：这是收入记录，不是教师支出（settlements）
 * - 退款项只留入口占位
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Table, Card, Statistic, Row, Col, Button, Modal, Form, InputNumber,
  Select, Input, Tag, message, Popconfirm, Drawer, Descriptions, Space,
  DatePicker, Typography, Divider, Badge,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EyeOutlined, DollarOutlined,
  SearchOutlined, ReloadOutlined, UndoOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const PAYMENT_METHODS = [
  { value: 'wechat', label: '微信' },
  { value: 'alipay', label: '支付宝' },
  { value: 'bank_transfer', label: '银行转账' },
  { value: 'gcash', label: 'GCash' },
  { value: 'cash', label: '现金' },
  { value: 'other', label: '其他' },
];

const methodLabel = (v: string) => PAYMENT_METHODS.find(m => m.value === v)?.label || v || '-';
const methodColor = (v: string): string => {
  const map: Record<string, string> = {
    wechat: 'green', alipay: 'blue', bank_transfer: 'orange',
    gcash: 'purple', cash: 'default', other: 'default',
  };
  return map[v] || 'default';
};

interface Payment {
  id: string;
  child_id: string;
  child_name: string;
  payment_method: string;
  hours_purchased: number;
  amount: number;
  notes: string | null;
  status: string;
  package_id?: string | null;
  transaction_ref?: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface Stats {
  total_amount: number;
  month_amount: number;
  count: number;
  method_stats?: Record<string, number>;
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats>({ total_amount: 0, month_amount: 0, count: 0, method_stats: {} });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [form] = Form.useForm();

  // 筛选状态
  const [filterMethod, setFilterMethod] = useState<string | undefined>();
  const [filterChild, setFilterChild] = useState<string | undefined>();
  const [filterMonth, setFilterMonth] = useState<string | undefined>();

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page: 1, page_size: 100 };
      if (filterMonth) params.month = filterMonth;
      if (filterChild) params.child_id = filterChild;
      if (filterMethod) params.payment_method = filterMethod;

      const [payRes, childRes] = await Promise.all([
        client.get('/payments', { params }),
        client.get('/children', { params: { page: 1, page_size: 100 } }),
      ]);
      setPayments(payRes.data?.items || []);
      const s = payRes.data?.stats || { total_amount: 0, month_amount: 0, count: 0 };
      s.method_stats = payRes.data?.stats?.method_stats || {};
      setStats(s);
      setChildren(childRes.data?.items || []);
    } catch (err) { message.error(extractError(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterMethod, filterChild, filterMonth]);

  const onAdd = async (values: any) => {
    try {
      await client.post('/payments', {
        child_id: values.child_id,
        payment_method: values.payment_method || 'cash',
        hours_purchased: values.hours_purchased,
        amount: values.amount,
        notes: values.notes || '',
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

  const openDrawer = (r: Payment) => {
    setSelected(r);
    setDrawerOpen(true);
  };

  const columns = [
    {
      title: '收款日期', dataIndex: 'created_at', width: 110,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
      sorter: (a: Payment, b: Payment) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    { title: '学员', dataIndex: 'child_name', width: 120 },
    {
      title: '支付方式', dataIndex: 'payment_method', width: 100,
      render: (v: string) => <Tag color={methodColor(v)}>{methodLabel(v)}</Tag>,
      filters: PAYMENT_METHODS.map(m => ({ text: m.label, value: m.value })),
      onFilter: (val: any, r: Payment) => r.payment_method === val,
    },
    {
      title: '课时数', dataIndex: 'hours_purchased', width: 80, align: 'center' as const,
      render: (v: number) => v ? <Tag color="blue">{v}h</Tag> : '-',
    },
    {
      title: '金额', dataIndex: 'amount', width: 100, align: 'right' as const,
      render: (v: number) => v != null ? <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>¥{Number(v).toFixed(2)}</span> : '-',
      sorter: (a: Payment, b: Payment) => (a.amount || 0) - (b.amount || 0),
    },
    { title: '备注', dataIndex: 'notes', ellipsis: true, render: (v: string) => v || '—' },
    {
      title: '操作', width: 100, align: 'center' as const,
      render: (_: any, r: Payment) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openDrawer(r)} title="详情" />
          <Popconfirm title="确认删除？" onConfirm={() => onDelete(r.id)} okText="删除" cancelText="取消">
            <Button type="text" danger size="small" icon={<DeleteOutlined />} title="删除" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* ── 统计区 ── */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small" className="sb-card">
            <Statistic title="累计总收入" value={stats.total_amount} prefix="¥" precision={2}
              valueStyle={{ fontVariantNumeric: 'tabular-nums' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" className="sb-card">
            <Statistic title="本月收入" value={stats.month_amount} prefix="¥" precision={2}
              valueStyle={{ color: '#5CAADF', fontVariantNumeric: 'tabular-nums' }} />
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>共 {stats.count} 笔</Text>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" className="sb-card" title={null}>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>按支付方式</div>
            {stats.method_stats && Object.keys(stats.method_stats).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(stats.method_stats).map(([method, amount]) => (
                  <div key={method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Tag color={methodColor(method)} style={{ margin: 0 }}>{methodLabel(method)}</Tag>
                    <Text style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>¥{Number(amount).toFixed(2)}</Text>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary">暂无数据</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── 筛选 + 操作栏 ── */}
      <Card size="small" className="sb-card" style={{ marginBottom: 16 }}>
        <Row gutter={12} align="middle">
          <Col>
            <Text type="secondary" style={{ fontSize: 12 }}>筛选：</Text>
          </Col>
          <Col>
            <DatePicker picker="month" placeholder="月份" style={{ width: 130 }}
              onChange={(_v, ds) => setFilterMonth(typeof ds === 'string' ? ds : undefined)}
              allowClear
            />
          </Col>
          <Col>
            <Select placeholder="学员" style={{ width: 140 }} allowClear showSearch optionFilterProp="label"
              options={children.map(c => ({ value: c.id, label: c.name }))}
              onChange={v => setFilterChild(v || undefined)}
            />
          </Col>
          <Col>
            <Select placeholder="支付方式" style={{ width: 120 }} allowClear
              options={PAYMENT_METHODS}
              onChange={v => setFilterMethod(v || undefined)}
            />
          </Col>
          <Col flex="auto" />
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} size="small" onClick={load}>刷新</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加收款</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ── 列表 ── */}
      <Card size="small" className="sb-card"
        title={<span><DollarOutlined style={{ marginRight: 6 }} />收款记录</span>}
        extra={<Text type="secondary" style={{ fontSize: 11 }}>收入记录，非教师支出</Text>}
      >
        <Table dataSource={payments} rowKey="id" loading={loading} columns={columns}
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `共 ${t} 条` }}
          size="middle"
          onRow={(r) => ({ onClick: () => openDrawer(r), style: { cursor: 'pointer' } })}
        />
      </Card>

      {/* ── 详情 Drawer ── */}
      <Drawer title="收款详情" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={480}>
        {selected && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="学员">{selected.child_name}</Descriptions.Item>
              <Descriptions.Item label="金额">
                <span style={{ fontWeight: 700, fontSize: 18, color: '#5CAADF' }}>¥{Number(selected.amount).toFixed(2)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="支付方式">
                <Tag color={methodColor(selected.payment_method)}>{methodLabel(selected.payment_method)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="课时数">{selected.hours_purchased}h</Descriptions.Item>
              <Descriptions.Item label="收款日期">{dayjs(selected.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Badge status={selected.status === 'completed' ? 'success' : 'processing'} text={selected.status === 'completed' ? '已完成' : selected.status} />
              </Descriptions.Item>
              {selected.package_id && (
                <Descriptions.Item label="关联套餐">{selected.package_id}</Descriptions.Item>
              )}
              {selected.transaction_ref && (
                <Descriptions.Item label="交易号">{selected.transaction_ref}</Descriptions.Item>
              )}
              <Descriptions.Item label="备注">{selected.notes || '—'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{dayjs(selected.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              {selected.updated_at && (
                <Descriptions.Item label="更新时间">{dayjs(selected.updated_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <Space>
              <Button icon={<UndoOutlined />} disabled type="dashed">
                退款（暂未开放）
              </Button>
              <Popconfirm title="确认删除此收款记录？" onConfirm={() => { onDelete(selected.id); setDrawerOpen(false); }} okText="删除" cancelText="取消">
                <Button danger>删除</Button>
              </Popconfirm>
            </Space>
          </>
        )}
      </Drawer>

      {/* ── 添加收款弹窗 ── */}
      <Modal title="添加收款" open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()} width={520}>
        <Form form={form} layout="vertical" onFinish={onAdd}
          initialValues={{ payment_method: 'cash' }}>
          <Form.Item name="child_id" label="学员" rules={[{ required: true, message: '请选择学员' }]}>
            <Select showSearch optionFilterProp="label" placeholder="选择学员"
              options={children.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="hours_purchased" label="课时数" rules={[{ required: true, message: '请输入' }]}>
                <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} placeholder="2" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请输入' }]}>
                <InputNumber min={0} prefix="¥" style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="payment_method" label="付款方式">
            <Select options={PAYMENT_METHODS} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
