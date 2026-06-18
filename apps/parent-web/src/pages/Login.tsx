import React, { useState } from 'react';
import { Form, Input, Button, Alert, Typography } from 'antd';
import { PhoneOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Navigate } from 'react-router-dom';
import AppLogo from '../components/AppLogo';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, fetchChildren } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/home" replace />;

  const onFinish = async (values: { phone: string; password: string }) => {
    setLoading(true);
    setError('');
    try {
      await login(values.phone, values.password);
      await fetchChildren();
      navigate('/home', { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.detail || '登录失败，请检查手机号和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(180deg, #FFFBF0 0%, #FFF5E6 100%)' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <AppLogo size="lg" variant="login" />
        <Typography.Text style={{ display: 'block', marginTop: 8, color: '#A0AEC0', fontSize: 14 }}>
          家长端 · 阳光桥在线英语
        </Typography.Text>
      </div>

      <div style={{ width: '100%', maxWidth: 360 }}>
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16, borderRadius: 12 }} />}
        <Form onFinish={onFinish} size="large">
          <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input prefix={<PhoneOutlined style={{ color: '#D48A20' }} />} placeholder="手机号" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#D48A20' }} />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 48, fontSize: 16, fontWeight: 600 }}>
              登 录
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
