import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { PhoneOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client, { extractError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const onFinish = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const { data } = await client.post('/auth/parent/login', values);
      setAuth(data.access_token, { phone: values.phone, role: 'parent' });
      navigate('/', { replace: true });
    } catch (err) { message.error(extractError(err, '登录失败')); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F4A230 0%, #5CAADF 100%)' }}>
      <div style={{ width: 360, padding: '40px 24px', background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #F4A230, #5CAADF)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', fontWeight: 700, marginBottom: 12 }}>S</div>
          <h2 style={{ margin: 0, fontSize: 22, color: '#1e293b' }}>SunnyBridge</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>家长端登录</p>
        </div>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />} placeholder="手机号" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="密码" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 44, fontWeight: 600 }}>登 录</Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
