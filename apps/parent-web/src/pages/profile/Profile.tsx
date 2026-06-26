import { useState } from 'react';
import { Card, Descriptions, Button, Modal, Form, Input, message, Divider } from 'antd';
import { LogoutOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import client, { extractError } from '@/api/client';

export default function Profile() {
  const { user, logout } = useAuthStore();
  const [form] = Form.useForm();
  const [changingPwd, setChangingPwd] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleChangePassword = async (values: { old_password: string; new_password: string }) => {
    setChangingPwd(true);
    try {
      await client.put('/auth/parent/change-password', values);
      message.success('密码修改成功');
      setModalOpen(false);
      form.resetFields();
    } catch (err) {
      message.error(extractError(err, '修改失败'));
    } finally { setChangingPwd(false); }
  };

  const doLogout = () => {
    client.post('/auth/logout').catch(() => {});
    logout();
    window.location.href = '/login';
  };

  return (
    <div>
      <Card style={{ borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 32,
            background: 'linear-gradient(135deg, #F4A230, #5CAADF)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: '#fff', fontWeight: 700,
          }}>P</div>
        </div>
        <Descriptions column={1} labelStyle={{ fontWeight: 600 }}>
          <Descriptions.Item label="手机号"><PhoneOutlined style={{ marginRight: 8 }} />{user?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="角色">家长</Descriptions.Item>
        </Descriptions>
      </Card>

      <Divider />

      <Card style={{ borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>账户设置</div>
        <Button icon={<LockOutlined />} block style={{ marginBottom: 8, textAlign: 'left', height: 44, borderRadius: 8 }} onClick={() => setModalOpen(true)}>
          修改密码
        </Button>
        <Button icon={<LogoutOutlined />} block danger style={{ textAlign: 'left', height: 44, borderRadius: 8 }} onClick={doLogout}>
          退出登录
        </Button>
      </Card>

      <Modal title="修改密码" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} confirmLoading={changingPwd}>
        <Form form={form} onFinish={handleChangePassword} layout="vertical">
          <Form.Item name="old_password" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="new_password" label="新密码" rules={[
            { required: true, message: '请输入新密码' },
            { min: 8, message: '密码至少8位' },
            { pattern: /^(?=.*[a-zA-Z])(?=.*\d)/, message: '需包含字母和数字' },
          ]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
