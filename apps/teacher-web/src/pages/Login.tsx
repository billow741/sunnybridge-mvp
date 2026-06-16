import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Form, Input, Button, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import AppLogo from '../components/AppLogo';
import { useAuthStore } from '../store/authStore';

const errorMap: Record<string, string> = {
  TEACHER_INVALID_CREDENTIALS: '用户名或密码错误',
  TEACHER_LOCKED: '账号已锁定，请稍后再试',
  TEACHER_NOT_FOUND: '用户名或密码错误',
};

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, mustChangePassword } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to={mustChangePassword ? '/change-password' : '/dashboard'} replace />;
  }

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await login(values.username, values.password);
      message.success('登录成功');
      if (res.must_change_password) {
        navigate('/change-password', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      const code = err.response?.data?.detail?.code;
      const msg = errorMap[code] || err.response?.data?.detail?.message || '登录失败，请重试';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-brand">
        <AppLogo size="lg" variant="login" />
        <h1>SunnyBridge 教师工作台</h1>
        <p>让每一堂课都更顺畅</p>
      </div>
      <div className="login-form-panel">
        <div style={{ width: '100%', maxWidth: 360 }}>
          <Typography.Title level={3} style={{ marginBottom: 8, textAlign: 'center' }}>教师登录</Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 32 }}>
            登录后查看课程安排和提交反馈
          </Typography.Text>
          <Form onFinish={handleSubmit} size="large" autoComplete="off">
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined />} placeholder="用户名" />
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
