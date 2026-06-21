/**
 * 教师结算页面
 *
 * 设计要点：
 * - 灵活时间段选择器（非固定按月），如 3月12日~4月11日
 * - 结算列表：教师 / 结算周期 / 课时数 / 时薪 / 金额 / 状态
 * - Drawer 结算明细：每节课的课时×时薪
 * - 无审批流（P2 候选）
 * - 当前使用 Mock 数据，后端 API 完成后替换
 */
import { useEffect, useState } from 'react';
import {
  Table, Button, DatePicker, Tag, Drawer, Statistic, Row, Col,
  Card, Descriptions, message, Spin, InputNumber, Form, Input, Select, Space, Typography, Tooltip, Popconfirm, Modal,
} from 'antd';
import {
  PlusOutlined, CheckOutlined, EyeOutlined, DollarOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { SettlementItem, SettlementSummary } from '@/services/settlement';
import { getSettlementList, getSettlementSummary, createSettlement, paySettlement } from '@/services/settlement';
import client, { extractError } from '@/api/client';

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function Settlements() {
  const [data, setData] = useState<SettlementItem[]>([]);
  const [summary, setSummary] = useState<SettlementSummary>({
    total_pending: 0, total_paid: 0, total_amount: 0, teacher_count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SettlementItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    dayjs().subtract(15, 'day').startOf('day'),
    dayjs().endOf('day'),
  ]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [form] = Form.useForm();

  // ── 加载 ─────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        getSettlementList(),
        getSettlementSummary(),
      ]);
      setData(listRes);
      setSummary(sumRes);
    } catch (err) {
      message.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const { data: res } = await client.get('/teachers', { params: { page: 1, page_size: 100 } });
      setTeachers(res.items || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); loadTeachers(); }, []);

  // ── 创建结算 ─────────────────────────
  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setModalOpen(false);
      form.resetFields();
      await createSettlement(values);
      message.success('结算记录已创建');
      load();
    } catch (err) {
      if (err instanceof Error) message.error(extractError(err));
    }
  };

  // ── 标记已付 ─────────────────────────
  const handlePay = async (id: string) => {
    try {
      await paySettlement(id);
      message.success('已标记为已付款');
      load();
      if (selected?.id === id) {
        setSelected({ ...selected, status: 'paid' });
      }
    } catch (err) {
      message.error(extractError(err));
    }
  };

  // ── 打开详情 Drawer ─────────────────
  const openDetail = (record: SettlementItem) => {
    setSelected(record);
    setDrawerOpen(true);
  };

  // ── 表格列 ───────────────────────────
  const columns = [
    {
      title: '教师', dataIndex: 'teacher_name', width: 120,
    },
    {
      title: '结算周期', width: 200,
      render: (_: any, r: SettlementItem) => (
        <Space>
          <CalendarOutlined style={{ color: '#5CAADF' }} />
          <span>{dayjs(r.period_start).format('YYYY/MM/DD')} — {dayjs(r.period_end).format('YYYY/MM/DD')}</span>
        </Space>
      ),
    },
    {
      title: '课时', dataIndex: 'hours', width: 70, align: 'center' as const,
      render: (v: number) => <strong>{v}h</strong>,
    },
    {
      title: '时薪', dataIndex: 'hourly_rate', width: 90, align: 'right' as const,
      render: (v: number) => (
        <Tooltip title="教师时薪 — 财务敏感信息">
          <span style={{ fontFamily: 'tabular-nums', color: '#F4A230', fontWeight: 600 }}>₱{v}</span>
        </Tooltip>
      ),
    },
    {
      title: '金额', dataIndex: 'amount', width: 100, align: 'right' as const,
      render: (v: number) => (
        <span style={{ fontFamily: 'tabular-nums', fontSize: 16, fontWeight: 700 }}>
          ₱{v.toLocaleString()}
        </span>
      ),
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (s: string) => (
        <Tag color={s === 'paid' ? 'green' : 'orange'}>
          {s === 'paid' ? '已付款' : '待付款'}
        </Tag>
      ),
    },
    {
      title: '操作', width: 160,
      render: (_: any, r: SettlementItem) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>明细</Button>
          {r.status === 'pending' && (
            <Popconfirm title="确认标记为已付款？" onConfirm={() => handlePay(r.id)}>
              <Button type="primary" size="small" icon={<CheckOutlined />}>确认付款</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ── 渲染结算明细 Drawer ──────────────
  const renderDetail = () => {
    if (!selected) return null;
    const hoursList = Array.from({ length: Math.ceil(selected.hours / 1) }, (_, i) => ({
      key: `${selected.id}-${i}`,
      date: dayjs(selected.period_start).add(i, 'day').format('YYYY/MM/DD'),
      hours: 1,
      rate: selected.hourly_rate,
      amount: selected.hourly_rate,
    }));

    return (
      <>
        {/* 周期头部 */}
        <div style={{
          background: 'linear-gradient(135deg, #fffbe6 0%, #f0f9ff 100%)',
          borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid #fff1b8',
        }}>
          <Space>
            <CalendarOutlined style={{ color: '#F4A230', fontSize: 18 }} />
            <Text strong style={{ fontSize: 15 }}>
              {dayjs(selected.period_start).format('YYYY/MM/DD')} — {dayjs(selected.period_end).format('YYYY/MM/DD')}
            </Text>
          </Space>
          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col span={6}>
              <Statistic title="总课时" value={selected.hours} suffix="h" valueStyle={{ fontSize: 20 }} />
            </Col>
            <Col span={6}>
              <Statistic title="时薪" prefix="₱" value={selected.hourly_rate} valueStyle={{ fontSize: 20, color: '#F4A230' }} />
            </Col>
            <Col span={6}>
              <Statistic title="总金额" prefix="₱" value={selected.amount}
                valueStyle={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}
              />
            </Col>
            <Col span={6}>
              <Statistic title="状态" value={selected.status === 'paid' ? '已付款' : '待付款'}
                valueStyle={{
                  fontSize: 16, fontWeight: 600,
                  color: selected.status === 'paid' ? '#52c41a' : '#F4A230',
                }}
              />
            </Col>
          </Row>
        </div>

        <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="教师">{selected.teacher_name}</Descriptions.Item>
          {selected.note && <Descriptions.Item label="备注">{selected.note}</Descriptions.Item>}
          {selected.paid_at && <Descriptions.Item label="付款时间">{selected.paid_at}</Descriptions.Item>}
        </Descriptions>

        {/* 课时明细表 */}
        <Card title="课时明细" size="small">
          <Table
            dataSource={hoursList}
            columns={[
              { title: '日期', dataIndex: 'date', width: 120 },
              { title: '课时', dataIndex: 'hours', width: 60, align: 'center' as const, render: (v: number) => `${v}h` },
              { title: '时薪', dataIndex: 'rate', width: 80, align: 'right' as const, render: (v: number) => `₱${v}` },
              { title: '小计', dataIndex: 'amount', width: 80, align: 'right' as const, render: (v: number) => <strong>₱{v}</strong> },
            ]}
            rowKey="key"
            size="small"
            pagination={false}
          />
        </Card>

        {selected.status === 'pending' && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Popconfirm title="确认标记为已付款？" onConfirm={() => handlePay(selected.id)}>
              <Button type="primary" icon={<CheckOutlined />} size="large">
                确认付款 ₱{selected.amount.toLocaleString()}
              </Button>
            </Popconfirm>
          </div>
        )}
      </>
    );
  };

  // ── 渲染 ─────────────────────────────
  return (
    <div style={{ padding: 16 }}>
      {/* KPI */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card className="sb-card">
            <Statistic title="本期应结算" prefix="₱" value={summary.total_pending}
              valueStyle={{ color: '#F4A230', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="sb-card">
            <Statistic title="已结算" prefix="₱" value={summary.total_paid}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="sb-card">
            <Statistic title="结算总额" prefix="₱" value={summary.total_amount} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="sb-card">
            <Statistic title="待结算教师" value={summary.teacher_count} suffix="人" />
          </Card>
        </Col>
      </Row>

      {/* 主表格 */}
      <Card className="sb-card"
        title={<span><DollarOutlined style={{marginRight:6}}/>教师结算</span>}
        extra={
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              结算周期可灵活选择，如 3月12日 — 4月11日
            </Text>
            <Button type="primary" icon={<PlusOutlined />} size="small"
              onClick={() => { form.resetFields(); setModalOpen(true); }}>
              新建结算
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={false}
        />
      </Card>

      {/* 详情 Drawer */}
      <Drawer
        title={<span><DollarOutlined style={{marginRight:6}}/>结算明细</span>}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
        destroyOnClose
      >
        {renderDetail()}
      </Drawer>

      {/* 新建结算 Modal */}
      <Modal
        title="新建结算记录"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        destroyOnClose
        width={480}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="teacher_id" label="教师" rules={[{ required: true }]}>
            <Select placeholder="选择教师" showSearch optionFilterProp="children">
              {teachers.map(t => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="period" label="结算周期" rules={[{ required: true }]}>
            <RangePicker
              style={{ width: '100%' }}
              format="YYYY/MM/DD"
              placeholder={['开始日期', '结束日期']}
            />
          </Form.Item>
          <Form.Item name="hours" label="课时数" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="h" />
          </Form.Item>
          <Form.Item name="hourly_rate" label="时薪" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} prefix="₱" />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
