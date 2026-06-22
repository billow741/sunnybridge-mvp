/**
 * 收款记录 — 增强版 v2
 *
 * - 统计区：本月收款 + 按 payment_method 分组 + 收款笔数
 * - 筛选：时间范围 / 学员 / 支付方式
 * - 列表：收款日期(优先payment_date) / 学员 / 方式 / 课时数 / 金额 / 备注
 * - 详情 Drawer：支付完整字段（含receipt_number/description）
 * - 编辑 Modal：可补填 payment_date / hours_purchased / receipt_number 等
 * - 明确区分：这是收入记录，不是教师支出（settlements）
 * - 退款项只留入口占位
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Row, Col, Card, Statistic, Tag, Button, Table, Space, Input,
  DatePicker, Select, Drawer, Descriptions, Modal, Form,
  InputNumber, message, Popconfirm, Typography, Tooltip,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EyeOutlined, DollarOutlined,
  SearchOutlined, ReloadOutlined, UndoOutlined, EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import client from '@/api/client';

const { Text } = Typography;

/* ── 常量 ── */
const PAYMENT_METHODS = [
  { label: '微信', value: 'wechat', color: '#07C160' },
  { label: '支付宝', value: 'alipay', color: '#1677FF' },
  { label: '现金', value: 'cash', color: '#FA541C' },
  { label: '银行转账', value: 'bank_transfer', color: '#722ED1' },
  { label: '其他', value: 'other', color: '#999' },
];

const methodLabel = (v: string) => PAYMENT_METHODS.find(m => m.value === v)?.label || v || '—';
const methodColor = (v: string) => PAYMENT_METHODS.find(m => m.value === v)?.color || '#999';

interface Payment {
  id: string; child_id: string; child_name: string;
  amount: number; hours_purchased: number;
  payment_method: string; status: string;
  payment_date?: string; receipt_number?: string; description?: string;
  notes?: string; package_id?: string; transaction_ref?: string;
  created_at: string; updated_at?: string;
}

interface Stats {
  total_amount: number; month_amount: number; count: number;
  method_stats?: Record<string, number>;
}

