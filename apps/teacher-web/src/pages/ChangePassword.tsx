import { Form, Input, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { LockOutlined } from '@ant-design/icons';
import PageContainer from '../components/PageContainer';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function ChangePassword() {
  const navigate = useNavigate();
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);

  const handleSubmit = async (values: { old_password: string; new_password: string }) => {
    try {
      await apiClient.post('/auth/teacher/change-password', {
        old_password: values.old_password,
        new_password: values.new_password,
      });
      message.success('密码修改成功');
      useAuthStore.setState({ mustChangePassword: false });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.detail?.message || '修改失败';
      message.error(msg);
    }
  };

  return (
    <PageContainer title="修改密码">
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {mustChangePassword && (
          <div style={{ padding: 16, background: '#FFF8E1', borderRadius: 8, marginBottom: 24, color: '#E65100' }}>
            首次登录需要修改密码后才能继续使用
          </div>
        )}
        <Form layout="vertical" onFinish={handleSubmit} autoComplete="off">
          <Form.Item name="old_password" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="输入当前密码" />
          </Form.Item>
          <Form.Item name="new_password" label="新密码" rules={[
            { required: true, message: '请输入新密码' },
            { min: 8, message: '密码至少8位' },
            { pattern: /^(?=.*[a-zA-Z])(?=.*\d)/, message: '密码需同时包含字母和数字' },
          ]}>
            <Input.Password prefix={<LockOutlined />} placeholder="输入新密码" />
          </Form.Item>
          <Form.Item name="confirm" label="确认新密码" dependencies={['new_password']} rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                return Promise.reject(new Error('两次密码输入不一致'));
              },
            }),
          ]}>
            <Input.Password prefix={<LockOutlined />} placeholder="再次输入新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认修改</Button>
          </Form.Item>
        </Form>
      </div>
    </PageContainer>
  );
}
