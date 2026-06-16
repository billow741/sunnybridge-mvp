import { Card, Descriptions, Tag } from 'antd';
import PageContainer from '../components/PageContainer';
import { useAuthStore } from '../store/authStore';

export default function Profile() {
  const user = useAuthStore((s) => s.user);

  return (
    <PageContainer title="个人信息">
      <Card style={{ maxWidth: 480 }}>
        <Descriptions column={1}>
          <Descriptions.Item label="用户ID">{user?.id || '—'}</Descriptions.Item>
          <Descriptions.Item label="角色"><Tag color="blue">{user?.role === 'teacher' ? '教师' : user?.role || '—'}</Tag></Descriptions.Item>
        </Descriptions>
      </Card>
    </PageContainer>
  );
}