const extractError = (err: any) => err?.response?.data?.detail?.message || err?.response?.data?.detail || err?.message || '操作失败';

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats>({ total_amount: 0, month_amount: 0, count: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // 筛选
  const [filterMonth, setFilterMonth] = useState<string | undefined>();
  const [filterMethod, setFilterMethod] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');

  // 详情 Drawer
  const [selected, setSelected] = useState<Payment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 新建 Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  // 编辑 Modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ── 加载 ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: 20 };
      if (filterMonth) params.month = filterMonth;
      if (filterMethod) params.payment_method = filterMethod;
      const res = (await client.get('/payments', { params })).data;
      setItems(res.items || []);
      setTotal(res.total || 0);
      setStats(res.stats || { total_amount: 0, month_amount: 0, count: 0 });
      // 附带 method_stats
      if (res.stats?.method_stats) setStats(s => ({ ...s, method_stats: res.stats.method_stats }));
    } catch (err) { message.error(extractError(err)); }
    setLoading(false);
  }, [page, filterMonth, filterMethod]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(it =>
    !searchText || it.child_name?.toLowerCase().includes(searchText.toLowerCase())
      || it.notes?.toLowerCase().includes(searchText.toLowerCase())
      || it.description?.toLowerCase().includes(searchText.toLowerCase())
      || it.receipt_number?.toLowerCase().includes(searchText.toLowerCase())
  );

  /* ── 新建 ── */
  const onCreate = async () => {
    try {
      const values = await form.validateFields();
      await client.post('/payments', {
        child_id: values.child_id,
        payment_method: values.payment_method || 'cash',
        hours_purchased: values.hours_purchased,
        amount: values.amount,
        payment_date: values.payment_date?.format('YYYY-MM-DD') || null,
        receipt_number: values.receipt_number || null,
        description: values.description || null,
        notes: values.notes || null,
      });
      message.success('收款添加成功');
      setModalOpen(false); form.resetFields(); load();
    } catch (err) { message.error(extractError(err)); }
  };

  /* ── 编辑 ── */
  const openEdit = (r: Payment) => {
    setEditingId(r.id);
    editForm.setFieldsValue({
      payment_date: r.payment_date ? dayjs(r.payment_date) : undefined,
      hours_purchased: r.hours_purchased || 0,
      receipt_number: r.receipt_number || '',
      description: r.description || '',
      notes: r.notes || '',
      payment_method: r.payment_method,
    });
    setEditOpen(true);
  };

  const onSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();
      await client.put(`/payments/${editingId}`, {
        payment_date: values.payment_date?.format('YYYY-MM-DD') || null,
        hours_purchased: values.hours_purchased,
        receipt_number: values.receipt_number || null,
        description: values.description || null,
        notes: values.notes || null,
        payment_method: values.payment_method,
      });
      message.success('已更新');
      setEditOpen(false); load();
    } catch (err) { message.error(extractError(err)); }
  };

  const onDelete = async (id: string) => {
    try {
      await client.delete(`/payments/${id}`);
      message.success('已删除');
      load();
    } catch (err) { message.error(extractError(err)); }
  };

  const openDrawer = (r: Payment) => { setSelected(r); setDrawerOpen(true); };

  /* ── 日期显示：优先 payment_date，无则 fallback created_at ── */
  const displayDate = (r: Payment) => {
    if (r.payment_date) return r.payment_date;
    return r.created_at ? dayjs(r.created_at).format('YYYY-MM-DD') : '—';
  };

  /* ── 列定义 ── */
  const columns = [
    {
      title: '收款日期', width: 110,
      render: (_: any, r: Payment) => {
        const dateStr = displayDate(r);
        const isFallback = !r.payment_date && r.created_at;
        return <span style={isFallback ? { color: '#bbb' } : {}}>
          {dateStr}{isFallback && <Tooltip title="实际为记录创建日期，点击编辑可补填真实收款日期"><Tag style={{marginLeft:4,fontSize:10}} color="orange">待补</Tag></Tooltip>}
        </span>;
      },
    },
    { title: '学员', dataIndex: 'child_name', width: 120 },
    {
      title: '支付方式', dataIndex: 'payment_method', width: 100,
      render: (v: string) => <Tag color={methodColor(v)}>{methodLabel(v)}</Tag>,
    },
    {
      title: '课时数', dataIndex: 'hours_purchased', width: 80, align: 'center' as const,
      render: (v: number) => v ? <Tag color="blue">{v}h</Tag> : <Tooltip title="点击编辑可补填课时数"><Tag color="orange">待补</Tag></Tooltip>,
    },
    {
      title: '金额', dataIndex: 'amount', width: 100, align: 'right' as const,
      render: (v: number) => v != null ? <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>¥{Number(v).toFixed(2)}</span> : '—',
    },
    { title: '备注', dataIndex: 'notes', ellipsis: true, render: (v: string) => v || '—' },
    {
      title: '操作', width: 140, align: 'center' as const,
      render: (_: any, r: Payment) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openDrawer(r)} title="详情" />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} title="编辑" />
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

      {/* ── 工具栏 (sticky) ── */}
      <div className="sb-filter-bar">
        <Input placeholder="搜索学员/备注/收据号" prefix={<SearchOutlined />} style={{ width: 200 }}
          value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
        <DatePicker picker="month" placeholder="月份" style={{ width: 130 }}
          onChange={(_v, ds) => setFilterMonth(typeof ds === 'string' ? ds : undefined)}
          allowClear
        />
        <Select placeholder="支付方式" style={{ width: 120 }} allowClear
          value={filterMethod} onChange={v => setFilterMethod(v)}>
          {PAYMENT_METHODS.map(m => <Select.Option key={m.value} value={m.value}>{m.label}</Select.Option>)}
        </Select>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加收款</Button>
      </div>

      {/* ── 数据表 ── */}
      <Table<Payment>
        dataSource={filtered} columns={columns} rowKey="id"
        loading={loading} size="small" pagination={false}
      />
      {total > 20 && <div style={{ marginTop: 12, textAlign: 'right' }}>
        <Text type="secondary">共 {total} 条（第 {page} 页）</Text>
        <Space style={{ marginLeft: 8 }}>
          <Button size="small" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <Button size="small" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </Space>
      </div>}

      {/* ── 详情 Drawer ── */}
      <Drawer title="收款详情" open={drawerOpen} onClose={() => { setDrawerOpen(false); load(); }} width={480}>
        {selected && <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="学员">{selected.child_name || '—'}</Descriptions.Item>
            <Descriptions.Item label="金额">
              <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>¥{Number(selected.amount).toFixed(2)}</span>
            </Descriptions.Item>
            <Descriptions.Item label="支付方式">
              <Tag color={methodColor(selected.payment_method)}>{methodLabel(selected.payment_method)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="收款日期">
              {selected.payment_date || '—'}
              {!selected.payment_date && <Tag color="orange" style={{marginLeft:8}}>使用创建日期</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="创建日期">{selected.created_at ? dayjs(selected.created_at).format('YYYY-MM-DD HH:mm') : '—'}</Descriptions.Item>
            <Descriptions.Item label="购买课时">{selected.hours_purchased ? `${selected.hours_purchased}h` : '未填写'}</Descriptions.Item>
            <Descriptions.Item label="收据号">{selected.receipt_number || '—'}</Descriptions.Item>
            <Descriptions.Item label="说明">{selected.description || '—'}</Descriptions.Item>
            <Descriptions.Item label="交易号">{selected.transaction_ref || '—'}</Descriptions.Item>
            <Descriptions.Item label="关联课包">{selected.package_id || '—'}</Descriptions.Item>
            <Descriptions.Item label="备注">{selected.notes || '—'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selected.status === 'completed' ? 'green' : 'default'}>{selected.status === 'completed' ? '已完成' : selected.status}</Tag>
            </Descriptions.Item>
          </Descriptions>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <Button type="primary" icon={<EditOutlined />} onClick={() => { setDrawerOpen(false); openEdit(selected); }}>编辑</Button>
            <Button icon={<UndoOutlined />} disabled type="dashed">
              退款（暂未开放）
            </Button>
          </div>
        </>}
      </Drawer>

      {/* ── 新建 Modal ── */}
      <Modal title="添加收款" open={modalOpen} onOk={onCreate} onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText="确认添加" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="child_id" label="学员 ID" rules={[{ required: true, message: '请输入学员ID' }]}>
            <Input placeholder="粘贴学员 UUID" />
          </Form.Item>
          <Form.Item name="payment_method" label="支付方式" initialValue="cash">
            <Select>{PAYMENT_METHODS.map(m => <Select.Option key={m.value} value={m.value}>{m.label}</Select.Option>)}</Select>
          </Form.Item>
          <Form.Item name="hours_purchased" label="购买课时数" rules={[{ required: true, message: '请输入' }]}>
            <InputNumber min={0.5} step={0.5} addonAfter="h" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请输入' }]}>
            <InputNumber min={0} step={100} prefix="¥" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="payment_date" label="收款日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="receipt_number" label="收据号">
            <Input placeholder="如 RCV-2026-001" />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} placeholder="付款说明" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── 编辑 Modal ── */}
      <Modal title="编辑收款" open={editOpen} onOk={onSaveEdit} onCancel={() => setEditOpen(false)}
        okText="保存" cancelText="取消">
        <Form form={editForm} layout="vertical">
          <Form.Item name="payment_date" label="收款日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="hours_purchased" label="购买课时数">
            <InputNumber min={0.5} step={0.5} addonAfter="h" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="payment_method" label="支付方式">
            <Select>{PAYMENT_METHODS.map(m => <Select.Option key={m.value} value={m.value}>{m.label}</Select.Option>)}</Select>
          </Form.Item>
          <Form.Item name="receipt_number" label="收据号">
            <Input placeholder="如 RCV-2026-001" />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
