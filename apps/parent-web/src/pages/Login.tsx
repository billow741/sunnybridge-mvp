import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Form, Input, Button, message, Typography } from 'antd';
import { PhoneOutlined, LockOutlined } from '@ant-design/icons';
import AppLogo from '../components/AppLogo';
import { useAuthStore } from '../store/authStore';

const errorMap: Record<string, string> = {
  PARENT_INVALID_CREDENTIALS: '手机号或密码错误',
  PARENT_NOT_FOUND: '手机号或密码错误',
  PARENT_LOCKED: '账号已锁定，请稍后再试',
};

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  if (isAuthenticated) return <Navigate to="/home" replace />;

  const handleSubmit = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.phone, values.password);
      message.success('登录成功');
      navigate('/home', { replace: true });
    } catch (err: any) {
      const code = err.response?.data?.detail?.code;
      const msg = errorMap[code] || err.response?.data?.detail?.message || '登录失败，请重试';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="parent-login-container">
      <div className="parent-login-brand">
        <AppLogo size="lg" variant="login" />
        <h1>SunnyBridge</h1>
        <p>陪孩子更自信地开口说英语</p>
      </div>
      <div className="parent-login-form-panel">
        <div style={{ width: '100%', maxWidth: 360 }}>
          <Typography.Title level={3} style={{ marginBottom: 8, textAlign: 'center' }}>家长登录</Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 32 }}>
            查看孩子的课程和反馈
          </Typography.Text>
          <Form onFinish={handleSubmit} size="large" autoComplete="off">
            <Form.Item name="phone" rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '请输入正确的手机号' },
            ]}>
              <Input prefix={<PhoneOutlined />} placeholder="手机号" maxLength={11} />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>登录</Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
}
