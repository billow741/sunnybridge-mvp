import { useState } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AppLogo from '../components/AppLogo';
import { useAuthStore } from '../store/authStore';

/** 将后端错误 detail 转为可显示字符串（兼容 Pydantic V2 对象格式） */
function extractErrorMsg(err: any, fallback: string): string {
  const raw = err?.response?.data?.detail;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    return raw.map((e: any) => e.msg || String(e)).join('; ');
  }
  if (raw?.msg) return raw.msg;
  return fallback;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError('');
    try {
      const res = await login(values.username, values.password);
      if (res.must_change_password) {
        navigate('/change-password', { replace: true });
      } else {
        navigate('/courses/today', { replace: true });
      }
    } catch (err: any) {
      setError(extractErrorMsg(err, '用户名或密码错误，请重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F7FAFC',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        padding: '40px 32px',
        background: '#FFFFFF',
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <AppLogo size="lg" />
          <div style={{ fontSize: 15, color: '#64748B', marginTop: 8 }}>教师端</div>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            onClose={() => setError('')}
            style={{ marginBottom: 20 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#94A3B8' }} />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ height: 44, fontWeight: 600 }}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: '#94A3B8' }}>
            忘记密码？请联系管理员
          </span>
        </div>
      </div>
    </div>
  );
}
