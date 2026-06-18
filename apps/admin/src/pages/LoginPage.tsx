/**
 * A-LOGIN: Admin login page.
 *
 * Per IA.md / SPRINT-1 ADMIN-01:
 * - Username + password form
 * - POST /api/v1/auth/admin/login
 * - Success → save JWT to localStorage → redirect to /dashboard
 * - Error → show message (wrong credentials / locked / network)
 *
 * States: idle → loading → success / invalidCredentials / locked / networkError
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { adminLogin, type AuthErrorDetail } from '../api/auth';
import { isLoggedIn, isAdmin } from '../auth/storage';

const { Title, Text } = Typography;

interface LoginState {
  status: 'idle' | 'loading' | 'success' | 'invalidCredentials' | 'locked' | 'networkError';
  errorMessage: string | null;
  attemptsRemaining?: number;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [state, setState] = useState<LoginState>({
    status: 'idle',
    errorMessage: null,
  });

  // Already logged in as admin → redirect to dashboard
  useEffect(() => {
  if (isLoggedIn() && isAdmin()) {
  navigate('/dashboard', { replace: true });
  }
  }, [navigate]);

  const handleSubmit = async (values: { username: string; password: string }) => {
    setState({ status: 'loading', errorMessage: null });

    try {
      const result = await adminLogin({
        username: values.username,
        password: values.password,
      });

      if (result.role !== 'admin') {
        // Non-admin role — clear and reject
        setState({
          status: 'invalidCredentials',
          errorMessage: '该账号无管理员权限',
        });
        return;
      }

      setState({ status: 'success', errorMessage: null });
      navigate('/dashboard', { replace: true });
      } catch (err: unknown) {
      handleLoginError(err);
    }
  };

  const handleLoginError = (err: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosErr = err as { response?: { status?: number; data?: any } };
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;
    const detail: AuthErrorDetail | undefined =
      data?.detail && typeof data.detail === 'object' ? data.detail : undefined;

    if (status === 401) {
      const message = detail?.message ?? '用户名或密码错误';
      setState({
        status: 'invalidCredentials',
        errorMessage: detail?.attempts_remaining
          ? `${message}，还可尝试${detail.attempts_remaining}次`
          : message,
        attemptsRemaining: detail?.attempts_remaining,
      });
      form.setFieldValue('password', '');
    } else if (status === 429) {
    setState({
    status: 'locked',
    errorMessage: detail?.message ?? '登录失败次数过多，请稍后再试',
    });
    } else if (status && status >= 500) {
    setState({
    status: 'networkError',
    errorMessage: '服务器异常，请稍后重试',
    });
    } else {
    setState({
    status: 'networkError',
    errorMessage: '网络异常，请检查网络后重试',
    });
    }
  };

  const isError = state.status === 'invalidCredentials' || state.status === 'networkError';
  const isLocked = state.status === 'locked';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #5AA0DC 0%, #4090C0 100%)',
      }}
    >
      <Card
      style={{ width: 400, maxWidth: '90vw', borderRadius: 12 }}
      styles={{ body: { padding: '40px 32px' } }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div
              style={{
                width: 64,
                height: 64,
                margin: '0 auto 16px',
                borderRadius: 16,
                background: 'rgba(90, 160, 220, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserOutlined style={{ fontSize: 28, color: '#5AA0DC' }} />
            </div>
            <Title level={3} style={{ margin: 0 }}>
              SunnyBridge
            </Title>
            <Text type="secondary">阳光英语 · 教务后台</Text>
          </div>

          {/* Error alert */}
          {state.errorMessage && (
            <Alert
              type={isLocked ? 'warning' : isError ? 'error' : 'info'}
              message={state.errorMessage}
              icon={isLocked ? <LockOutlined /> : undefined}
              showIcon
              closable={false}
            />
          )}

          {/* Login form */}
          <Form
            form={form}
            onFinish={handleSubmit}
            autoComplete="off"
            size="large"
            disabled={state.status === 'loading' || state.status === 'locked'}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入用户名"
                maxLength={50}
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
                maxLength={128}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
              type="primary"
              htmlType="submit"
              block
              loading={state.status === 'loading'}
              disabled={state.status === 'locked'}
              >
              登录
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;
