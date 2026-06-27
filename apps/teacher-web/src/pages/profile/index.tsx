import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Spin, message, Descriptions, Typography, Divider, Space } from 'antd';
import { UserOutlined, PhoneOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import client, { extractError } from '@/api/client';

const { Title, Text } = Typography;

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/teachers/me');
        setProfile(data);
      } catch (err) {
        console.error(extractError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const startEdit = () => {
    form.setFieldsValue({ name: profile?.name || '', phone: profile?.phone || '' });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    form.resetFields();
  };

  const saveEdit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const { data } = await client.put('/teachers/me', values);
      setProfile(data);
      setEditing(false);
      message.success('资料更新成功');
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return; // form validation
      message.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ marginBottom: 4 }}>个人资料</Title>
        <Text type="secondary">查看和编辑您的教师信息</Text>
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: 12, borderTop: '4px solid #5CAADF' }}
      >
        {/* 顶部头像+姓名 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserOutlined style={{ color: '#5CAADF', fontSize: 28 }} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>{profile?.name || '-'}</div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              @{profile?.username || '-'} · {profile?.is_active ? '在职' : '离职'}
            </Text>
          </div>
        </div>

        <Divider style={{ margin: '0 0 20px 0' }} />

        {!editing ? (
          <>
            <Descriptions column={1} bordered size="small" labelStyle={{ width: 120, background: '#f9fafb' }}>
              <Descriptions.Item label="姓名">
                <Space><UserOutlined style={{ color: '#9ca3af' }} />{profile?.name || '-'}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="用户名">{profile?.username || '-'}</Descriptions.Item>
              <Descriptions.Item label="手机号">
                <Space><PhoneOutlined style={{ color: '#9ca3af' }} />{profile?.phone || '-'}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="时薪">
                {profile?.hourly_rate ? `¥${profile.hourly_rate}/h` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : '-'}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <Button type="primary" icon={<EditOutlined />} onClick={startEdit} style={{ background: '#5CAADF', borderColor: '#5CAADF' }}>
                编辑资料
              </Button>
            </div>
          </>
        ) : (
          <Form form={form} layout="vertical" onFinish={saveEdit}>
            <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
              <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="您的姓名" />
            </Form.Item>
            <Form.Item label="手机号" name="phone" rules={[
              { required: true, message: '请输入手机号' },
              { min: 5, max: 20, message: '手机号格式不正确' },
            ]}>
              <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} placeholder="手机号码" />
            </Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <Button icon={<CloseOutlined />} onClick={cancelEdit}>取消</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} style={{ background: '#5CAADF', borderColor: '#5CAADF' }}>
                保存
              </Button>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
}
