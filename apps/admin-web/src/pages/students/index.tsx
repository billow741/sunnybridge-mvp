/**
 * 学员 Split View — 左侧列表 + 右侧详情同屏
 *
 * 设计要点：
 * - 课时真相面板（只读计算值）：totalhours / usedhours / remaining_hours
 * - remaining_hours 语义色：≥5 绿 / 2-5 黄 / ≤2 红
 * - 详情内 tab：概览 / 课程记录 / 课时变化
 * - packages 不再作为主逻辑，仅历史兼容
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Tag, Descriptions, Statistic, Row, Col,
  Card, Form, Input, Select, Modal, InputNumber, message,
  Progress, Space, Typography, Tooltip, Empty, Tabs,
} from 'antd';
import {
  PlusOutlined, UserOutlined, PhoneOutlined,
  SearchOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  BookOutlined, HistoryOutlined, TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';

const { Text } = Typography;

// ── 类型 ──────────────────────────────
interface Student {
  id: string;
  name: string;
  english_name?: string;
  birth_date?: string;
  level?: string;
  parent_id?: string;
  parent?: { phone?: string; nickname?: string };
  totalhours?: number;
  usedhours?: number;
  remaining_hours?: number;
}

interface CourseRecord {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  teacher?: { name: string };
  status: 'pending' | 'completed' | 'cancelled';
  hours?: number;
}

// ── 语义色 ────────────────────────────
const hoursColor = (h: number) =>
  h <= 2 ? '#ff4d4f' : h <= 5 ? '#F4A230' : '#52c41a';

const LEVEL_COLORS: Record<string, string> = {
  L1: 'green', L2: 'cyan', L3: 'blue', L4: 'purple', L5: 'orange', L6: 'red',
};

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending:   { color: 'orange', label: '待上课' },
  completed: { color: 'green',  label: '已完成' },
  cancelled: { color: 'red',   label: '已取消' },
};

export default function Students() {
  const [data, setData] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<Student | null>(null);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [form] = Form.useForm();

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm] = Form.useForm();

  // ── 加载列表 ─────────────────────────
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await client.get('/children', {
        params: { page, page_size: pageSize, search: search || undefined },
      });
      const items = (res.items || res || []) as Student[];
      const enriched = items.map((s: Student) => ({
        ...s,
        remaining_hours: s.remaining_hours ?? ((s.totalhours ?? 0) - (s.usedhours ?? 0)),
      }));
      setData(enriched);
      setTotal(res.total ?? enriched.length);
    } catch (err) {
      message.error(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── 选中学员 → 加课程 ────────────────
  const selectStudent = async (record: Student) => {
    setSelected(record);
    setCoursesLoading(true);
    try {
      const { data: cRes } = await client.get('/courses/all', {
        params: { page: 1, page_size: 100 },
      });
      const all = cRes.items || [];
      const mine = all.filter((c: any) =>
        c.children?.some?.((ch: any) => ch.id === record.id),
      );
      setCourses(mine);
    } catch {
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  // ── 新建/编辑提交 ────────────────────
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setModalLoading(true);
      if (editingStudent) {
        await client.put(`/children/${editingStudent.id}`, values);
        message.success('更新成功');
      } else {
        await client.post('/children', values);
        message.success('创建成功');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingStudent(null);
      fetchList();
    } catch (err) {
      if (err instanceof Error) message.error(extractError(err));
    } finally {
      setModalLoading(false);
    }
  };

  // ── 课时调整 ─────────────────────────
  const handleAdjust = async () => {
    if (!selected) return;
    try {
      const values = await adjustForm.validateFields();
      const newTotal = (selected.totalhours ?? 0) + (values.delta || 0);
      if (newTotal < (selected.usedhours ?? 0)) {
        message.error('总课时不能小于已用课时');
        return;
      }
      await client.put(`/children/${selected.id}`, { totalhours: newTotal });
      message.success('课时调整成功');
      setAdjustOpen(false);
      adjustForm.resetFields();
      fetchList();
      const { data: fresh } = await client.get(`/children/${selected.id}`);
      setSelected({ ...selected, ...fresh });
    } catch (err) {
      if (err instanceof Error) message.error(extractError(err));
    }
  };

  // ── 表格列 ───────────────────────────
  const columns = [
    {
      title: '姓名', dataIndex: 'name', width: 120,
      render: (name: string, r: Student) => (
        <Button type="link" size="small" onClick={() => selectStudent(r)} style={{ padding: 0 }}>
          {name}
        </Button>
      ),
    },
    {
      title: '英文名', dataIndex: 'english_name', width: 100,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: '级别', dataIndex: 'level', width: 60,
      render: (v: string) => v ? <Tag color={LEVEL_COLORS[v]}>{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: '总课时', dataIndex: 'totalhours', width: 70, align: 'center' as const,
      render: (v: number) => <span className="tabular">{v ?? 0}</span>,
    },
    {
      title: '已用', dataIndex: 'usedhours', width: 60, align: 'center' as const,
      render: (v: number) => <Text type="secondary" className="tabular">{v ?? 0}</Text>,
    },
    {
      title: '剩余课时', dataIndex: 'remaining_hours', width: 110, align: 'center' as const,
      render: (h: number) => {
        const hrs = h ?? 0;
        return (
          <Tooltip title={hrs <= 2 ? '告急' : hrs <= 5 ? '偏少' : '充足'}>
            <span style={{ fontSize: 16, fontWeight: 700, color: hoursColor(hrs) }} className="tabular">
              {hrs}h
            </span>
            {hrs <= 2 && <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginLeft: 4 }} />}
          </Tooltip>
        );
      },
    },
    {
      title: '家长手机', dataIndex: ['parent', 'phone'], width: 130,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
  ];

  // ── 课程子列 ─────────────────────────
  const courseColumns = [
    {
      title: '日期', dataIndex: 'date', width: 100,
      render: (v: string) => dayjs(v).format('MM/DD'),
    },
    {
      title: '时间', width: 100,
      render: (_: any, r: CourseRecord) => `${r.start_time?.slice(0,5)}-${r.end_time?.slice(0,5)}`,
    },
    { title: '教师', dataIndex: ['teacher', 'name'], width: 80 },
    {
      title: '课时', dataIndex: 'hours', width: 60, align: 'center' as const,
      render: (v: number) => v ? <strong className="tabular">{v}</strong> : <Text type="secondary">—</Text>,
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (s: string) => {
        const cfg = STATUS_MAP[s] || { color: 'default', label: s };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
  ];

  // ── 渲染 ─────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* 左侧列表 */}
      <div style={{
        flex: selected ? '0 0 55%' : '1 1 100%',
        minWidth: 0, padding: 16, paddingRight: selected ? 8 : 16,
        overflow: 'auto', transition: 'flex 0.2s ease',
      }}>
        <Card className="sb-card" style={{ height: '100%' }}
          title={<span><TeamOutlined style={{marginRight:6}}/>学员管理</span>}
          extra={
            <Space>
              <Input
                placeholder="搜索姓名/手机号" prefix={<SearchOutlined />}
                size="small" style={{ width: 180 }}
                value={search} onChange={e => setSearch(e.target.value)} allowClear
              />
              <Button type="primary" icon={<PlusOutlined />} size="small"
                onClick={() => { setEditingStudent(null); form.resetFields(); setModalOpen(true); }}>
                新建
              </Button>
            </Space>
          }
        >
          {data.filter(s => (s.remaining_hours ?? 0) <= 2).length > 0 && (
            <div style={{
              background: '#fff2f0', border: '1px solid #ffccc7',
              borderRadius: 8, padding: '8px 12px', marginBottom: 12,
            }}>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 6 }} />
              <Text type="danger">
                {data.filter(s => (s.remaining_hours ?? 0) <= 2).length} 名学员课时告急（≤2h）
              </Text>
            </div>
          )}

          <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small"
            pagination={{
              current: page, pageSize, total, showSizeChanger: true,
              showTotal: t => `共 ${t} 人`,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            }}
            onRow={(record) => ({
              onClick: () => selectStudent(record),
              style: { cursor: 'pointer', background: selected?.id === record.id ? '#e6f4ff' : undefined },
            })}
            scroll={{ y: 'calc(100vh - 260px)' }}
          />
        </Card>
      </div>

      {/* 右侧详情面板 */}
      {selected && (
        <div className="sb-slide-in" style={{
          flex: '0 0 45%', padding: 16, paddingLeft: 8, overflow: 'auto',
        }}>
          <Card className="sb-card" style={{ height: '100%' }}
            title={
              <Space>
                <UserOutlined />
                <span style={{ fontSize: 16, fontWeight: 600 }}>{selected.name}</span>
                {selected.english_name && <Text type="secondary">{selected.english_name}</Text>}
                {selected.level && <Tag color={LEVEL_COLORS[selected.level]}>{selected.level}</Tag>}
              </Space>
            }
            extra={
              <Space>
                <Button size="small" onClick={() => {
                  setEditingStudent(selected);
                  form.setFieldsValue(selected);
                  setModalOpen(true);
                }}>编辑</Button>
                <Button size="small" type="text" onClick={() => setSelected(null)}>✕</Button>
              </Space>
            }
          >
            {/* 课时真相面板 */}
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #f0f5ff 100%)',
              borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid #e6f4ff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <ClockCircleOutlined style={{ color: '#5CAADF', marginRight: 6 }} />
                <Text strong>⏱ 课时真相（只读计算值）</Text>
              </div>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="总课时" value={selected.totalhours ?? 0} suffix="h"
                    valueStyle={{ fontSize: 20 }} className="tabular" />
                </Col>
                <Col span={8}>
                  <Statistic title="已用" value={selected.usedhours ?? 0} suffix="h"
                    valueStyle={{ fontSize: 20, color: '#666' }} className="tabular" />
                </Col>
                <Col span={8}>
                  <Statistic title="剩余" value={selected.remaining_hours ?? 0} suffix="h"
                    valueStyle={{
                      fontSize: 24, fontWeight: 700,
                      color: hoursColor(selected.remaining_hours ?? 0),
                    }}
                    prefix={(() => {
                      const h = selected.remaining_hours ?? 0;
                      return h <= 2 ? <ExclamationCircleOutlined /> : undefined;
                    })()}
                    className="tabular"
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 8 }}>
                <Progress
                  percent={selected.totalhours ? Math.round(((selected.usedhours ?? 0) / selected.totalhours) * 100) : 0}
                  strokeColor={hoursColor(selected.remaining_hours ?? 0)}
                  size="small" format={p => `${p}%`}
                />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  remaining_hours = totalhours − usedhours（只读，不可直接编辑）
                </Text>
              </div>
              <Button size="small" type="dashed" style={{ marginTop: 8 }}
                onClick={() => { adjustForm.resetFields(); setAdjustOpen(true); }}>
                调整总课时
              </Button>
            </div>

            {/* 基本信息 */}
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="英文名">{selected.english_name || '—'}</Descriptions.Item>
              <Descriptions.Item label="出生日期">{selected.birth_date || '—'}</Descriptions.Item>
              <Descriptions.Item label="家长手机">{selected.parent?.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="学员">{selected.name}{selected.english_name ? selected.english_name : ''}</Descriptions.Item>
            </Descriptions>

            {/* Tab */}
            <Tabs defaultActiveKey="courses" size="small" items={[
              {
                key: 'courses',
                label: <span><BookOutlined /> 课程记录</span>,
                children: (
                  <Table dataSource={courses} columns={courseColumns} rowKey="id"
                    size="small" loading={coursesLoading} pagination={false}
                    locale={{ emptyText: <Empty description="暂无课程记录" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                    scroll={{ y: 280 }}
                  />
                ),
              },
              {
                key: 'hours-log',
                label: <span><HistoryOutlined /> 课时变化</span>,
                children: <Empty description="课时变化记录待后端支持" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
              },
            ]} />
          </Card>
        </div>
      )}

      {/* 新建/编辑 Modal */}
      <Modal title={editingStudent ? '编辑学员' : '新建学员'}
        open={modalOpen} onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={modalLoading} destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item name="english_name" label="英文名"><Input /></Form.Item>
          <Form.Item name="parent_phone" label="家长手机号" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input prefix={<PhoneOutlined />} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="birth_date" label="出生日期"><Input type="date" /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="level" label="级别">
                <Select placeholder="选择级别" allowClear>
                  {['L1','L2','L3','L4','L5','L6'].map(l => (
                    <Select.Option key={l} value={l}>{l}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="totalhours" label="初始总课时" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="h" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 课时调整 Modal */}
      <Modal title="调整总课时" open={adjustOpen} onOk={handleAdjust}
        onCancel={() => setAdjustOpen(false)} destroyOnClose width={400}
      >
        {selected && (
          <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
            <Text>当前总课时：<strong className="tabular">{selected.totalhours ?? 0}h</strong></Text><br/>
            <Text>已用课时：<strong className="tabular">{selected.usedhours ?? 0}h</strong></Text><br/>
            <Text>剩余：<strong style={{ color: hoursColor(selected.remaining_hours ?? 0) }} className="tabular">
              {selected.remaining_hours ?? 0}h
            </strong></Text>
          </div>
        )}
        <Form form={adjustForm} layout="vertical" preserve={false}>
          <Form.Item name="delta" label="调整量（正数增加，负数减少）" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} addonAfter="h" />
          </Form.Item>
          <Form.Item name="reason" label="原因">
            <Select placeholder="选择调整原因">
              <Select.Option value="赠送课时">赠送课时</Select.Option>
              <Select.Option value="系统调整">系统调整</Select.Option>
              <Select.Option value="补偿课时">补偿课时</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
