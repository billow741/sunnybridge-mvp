import { useState } from 'react';
import { Form, Input, Button, Alert, message } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client, { extractError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import AppLogo from '@/components/AppLogo';

export default function ChangePassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const onFinish = async (values: { current_password: string; new_password: string }) => {
    setLoading(true); setError('');
    try {
      await client.post('/auth/teacher/change-password', { old_password: values.current_password, new_password: values.new_password });
      setSuccess(true);
      setTimeout(async () => { await logout(); navigate('/login', { replace: true }); }, 2000);
    } catch (err) { setError(extractError(err, '密码修改失败')); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7FAFC' }}>
      <div style={{ width: 400, padding: '40px 32px', background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <AppLogo collapsed={true} />
          <div style={{ fontSize: 15, color: '#64748B', marginTop: 8 }}>修改密码</div>
        </div>
        {success && <Alert type="success" message="密码修改成功！即将跳转登录页..." showIcon icon={<CheckCircleOutlined />} style={{ marginBottom: 20 }} />}
        {error && <Alert type="error" message={error} showIcon closable onClose={() => setError('')} style={{ marginBottom: 20 }} />}
        <Form layout="vertical" onFinish={onFinish} size="large" disabled={success}>
          <Form.Item name="current_password" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8' }} />} placeholder="当前密码" />
          </Form.Item>
          <Form.Item name="new_password" label="新密码" rules={[
            { required: true, message: '请输入新密码' },
            { min: 8, message: '至少8个字符' },
            { pattern: /[A-Z]/, message: '需包含大写字母' },
            { pattern: /[0-9]/, message: '需包含数字' },
          ]} hasFeedback>
            <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8' }} />} placeholder="新密码" />
          </Form.Item>
          <Form.Item name="confirm_password" label="确认新密码" dependencies={['new_password']} rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('new_password') === value) return Promise.resolve(); return Promise.reject(new Error('两次密码不一致')); } }),
          ]} hasFeedback>
            <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8' }} />} placeholder="确认新密码" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 44, fontWeight: 600 }}>修改密码</Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
