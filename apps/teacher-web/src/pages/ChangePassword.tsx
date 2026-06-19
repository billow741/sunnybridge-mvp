import { useState } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AppLogo from '../components/AppLogo';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';

/** 将后端错误 detail 转为可显示字符串（兼容 Pydantic V2 对象格式） */
function extractErrorMsg(err: any, fallback: string): string {
  const raw = err?.response?.data?.detail;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    // Pydantic V2: [{type, loc, msg, input}, ...]
    return raw.map((e: any) => e.msg || String(e)).join('; ');
  }
  if (raw?.msg) return raw.msg;
  return fallback;
}

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const onFinish = async (values: { current_password: string; new_password: string }) => {
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/teacher/change-password', {
        current_password: values.current_password,
        new_password: values.new_password,
      });
      setSuccess(true);
      setTimeout(async () => {
        await logout();
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err: any) {
      setError(extractErrorMsg(err, '密码修改失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const validateNewPassword = (_: any, value: string) => {
    if (!value) return Promise.reject(new Error('请输入新密码'));
    if (value.length < 8) return Promise.reject(new Error('至少8个字符'));
    if (!/[A-Z]/.test(value)) return Promise.reject(new Error('需包含大写字母'));
    if (!/[0-9]/.test(value)) return Promise.reject(new Error('需包含数字'));
    return Promise.resolve();
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
          <AppLogo size="md" />
          <div style={{ fontSize: 15, color: '#64748B', marginTop: 8 }}>修改密码</div>
        </div>

        {success && (
          <Alert
            type="success"
            message="密码修改成功！"
            description="即将跳转到登录页..."
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 20 }}
          />
        )}

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

        <Form layout="vertical" onFinish={onFinish} size="large" disabled={success}>
          <Form.Item
            name="current_password"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
              placeholder="当前密码"
            />
          </Form.Item>

          <Form.Item
            name="new_password"
            label="新密码"
            rules={[{ validator: validateNewPassword }]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
              placeholder="新密码"
            />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            label="确认新密码"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次密码不一致'));
                },
              }),
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
              placeholder="确认新密码"
            />
          </Form.Item>

          <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16, lineHeight: '20px' }}>
            密码要求：至少8个字符，含1个大写字母，含1个数字
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ height: 44, fontWeight: 600 }}
            >
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
