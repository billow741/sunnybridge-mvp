import { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Modal, Form, Input, InputNumber, Tag, message, Avatar, Popconfirm, Empty, Spin } from 'antd';
import { PlusOutlined, UserOutlined, RedoOutlined, SearchOutlined, CalendarOutlined } from '@ant-design/icons';
import client, { extractError } from '@/api/client';
import CourseScheduleDrawer from '@/components/CourseScheduleDrawer';

export default function Teachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form] = Form.useForm();

  // 排课 Drawer
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedulePrefill, setSchedulePrefill] = useState<Record<string, string>>({});

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
    try { await client.delete(`/teachers/${id}`); message.success('已删除'); load(); } catch (err) { message.error(extractError(err)); }
  };

  const resetPassword = async (id: string) => {
    try { await client.post(`/auth/teacher/reset-password/${id}`); message.success('密码已重置'); } catch (err) { message.error(extractError(err)); }
  };

  const filtered = teachers.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.phone?.includes(search)
  );

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
              <Card hoverable size="small" className="sb-fade-in">
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
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8 }}>
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
