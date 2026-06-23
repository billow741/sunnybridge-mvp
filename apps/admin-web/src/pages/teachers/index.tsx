/**
 * 教师管理 — P2 升级：Card 点击展开详情 Drawer
 * 统一交互模式：详情 Drawer + 行内操作
 */
import { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Modal, Form, Input, InputNumber, Tag, message, Avatar, Popconfirm, Empty, Spin, Drawer, Space, Typography, Divider, Descriptions, Statistic } from 'antd';
import { PlusOutlined, UserOutlined, RedoOutlined, SearchOutlined, CalendarOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, StopOutlined, PhoneOutlined, DollarOutlined, KeyOutlined, WalletOutlined } from '@ant-design/icons';
import client, { extractError } from '@/api/client';
import CourseScheduleDrawer from '@/components/CourseScheduleDrawer';

const { Text, Title } = Typography;

export default function Teachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form] = Form.useForm();

  // 详情 Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTarget, setDrawerTarget] = useState<any>(null);
  // P0-D: 当期结算卡片
  const [teacherSettlements, setTeacherSettlements] = useState<any[]>([]);

  // 排课 Drawer
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedulePrefill, setSchedulePrefill] = useState<Record<string, string>>({});

  // P0-D: 打开教师详情时加载结算数据
  const openTeacherDrawer = async (t: any) => {
    setDrawerTarget(t);
    setDrawerOpen(true);
    setTeacherSettlements([]);
    try {
      const { data: res } = await client.get('/settlements', { params: { teacher_id: t.id } });
      setTeacherSettlements(res?.items || res || []);
    } catch { /* 对账数据加载失败不影响 Drawer 打开 */ }
  };

  const load = async () => {
    setLoading(true);
    try { const { data } = await client.get('/teachers', { params: { page: 1, page_size: 100 } }); setTeachers(data.items || []); }
    catch (err) { message.error(extractError(err)); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (values: any) => {
    try {
      if (editItem) { await client.put(`/teachers/${editItem.id}`, values); } else { await client.post('/teachers', values); }
      message.success(editItem ? '更新成功' : '添加成功'); setModalOpen(false); setEditItem(null); form.resetFields(); load();
    } catch (err) { message.error(extractError(err)); }
  };

  const onDelete = async (id: string) => {
    try { await client.delete(`/teachers/${id}`); message.success('已删除'); load(); if (drawerTarget?.id === id) setDrawerOpen(false); } catch (err) { message.error(extractError(err)); }
  };

  const resetPassword = async (id: string) => {
    try { await client.post(`/auth/teacher/reset-password/${id}`); message.success('密码已重置'); } catch (err) { message.error(extractError(err)); }
  };

  const toggleActive = async (t: any) => {
    try {
      await client.put(`/teachers/${t.id}`, { is_active: !t.is_active });
      message.success(t.is_active ? '已停用' : '已启用');
      load();
    } catch (err) { message.error(extractError(err)); }
  };

  const filtered = teachers.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.phone?.includes(search)
  );

  // 详情 Drawer 内容
  const renderDrawer = () => {
    if (!drawerTarget) return null;
    const t = drawerTarget;
    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Avatar size={80} icon={<UserOutlined />} style={{ background: '#5CAADF', fontSize: 32 }} />
          <Title level={4} style={{ marginTop: 12, marginBottom: 4 }}>{t.name}</Title>
          <Space>
            <Tag color={t.is_active ? 'green' : 'default'}>{t.is_active ? '在职' : '离职'}</Tag>
            {t.must_change_password && <Tag color="orange">需改密码</Tag>}
          </Space>
        </div>

        <Card size="small" style={{ marginBottom: 12 }}>
          <Descriptions column={1} size="small" labelStyle={{ color: '#999', width: 80 }}>
            <Descriptions.Item label="用户名"><Text code>{t.username}</Text></Descriptions.Item>
            {t.phone && <Descriptions.Item label={<><PhoneOutlined /> 电话</>}>{t.phone}</Descriptions.Item>}
            {t.hourly_rate != null && (
              <Descriptions.Item label={<><DollarOutlined /> 时薪</>}>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>¥{t.hourly_rate}/h</span>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Divider style={{ margin: '8px 0' }} />

        {/* P0-D: 当期结算卡片 */}
        <Card size="small" style={{ marginBottom: 12, borderLeft: '3px solid #F4A230' }}
          title={<span><WalletOutlined style={{ marginRight: 6, color: '#F4A230' }} />当期结算</span>}
        >
          {teacherSettlements.length === 0 ? (
            <Text type="secondary">暂无结算记录</Text>
          ) : (
            <>
              <Row gutter={8} style={{ marginBottom: 8 }}>
                <Col span={12}>
                  <Statistic title="待付金额" prefix="₱" value={
                    teacherSettlements.filter(s => s.status === 'pending').reduce((a, s) => a + (s.amount || 0), 0)
                  } valueStyle={{ fontSize: 16, color: '#F4A230' }} />
                </Col>
                <Col span={12}>
                  <Statistic title="已付金额" prefix="₱" value={
                    teacherSettlements.filter(s => s.status === 'paid').reduce((a, s) => a + (s.amount || 0), 0)
                  } valueStyle={{ fontSize: 16, color: '#52c41a' }} />
                </Col>
              </Row>
              {teacherSettlements.filter(s => s.status === 'pending').slice(0, 3).map(s => (
                <div key={s.id} style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                  <Tag color="orange" style={{ marginRight: 4 }}>待付</Tag>
                  {s.period_start}~{s.period_end} · {s.hours}h · ₱{s.amount?.toLocaleString()}
                </div>
              ))}
            </>
          )}
        </Card>

        <Space wrap>
          <Button type="primary" icon={<CalendarOutlined />}
            onClick={() => { setDrawerOpen(false); setSchedulePrefill({ teacher_id: t.id }); setScheduleOpen(true); }}>
            排课
          </Button>
          <Button icon={<EditOutlined />}
            onClick={() => { setDrawerOpen(false); setEditItem(t); form.setFieldsValue(t); setModalOpen(true); }}>
            编辑
          </Button>
          <Button icon={t.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={() => toggleActive(t)}>
            {t.is_active ? '停用' : '启用'}
          </Button>
          <Popconfirm title="重置密码？" onConfirm={() => resetPassword(t.id)}>
            <Button icon={<KeyOutlined />}>重置密码</Button>
          </Popconfirm>
          <Popconfirm title="确认删除？" onConfirm={() => onDelete(t.id)}>
            <Button danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      </>
    );
  };

  return (
    <div>
      {/* Sticky filter bar */}
      <div className="sb-filter-bar">
        <Input prefix={<SearchOutlined />} placeholder="搜索教师姓名/手机号"
          size="small" style={{ width: 220 }}
          value={search} onChange={e => setSearch(e.target.value)} allowClear
        />
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} size="small"
          onClick={() => { setEditItem(null); form.resetFields(); setModalOpen(true); }}>
          添加教师
        </Button>
      </div>

      {loading ? (
        <div className="sb-spin-center"><Spin size="large" /></div>
      ) : filtered.length === 0 ? (
        <Empty description={search ? '无匹配教师' : '暂无教师'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map(t => (
            <Col xs={24} sm={12} md={8} lg={6} key={t.id}>
              <Card hoverable size="small" className="sb-fade-in"
                onClick={() => openTeacherDrawer(t)}
              >
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <Avatar size={64} icon={<UserOutlined />} style={{ background: '#5CAADF' }} />
                  <div style={{ fontWeight: 600, fontSize: 16, marginTop: 8 }}>{t.name}</div>
                  <Tag color={t.is_active ? 'green' : 'default'}>{t.is_active ? '在职' : '离职'}</Tag>
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {t.phone && <div>📱 {t.phone}</div>}
                  {t.hourly_rate != null && <div>💰 时薪: <span className="tabular">¥{t.hourly_rate}</span>/h</div>}
                  <div>👤 {t.username}</div>
                  {t.must_change_password && <Tag color="orange" style={{ marginTop: 4 }}>需改密码</Tag>}
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8 }}
                  onClick={e => e.stopPropagation()}
                >
                  <Button size="small" type="primary" icon={<CalendarOutlined />}
                    onClick={() => { setSchedulePrefill({ teacher_id: t.id }); setScheduleOpen(true); }}>排课</Button>
                  <Button size="small" onClick={() => { setEditItem(t); form.setFieldsValue(t); setModalOpen(true); }}>编辑</Button>
                  <Popconfirm title="重置密码？" onConfirm={() => resetPassword(t.id)}><Button size="small" icon={<RedoOutlined />}>重置密码</Button></Popconfirm>
                  <Popconfirm title="确认删除？" onConfirm={() => onDelete(t.id)}><Button size="small" danger>删除</Button></Popconfirm>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 教师详情 Drawer */}
      <Drawer
        title="教师详情"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={400} destroyOnClose
      >
        {renderDrawer()}
      </Drawer>

      <Modal title={editItem ? '编辑教师' : '添加教师'} open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditItem(null); }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="username" label="登录用户名" rules={[{ required: true }]}><Input disabled={!!editItem} /></Form.Item>
          <Form.Item name="phone" label="电话"><Input /></Form.Item>
          <Form.Item name="hourly_rate" label="时薪 (¥/h)"><InputNumber min={0} style={{ width: '100%' }} className="tabular" /></Form.Item>
        </Form>
      </Modal>

      {/* 排课 Drawer — 为该教师排课 */}
      <CourseScheduleDrawer
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        editingCourse={null}
        prefill={schedulePrefill}
        onSuccess={load}
      />
    </div>
  );
}
