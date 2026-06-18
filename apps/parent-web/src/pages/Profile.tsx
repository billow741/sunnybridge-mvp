import React, { useEffect } from 'react';
import { Card, List, Avatar, Button, Typography, Divider } from 'antd';
import { UserOutlined, PhoneOutlined, LogoutOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, children: childList, currentChildId, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="page-container">
      <Title level={4} className="page-title">个人中心</Title>

      {/* 家长信息 */}
      <Card style={{ borderRadius: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Avatar size={48} style={{ background: '#F4A230' }} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{user?.role === 'parent' ? '家长' : '用户'}</div>
            <Text style={{ color: '#A0AEC0' }}>阳光桥在线英语</Text>
          </div>
        </div>
      </Card>

      {/* 孩子信息 */}
      <Title level={5} className="section-title" style={{ marginTop: 8 }}>
        <TeamOutlined style={{ marginRight: 6 }} />我的孩子
      </Title>
      <Card style={{ borderRadius: 14, marginBottom: 16 }}>
        {childList.length === 0 ? (
          <Text style={{ color: '#A0AEC0' }}>暂无关联孩子</Text>
        ) : (
          <List
            dataSource={childList}
            renderItem={(child: any) => (
              <List.Item style={{ border: 'none', padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                  <Avatar size={36} style={{ background: currentChildId === child.id ? '#F4A230' : '#E2E8F0', color: currentChildId === child.id ? '#fff' : '#718096' }}>
                    {(child.english_name || child.name)[0]}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{child.english_name || child.name}</div>
                    {child.level && <span className="sun-tag" style={{ marginTop: 2 }}>{child.level}</span>}
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 功能列表 */}
      <Card style={{ borderRadius: 14, marginBottom: 16 }}>
        <List
          dataSource={[
            { key: 'change-pwd', icon: <PhoneOutlined />, label: '修改密码', path: '/change-password' },
            { key: 'about', icon: <PhoneOutlined />, label: '关于阳光桥', path: '' },
          ]}
          renderItem={(item: any) => (
            <List.Item style={{ border: 'none', padding: '12px 0', cursor: 'pointer' }}
              onClick={() => item.path && navigate(item.path)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {item.icon}
                <span>{item.label}</span>
              </div>
            </List.Item>
          )}
        />
      </Card>

      <Button danger block icon={<LogoutOutlined />} onClick={handleLogout}
        style={{ height: 48, borderRadius: 12, fontWeight: 600 }}>
        退出登录
      </Button>
    </div>
  );
}
