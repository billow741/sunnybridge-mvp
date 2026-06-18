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
import { Form, Input, Button, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { adminLogin, type AuthErrorDetail } from '../api/auth';
import { isLoggedIn, isAdmin } from '../auth/storage';

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
        background: '#fff',
      }}
    >
      {/* Left brand section */}
      <div
        className="login-left-panel"
        style={{
          width: '60%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #5AA0DC 0%, #3A8BC7 100%)',
          position: 'relative',
          padding: 48,
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="32" cy="32" r="14" fill="#5AA0DC" />
            <g stroke="#5AA0DC" strokeWidth="3" strokeLinecap="round">
              <line x1="32" y1="4" x2="32" y2="12" />
              <line x1="32" y1="52" x2="32" y2="60" />
              <line x1="4" y1="32" x2="12" y2="32" />
              <line x1="52" y1="32" x2="60" y2="32" />
              <line x1="12.2" y1="12.2" x2="17.8" y2="17.8" />
              <line x1="46.2" y1="46.2" x2="51.8" y2="51.8" />
              <line x1="12.2" y1="51.8" x2="17.8" y2="46.2" />
              <line x1="46.2" y1="17.8" x2="51.8" y2="12.2" />
            </g>
          </svg>
        </div>

        {/* Titles */}
        <h1
          style={{
            color: '#fff',
            fontSize: 48,
            fontWeight: 700,
            margin: '0 0 8px',
            letterSpacing: 2,
          }}
        >
          SunnyBridge
        </h1>
        <span
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: 18,
            fontWeight: 400,
          }}
        >
          阳光英语 · 教务后台
        </span>

        {/* Bottom decorative dots */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 12,
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.5)',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.35)',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'inline-block',
            }}
          />
        </div>
      </div>

      {/* Right login card section */}
      <div
        className="login-right-panel"
        style={{
          width: '40%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          background: '#fff',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            background: '#fff',
            borderRadius: 16,
            padding: 48,
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div
              style={{
                width: 64,
                height: 64,
                margin: '0 auto 16px',
                borderRadius: '50%',
                background: 'rgba(90, 160, 220, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserOutlined style={{ fontSize: 28, color: '#5AA0DC' }} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600 }}>欢迎回来</h3>
            <span style={{ color: '#8c8c8c', fontSize: 14 }}>登录以继续</span>
          </div>

          {/* Error alert */}
          {state.errorMessage && (
            <Alert
              type={isLocked ? 'warning' : isError ? 'error' : 'info'}
              message={state.errorMessage}
              icon={isLocked ? <LockOutlined /> : undefined}
              showIcon
              closable={false}
              style={{ marginBottom: 24 }}
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
              <Input prefix={<UserOutlined />} placeholder="请输入用户名" maxLength={50} autoFocus />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" maxLength={128} />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={state.status === 'loading'}
                disabled={state.status === 'locked'}
                style={{
                  height: 48,
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 500,
                  background: '#5AA0DC',
                  borderColor: '#5AA0DC',
                }}
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <span style={{ color: '#bfbfbf', fontSize: 12 }}>© 2026 SunnyBridge</span>
          </div>
        </div>
      </div>

      {/* Responsive styles using inline for simplicity */}
      <style>{`
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
          .login-right-panel { width: 100% !important; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
