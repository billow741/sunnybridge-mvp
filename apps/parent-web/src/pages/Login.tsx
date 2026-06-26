import { useState, useRef, useEffect } from 'react';
import { Form, Input, Button, message, Tabs } from 'antd';
import { PhoneOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client, { extractError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export default function Login() {
  const [activeTab, setActiveTab] = useState<'sms' | 'password'>('sms');
  const [loading, setLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<number | null>(null);
  const [smsForm] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const onSMSLogin = async (values: { phone: string; code: string }) => {
    setLoading(true);
    try {
      const { data } = await client.post('/auth/sms/verify', {
        phone: values.phone,
        code: values.code,
      });
      setAuth(data.access_token, { ...data.user, role: 'parent' });
      message.success('登录成功');
      navigate('/', { replace: true });
    } catch (err) {
      message.error(extractError(err, '登录失败'));
    } finally {
      setLoading(false);
    }
  };

  const onPasswordLogin = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const { data } = await client.post('/auth/parent/login', values);
      setAuth(data.access_token, { ...data.user, role: 'parent' });
      message.success('登录成功');
      navigate('/', { replace: true });
    } catch (err) {
      message.error(extractError(err, '登录失败'));
    } finally {
      setLoading(false);
    }
  };

  const onSendSMS = async () => {
    const phone = smsForm.getFieldValue('phone');
    if (!phone || !/^1\d{10}$/.test(phone)) {
      message.warning('请输入正确的手机号');
      return;
    }
    setSmsLoading(true);
    try {
      await client.post('/auth/sms/send', { phone });
      message.success('验证码已发送（测试环境固定 888888）');
      setCountdown(60);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      message.error(extractError(err, '发送失败'));
    } finally {
      setSmsLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'sms',
      label: '验证码登录',
      children: (
        <Form form={smsForm} onFinish={onSMSLogin} layout="vertical" size="large">
          <Form.Item
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
            ]}
          >
            <Input
              prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
              placeholder="手机号"
              maxLength={11}
            />
          </Form.Item>
          <Form.Item
            name="code"
            rules={[{ required: true, message: '请输入验证码' }]}
          >
            <Input
              placeholder="验证码"
              maxLength={6}
              prefix={<SafetyOutlined style={{ color: '#94a3b8' }} />}
              suffix={
                <Button
                  type="link"
                  size="small"
                  disabled={countdown > 0 || smsLoading}
                  loading={smsLoading}
                  onClick={onSendSMS}
                  style={{ padding: 0, minWidth: 80 }}
                >
                  {countdown > 0 ? `${countdown}s后重发` : '获取验证码'}
                </Button>
              }
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} size="large">
            登 录
          </Button>
        </Form>
      ),
    },
    {
      key: 'password',
      label: '密码登录',
      children: (
        <Form form={pwdForm} onFinish={onPasswordLogin} layout="vertical" size="large">
          <Form.Item
            name="phone"
            rules={[{ required: true, message: '请输入手机号' }]}
          >
            <Input
              prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
              placeholder="手机号"
              maxLength={11}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="密码"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} size="large">
            登 录
          </Button>
        </Form>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F7FAFC',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '40px 32px',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F4A230 0%, #5CAADF 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              color: '#fff',
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            SB
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
            SunnyBridge 家长端
          </h1>
        </div>

        <Tabs
          centered
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'sms' | 'password')}
          items={tabItems}
        />
      </div>
    </div>
  );
}
