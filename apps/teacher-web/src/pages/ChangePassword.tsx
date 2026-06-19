import { useState } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AppLogo from '../components/AppLogo';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';

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
      const msg = err?.response?.data?.detail || 'Failed to update password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const validateNewPassword = (_: any, value: string) => {
    if (!value) return Promise.reject(new Error('Please enter a new password'));
    if (value.length < 8) return Promise.reject(new Error('At least 8 characters'));
    if (!/[A-Z]/.test(value)) return Promise.reject(new Error('Must include an uppercase letter'));
    if (!/[0-9]/.test(value)) return Promise.reject(new Error('Must include a number'));
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
          <div style={{ fontSize: 15, color: '#64748B', marginTop: 8 }}>Change Password</div>
        </div>

        {success && (
          <Alert
            type="success"
            message="Password updated successfully!"
            description="Redirecting to login..."
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
            label="Current Password"
            rules={[{ required: true, message: 'Please enter your current password' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
              placeholder="Current password"
            />
          </Form.Item>

          <Form.Item
            name="new_password"
            label="New Password"
            rules={[{ validator: validateNewPassword }]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
              placeholder="New password"
            />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            label="Confirm New Password"
            dependencies={['new_password']}
            rules={[
              { required: true, message: 'Please confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
              placeholder="Confirm new password"
            />
          </Form.Item>

          <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16, lineHeight: '20px' }}>
            Password requirements: ≥8 characters, 1 uppercase letter, 1 number
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ height: 44, fontWeight: 600 }}
            >
              Update Password
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
