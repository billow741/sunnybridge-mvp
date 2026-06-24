/**
 * 教师结算页面
 *
 * 设计要点：
 * - 灵活时间段选择器（非固定按月），如 3月12日~4月11日
 * - 结算列表：教师 / 结算周期 / 课时数 / 时薪 / 金额 / 状态
 * - Drawer 结算明细：每节课的课时×时薪
 * - 新建结算时选择教师+时间段后自动统计课时数
 * - 无审批流（P2 候选）
 */
import { useEffect, useState } from 'react';
import {
  Table, Button, DatePicker, Tag, Drawer, Statistic, Row, Col,
  Card, Descriptions, message, Spin, InputNumber, Form, Input, Select, Space, Typography, Tooltip, Popconfirm, Modal,
} from 'antd';
import {
  PlusOutlined, CheckOutlined, EyeOutlined, DollarOutlined,
  CalendarOutlined, LoadingOutlined, DownloadOutlined,
  AuditOutlined, SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { SettlementItem, SettlementSummary } from '@/services/settlement';
import { getSettlementList, getSettlementSummary, createSettlement, paySettlement, calcSettlementHours, submitApproval } from '@/services/settlement';
import client, { extractError } from '@/api/client';
import { useExportCSV } from '@/hooks/useExportCSV';

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function Settlements() {
  const [data, setData] = useState<SettlementItem[]>([]);
  const [summary, setSummary] = useState<SettlementSummary>({
    total_pending: 0, total_paid: 0, total_amount: 0, teacher_count: 0,
  });
  const { exportCSV, exporting } = useExportCSV('settlements');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SettlementItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [form] = Form.useForm();

  // ── 自动计算课时相关状态 ──
  const [calcHours, setCalcHours] = useState<number | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcCourseCount, setCalcCourseCount] = useState(0);
  const [selectedTeacherRate, setSelectedTeacherRate] = useState<number | null>(null);

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

  // ── 自动计算课时 ──────────────────────
  const handleAutoCalc = async () => {
    const teacherId = form.getFieldValue('teacher_id');
    const period = form.getFieldValue('period');

    if (!teacherId || !period || !period[0] || !period[1]) {
      message.warning('请先选择教师和结算周期');
      return;
    }

    setCalcLoading(true);
    try {
      const start = period[0].format('YYYY-MM-DD');
      const end = period[1].format('YYYY-MM-DD');
      const result = await calcSettlementHours(teacherId, start, end);

      setCalcHours(result.total_hours);
      setCalcCourseCount(result.course_count);
      form.setFieldsValue({ hours: result.total_hours });

      // 自动填充时薪（如果教师有时薪设置）
      const teacher = teachers.find((t: any) => t.id === teacherId);
      if (teacher?.hourly_rate && !form.getFieldValue('hourly_rate')) {
        form.setFieldsValue({ hourly_rate: teacher.hourly_rate });
        setSelectedTeacherRate(teacher.hourly_rate);
      }
    } catch (err) {
      message.error(extractError(err));
      setCalcHours(null);
      setCalcCourseCount(0);
    } finally {
      setCalcLoading(false);
    }
  };

  // 教师选择变化时更新时薪
  const handleTeacherChange = (teacherId: string) => {
    const teacher = teachers.find((t: any) => t.id === teacherId);
    if (teacher?.hourly_rate) {
      form.setFieldsValue({ hourly_rate: teacher.hourly_rate });
      setSelectedTeacherRate(teacher.hourly_rate);
    }
    // 重置计算结果
    setCalcHours(null);
    setCalcCourseCount(0);
    form.setFieldsValue({ hours: undefined });
  };

  // 时间段变化时重置计算结果
  const handlePeriodChange = () => {
    setCalcHours(null);
    setCalcCourseCount(0);
    form.setFieldsValue({ hours: undefined });
  };

  // ── 创建结算 ─────────────────────────
  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        teacher_id: values.teacher_id,
        period_start: values.period[0].format('YYYY-MM-DD'),
        period_end: values.period[1].format('YYYY-MM-DD'),
        hours: values.hours,
        hourly_rate: values.hourly_rate,
        note: values.note,
      };
      await createSettlement(payload);
      message.success('结算记录已创建');
      setModalOpen(false);
      form.resetFields();
      setCalcHours(null);
      setCalcCourseCount(0);
      load();
    } catch (err) {
      if (err instanceof Error) message.error(extractError(err));
    }
  };

  // ── 付款确认弹窗 ──────────────────────
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingSettlement, setPayingSettlement] = useState<SettlementItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');

  const openPayModal = (record: SettlementItem) => {
    setPayingSettlement(record);
    setPaymentMethod('bank_transfer');
    setPayModalOpen(true);
  };

  const handlePay = async () => {
    if (!payingSettlement) return;
    try {
      await paySettlement(payingSettlement.id, paymentMethod);
      message.success('已标记为已付款');
      setPayModalOpen(false);
      load();
      if (selected?.id === payingSettlement.id) {
        setSelected({ ...selected, status: 'paid', payment_method: paymentMethod });
      }
    } catch (err) {
      message.error(extractError(err));
    }
  };

  // ── 提交审批 ─────────────────────────
  const handleSubmitApproval = async (record: SettlementItem) => {
    try {
      await submitApproval('settlement', record.id);
      message.success('审批已提交');
      load();
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
      title: '审批', dataIndex: 'approval_status', width: 90,
      render: (s: string) => {
        const map: Record<string, { color: string; label: string }> = {
          not_required: { color: 'default', label: '无需审批' },
          pending: { color: 'processing', label: '待审批' },
          approved: { color: 'success', label: '已通过' },
          rejected: { color: 'error', label: '已驳回' },
        };
        const cfg = map[s] || map.not_required;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '操作', width: 200,
      render: (_: any, r: SettlementItem) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>明细</Button>
          {r.status === 'pending' && r.approval_status === 'pending' && (
            <Tooltip title="审批中，无法付款">
              <Button type="primary" size="small" icon={<AuditOutlined />} disabled>待审批</Button>
            </Tooltip>
          )}
          {r.status === 'pending' && (r.approval_status === 'not_required' || r.approval_status === 'approved') && (
            <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => openPayModal(r)}>确认付款</Button>
          )}
          {r.status === 'pending' && (r.approval_status === 'not_required' || r.approval_status === 'rejected') && (
            <Button size="small" icon={<SendOutlined />} onClick={() => handleSubmitApproval(r)}>提交审批</Button>
          )}
          {r.status === 'pending' && r.approval_status === 'rejected' && (
            <Tag color="error" style={{ fontSize: 11 }}>已驳回</Tag>
          )}
        </Space>
      ),
    },
  ];

  // ── 渲染结算明细 Drawer ──────────────
  const renderDetail = () => {
    if (!selected) return null;

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
          {selected.payment_method && <Descriptions.Item label="付款方式">{selected.payment_method}</Descriptions.Item>}
          {selected.note && <Descriptions.Item label="备注">{selected.note}</Descriptions.Item>}
          {selected.paid_at && <Descriptions.Item label="付款时间">{selected.paid_at}</Descriptions.Item>}
        </Descriptions>

        {selected.status === 'pending' && selected.approval_status === 'pending' && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Tooltip title="审批中，无法付款">
              <Button type="primary" icon={<AuditOutlined />} size="large" disabled>
                待审批 ₱{selected.amount.toLocaleString()}
              </Button>
            </Tooltip>
          </div>
        )}
        {selected.status === 'pending' && (selected.approval_status === 'not_required' || selected.approval_status === 'approved') && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<CheckOutlined />} size="large"
              onClick={() => openPayModal(selected)}>
              确认付款 ₱{selected.amount.toLocaleString()}
            </Button>
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
            <Button icon={<DownloadOutlined />} size="small" loading={exporting}
              onClick={() => exportCSV()}>导出</Button>
            <Button type="primary" icon={<PlusOutlined />} size="small"
              onClick={() => {
                form.resetFields();
                setCalcHours(null);
                setCalcCourseCount(0);
                setModalOpen(true);
              }}>
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

      {/* 新建结算 Modal ─ 含自动计算课时 */}
      <Modal
        title="新建结算记录"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); setCalcHours(null); setCalcCourseCount(0); }}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="teacher_id" label="教师" rules={[{ required: true }]}>
            <Select placeholder="选择教师" showSearch optionFilterProp="children"
              onChange={handleTeacherChange}
            >
              {teachers.map(t => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name}{t.hourly_rate ? ` (₱${t.hourly_rate}/h)` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="period" label="结算周期" rules={[{ required: true }]}>
            <RangePicker
              style={{ width: '100%' }}
              format="YYYY/MM/DD"
              placeholder={['开始日期', '结束日期']}
              onChange={handlePeriodChange}
            />
          </Form.Item>

          {/* 自动计算课时按钮 + 结果 */}
          <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
            <Space style={{ marginBottom: 8 }}>
              <Button
                type="dashed"
                icon={calcLoading ? <LoadingOutlined /> : <CalendarOutlined />}
                onClick={handleAutoCalc}
                loading={calcLoading}
                style={{ borderColor: '#52c41a', color: '#52c41a' }}
              >
                自动统计课时
              </Button>
              <Text type="secondary" style={{ fontSize: 12 }}>
                选择教师+时间段后点击，自动统计该时段课时
              </Text>
            </Space>
            {calcHours !== null && (
              <div style={{ marginTop: 8 }}>
                <Text strong style={{ color: '#52c41a', fontSize: 15 }}>
                  📊 统计结果：{calcHours}h 课时 / {calcCourseCount} 节课
                </Text>
              </div>
            )}
          </div>

          <Form.Item name="hours" label="课时数" rules={[{ required: true }]}
            extra={calcHours !== null ? `已自动填入：${calcHours}h（可手动修改）` : '点击上方按钮自动统计，或手动输入'}
          >
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} addonAfter="h" />
          </Form.Item>
          <Form.Item name="hourly_rate" label="时薪" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} prefix="₱"
              placeholder={selectedTeacherRate ? `教师默认时薪 ₱${selectedTeacherRate}` : '输入时薪'}
            />
          </Form.Item>

          {/* 金额预览 */}
          {form.getFieldValue('hours') && form.getFieldValue('hourly_rate') && (
            <div style={{
              padding: '8px 12px', background: '#fff7e6', borderRadius: 8,
              border: '1px solid #ffd591', marginBottom: 16,
            }}>
              <Text>结算金额：</Text>
              <Text strong style={{ fontSize: 18, color: '#F4A230' }}>
                ₱{(form.getFieldValue('hours') * form.getFieldValue('hourly_rate')).toLocaleString()}
              </Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({form.getFieldValue('hours')}h × ₱{form.getFieldValue('hourly_rate')})
              </Text>
            </div>
          )}

          <Form.Item name="note" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 付款确认 Modal */}
      <Modal
        title="确认付款"
        open={payModalOpen}
        onOk={handlePay}
        onCancel={() => setPayModalOpen(false)}
        okText="确认付款"
        okButtonProps={{ icon: <CheckOutlined /> }}
        width={420}
      >
        {payingSettlement && (
          <div>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="教师">{payingSettlement.teacher_name}</Descriptions.Item>
              <Descriptions.Item label="金额">
                <Text strong style={{ fontSize: 18, color: '#F4A230' }}>₱{payingSettlement.amount.toLocaleString()}</Text>
              </Descriptions.Item>
            </Descriptions>
            <Form layout="vertical">
              <Form.Item label="付款方式" style={{ marginBottom: 0 }}>
                <Select value={paymentMethod} onChange={setPaymentMethod} style={{ width: '100%' }}>
                  <Select.Option value="bank_transfer">银行转账</Select.Option>
                  <Select.Option value="gcash">GCash</Select.Option>
                  <Select.Option value="cash">现金</Select.Option>
                  <Select.Option value="other">其他</Select.Option>
                </Select>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
