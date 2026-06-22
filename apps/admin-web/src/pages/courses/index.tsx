/**
 * 课程确认流程页面
 *
 * 设计要点：
 * - 课程状态贴近数据模型：pending / completed / cancelled
 * - UI 增强提示：待补反馈、待确认课时
 * - 确认完成时弹窗预览扣课时（学员原剩余 Yh → 扣 Xh → 现剩余 Zh）
 * - courses.hours 显著展示
 * - 状态 inline 切换，仅财务影响时弹窗确认
 */
import { useEffect, useState } from 'react';
import {
  Table, Button, Tag, Modal, message, Card, Space, Descriptions,
  Statistic, Row, Col, Progress, Typography, Tooltip, Badge, Drawer,
  Select, Form, Input, Empty, Popconfirm,
} from 'antd';
import {
  CheckOutlined, EyeOutlined, CloseOutlined, ClockCircleOutlined,
  BookOutlined, ExclamationCircleOutlined, CommentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';

const { Text, Title } = Typography;

// 课程状态映射（贴近数据库）
const STATUS_MAP: Record<string, { color: string; label: string; tag: string }> = {
  pending:   { color: 'orange', label: '待上课',  tag: '数据状态' },
  completed: { color: 'green',  label: '已完成',  tag: '数据状态' },
  cancelled: { color: 'red',   label: '已取消',  tag: '数据状态' },
};

// UI 增强状态（派生提醒）
const UI_HINTS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  needs_feedback: { icon: <CommentOutlined />, color: '#F4A230', label: '待补反馈' },
  needs_confirm:  { icon: <ExclamationCircleOutlined />, color: '#5CAADF', label: '待确认课时' },
};

interface CourseRecord {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  teacher_id: string;
  teacher?: { id: string; name: string; hourly_rate?: number };
  students?: { id: string; name: string; totalhours?: number; usedhours?: number; remaining_hours?: number }[];
  status: 'pending' | 'completed' | 'cancelled';
  hours?: number;
  feedbacks?: { content: string; homework: string; notes: string }[];
  meeting_link?: string;
}

export default function CoursesPage() {
  const [data, setData] = useState<CourseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CourseRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 确认完成弹窗
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<CourseRecord | null>(null);

  // 反馈弹窗
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackForm] = Form.useForm();
  const [feedbackTarget, setFeedbackTarget] = useState<CourseRecord | null>(null);

  // ── 加载课程列表 ──────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await client.get('/courses/all', {
        params: { page: 1, page_size: 100 },
      });
      // 后端返回 children 字段，但 Ant Design 会把它当作树形子行
      // 重命名为 students 避免 Ant Design 自动渲染展开行
      const items = (res.items || []).map((c: any) => {
        const { children, ...rest } = c;
        return { ...rest, students: children };
      });
      setData(items);
    } catch (err) {
      message.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── 判断 UI 增强状态 ──────────────────
  const getHint = (r: CourseRecord): string | null => {
    if (r.status === 'completed' && (!r.feedbacks || r.feedbacks.length === 0)) {
      return 'needs_feedback';
    }
    if (r.status === 'pending' && dayjs(r.date).isBefore(dayjs(), 'day')) {
      return 'needs_confirm';
    }
    return null;
  };

  // ── 确认完成 ─────────────────────────
  const openConfirm = (record: CourseRecord) => {
    setConfirmTarget(record);
    setConfirmOpen(true);
  };

  const doConfirm = async () => {
    if (!confirmTarget) return;
    setConfirming(true);
    try {
      await client.put(`/courses/${confirmTarget.id}`, { status: 'completed' });
      message.success('课程已确认完成');
      setConfirmOpen(false);
      load();
    } catch (err) {
      message.error(extractError(err));
    } finally {
      setConfirming(false);
    }
  };

  // ── 取消课程 ─────────────────────────
  const doCancel = async (id: string) => {
    try {
      await client.put(`/courses/${id}`, { status: 'cancelled' });
      message.success('课程已取消');
      load();
      if (selected?.id === id) {
        setSelected({ ...selected, status: 'cancelled' });
      }
    } catch (err) {
      message.error(extractError(err));
    }
  };

  // ── 提交反馈 ─────────────────────────
  const openFeedback = (record: CourseRecord) => {
    setFeedbackTarget(record);
    feedbackForm.resetFields();
    setFeedbackOpen(true);
  };

  const submitFeedback = async () => {
    if (!feedbackTarget) return;
    try {
      const values = await feedbackForm.validateFields();
      await client.post('/feedbacks', {
        course_id: feedbackTarget.id,
        ...values,
      });
      message.success('反馈已提交');
      setFeedbackOpen(false);
      load();
    } catch (err) {
      if (err instanceof Error) message.error(extractError(err));
    }
  };

  // ── 查看详情 Drawer ──────────────────
  const openDetail = (record: CourseRecord) => {
    setSelected(record);
    setDrawerOpen(true);
  };

  // ── 表格列 ───────────────────────────
  const columns = [
    {
      title: '日期', dataIndex: 'date', width: 100,
      render: (v: string) => dayjs(v).format('MM/DD'),
      sorter: (a: CourseRecord, b: CourseRecord) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: '时间', width: 100,
      render: (_: any, r: CourseRecord) => `${r.start_time?.slice(0,5)}-${r.end_time?.slice(0,5)}`,
    },
    {
      title: '学员', width: 120,
      render: (_: any, r: CourseRecord) => r.students?.map(c => c.name).join(', ') || '—',
    },
    {
      title: '教师', dataIndex: ['teacher', 'name'], width: 90,
    },
    {
      title: '课时', dataIndex: 'hours', width: 70, align: 'center' as const,
      render: (v: number) => v ? (
        <span style={{ fontSize: 16, fontWeight: 700, color: '#5CAADF' }}>{v}h</span>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: '状态', dataIndex: 'status', width: 130,
      render: (s: string, r: CourseRecord) => {
        const cfg = STATUS_MAP[s] || { color: 'default', label: s };
        const hint = getHint(r);
        return (
          <Space direction="vertical" size={2}>
            <Tag color={cfg.color}>{cfg.label}</Tag>
            {hint && UI_HINTS[hint] && (
              <Tooltip title="界面提示状态（非数据库字段）">
                <Text style={{ fontSize: 11, color: UI_HINTS[hint].color }}>
                  {UI_HINTS[hint].icon} {UI_HINTS[hint].label}
                </Text>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: '操作', width: 180, fixed: 'right' as const,
      render: (_: any, r: CourseRecord) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>详情</Button>
          {r.status === 'pending' && (
            <Button type="primary" size="small" icon={<CheckOutlined />}
              onClick={() => openConfirm(r)}>确认完成</Button>
          )}
          {getHint(r) === 'needs_feedback' && (
            <Button size="small" icon={<CommentOutlined />}
              onClick={() => openFeedback(r)}>补反馈</Button>
          )}
          {r.status === 'pending' && (
            <Popconfirm title="确认取消此课程？" onConfirm={() => doCancel(r.id)}>
              <Button danger type="text" size="small" icon={<CloseOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ── 渲染确认弹窗内容（扣课时预览）──
  const renderConfirmContent = () => {
    if (!confirmTarget) return null;
    const student = confirmTarget.students?.[0];
    const hours = confirmTarget.hours || 1;
    if (!student) return <Text>无关联学员</Text>;

    const remaining = student.remaining_hours ?? ((student.totalhours ?? 0) - (student.usedhours ?? 0));
    const afterDeduct = remaining - hours;

    return (
      <div>
        <div style={{
          background: '#f0f9ff', borderRadius: 10, padding: 16,
          border: '1px solid #e6f4ff', marginBottom: 16,
        }}>
          <Text strong style={{ fontSize: 15 }}>
            <ClockCircleOutlined style={{ color: '#5CAADF', marginRight: 6 }} />
            课时扣减预览
          </Text>
          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col span={8}>
              <Statistic title="学员当前剩余" value={remaining} suffix="h"
                valueStyle={{ fontSize: 20, color: '#1e293b' }}
              />
            </Col>
            <Col span={8} style={{ textAlign: 'center' }}>
              <div style={{ paddingTop: 20 }}>
                <Text type="secondary">本次消耗</Text>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#ff4d4f' }}>
                  −{hours}h
                </div>
              </div>
            </Col>
            <Col span={8}>
              <Statistic title="确认后剩余" value={afterDeduct} suffix="h"
                valueStyle={{
                  fontSize: 24, fontWeight: 700,
                  color: afterDeduct <= 2 ? '#ff4d4f' : afterDeduct <= 5 ? '#F4A230' : '#52c41a',
                }}
              />
            </Col>
          </Row>
        </div>

        {afterDeduct <= 2 && (
          <div style={{
            background: '#fff2f0', border: '1px solid #ffccc7',
            borderRadius: 8, padding: '10px 14px', marginBottom: 12,
          }}>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 6 }} />
            <Text type="danger">
              ⚠️ 确认后该学员剩余课时将{afterDeduct < 0 ? '变为负数' : '不足 2h'}，请留意续费提醒
            </Text>
          </div>
        )}

        <Descriptions column={2} size="small">
          <Descriptions.Item label="课程日期">{dayjs(confirmTarget.date).format('YYYY/MM/DD')}</Descriptions.Item>
          <Descriptions.Item label="课时数">
            <Text strong style={{ color: '#5CAADF' }}>{hours}h</Text>
          </Descriptions.Item>
          <Descriptions.Item label="学员">{student.name}</Descriptions.Item>
          <Descriptions.Item label="教师">{confirmTarget.teacher?.name}</Descriptions.Item>
        </Descriptions>
      </div>
    );
  };

  // ── 渲染详情 Drawer ──────────────────
  const renderDetail = () => {
    if (!selected) return null;
    const hint = getHint(selected);
    const student = selected.students?.[0];

    return (
      <>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {dayjs(selected.date).format('YYYY/MM/DD')} 课程
            </Title>
            <Tag color={STATUS_MAP[selected.status]?.color}>
              {STATUS_MAP[selected.status]?.label}
            </Tag>
            {hint && UI_HINTS[hint] && (
              <Text style={{ color: UI_HINTS[hint].color }}>
                {UI_HINTS[hint].icon} {UI_HINTS[hint].label}
              </Text>
            )}
          </Space>
        </div>

        {/* 课时高亮区域 */}
        <div style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #fffbe6 100%)',
          borderRadius: 10, padding: 16, marginBottom: 16,
          border: '1px solid #e6f4ff',
        }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic title="课程课时" value={selected.hours || 1} suffix="h"
                valueStyle={{ fontSize: 24, fontWeight: 700, color: '#5CAADF' }}
                prefix={<BookOutlined />}
              />
            </Col>
            <Col span={8}>
              {student && <Statistic title="学员剩余" value={student.remaining_hours ?? 0} suffix="h"
                valueStyle={{ fontSize: 20, color: '#1e293b' }}
              />}
            </Col>
            <Col span={8}>
              {selected.teacher?.hourly_rate !== undefined && (
                <Statistic title="教师时薪" value={selected.teacher.hourly_rate} prefix="₱"
                  valueStyle={{ fontSize: 20, color: '#F4A230' }}
                />
              )}
            </Col>
          </Row>
        </div>

        <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="时间">{selected.start_time?.slice(0,5)} — {selected.end_time?.slice(0,5)}</Descriptions.Item>
          <Descriptions.Item label="教师">{selected.teacher?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="学员">{student?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="会议链接">
            {selected.meeting_link
              ? <a href={selected.meeting_link} target="_blank">进入会议</a>
              : '—'
            }
          </Descriptions.Item>
        </Descriptions>

        {/* 反馈区 */}
        {selected.feedbacks && selected.feedbacks.length > 0 ? (
          <Card title="课堂反馈" size="small" style={{ marginBottom: 16 }}>
            {selected.feedbacks.map((fb, i) => (
              <div key={i} style={{ marginBottom: i > 0 ? 16 : 0, paddingBottom: i > 0 ? 16 : 0, borderBottom: i > 0 ? '1px dashed #f0f0f0' : 'none' }}>
                {fb.content && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, color: '#333', marginBottom: 4, fontSize: 13 }}>📝 反馈内容</div>
                    <div style={{ background: '#fafafa', borderRadius: 6, padding: '8px 12px', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 13, color: '#444' }}>{fb.content}</div>
                  </div>
                )}
                {fb.homework && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, color: '#333', marginBottom: 4, fontSize: 13 }}>📚 作业</div>
                    <div style={{ background: '#fffbe6', borderRadius: 6, padding: '8px 12px', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 13, color: '#444' }}>{fb.homework}</div>
                  </div>
                )}
                {fb.notes && (
                  <div>
                    <div style={{ fontWeight: 600, color: '#333', marginBottom: 4, fontSize: 13 }}>💬 备注</div>
                    <div style={{ background: '#f6ffed', borderRadius: 6, padding: '8px 12px', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 13, color: '#666' }}>{fb.notes}</div>
                  </div>
                )}
              </div>
            ))}
          </Card>
        ) : selected.status === 'completed' && (
          <Button type="dashed" icon={<CommentOutlined />} onClick={() => openFeedback(selected)} block>
            添加课堂反馈
          </Button>
        )}

        {/* 操作区 */}
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 8 }}>
          <Space>
            {selected.status === 'pending' && (
              <Button type="primary" icon={<CheckOutlined />} onClick={() => { setDrawerOpen(false); openConfirm(selected); }}>
                确认完成
              </Button>
            )}
          </Space>
        </div>
      </>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      <Card className="sb-card"
        title={<span><BookOutlined style={{marginRight:6}}/>课程管理</span>}
        extra={
          <Space>
            <Text type="secondary">数据状态：pending / completed / cancelled</Text>
            <Text type="secondary" style={{ color: '#F4A230' }}>｜ UI 提示：待补反馈 / 待确认课时</Text>
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
          scroll={{ x: 800, y: 'calc(100vh - 180px)' }}
        />
      </Card>

      {/* 确认完成弹窗 — 扣课时预览 */}
      <Modal
        title={<span><CheckOutlined style={{color:'#52c41a',marginRight:6}}/>确认课程完成</span>}
        open={confirmOpen}
        onOk={doConfirm}
        onCancel={() => setConfirmOpen(false)}
        confirmLoading={confirming}
        okText="确认完成（扣减课时）"
        width={520}
        destroyOnClose
      >
        {renderConfirmContent()}
      </Modal>

      {/* 反馈弹窗 */}
      <Modal
        title="添加课堂反馈"
        open={feedbackOpen}
        onOk={submitFeedback}
        onCancel={() => setFeedbackOpen(false)}
        destroyOnClose
        width={480}
      >
        <Form form={feedbackForm} layout="vertical" preserve={false}>
          <Form.Item name="content" label="反馈内容" rules={[{ required: true, message: '请输入反馈' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="homework" label="作业布置">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情 Drawer */}
      <Drawer
        title="课程详情"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
        destroyOnClose
      >
        {renderDetail()}
      </Drawer>
    </div>
  );
}
