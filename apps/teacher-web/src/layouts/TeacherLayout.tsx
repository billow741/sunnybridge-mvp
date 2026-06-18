import React, { useState, useEffect } from 'react';
import { Layout, Menu, Dropdown, Avatar, Button } from 'antd';
import {
  CalendarOutlined,
  HistoryOutlined,
  UserOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import AppLogo from '../components/AppLogo';
import { useAuthStore } from '../store/authStore';

const { Sider, Header, Content } = Layout;

const menuItems = [
  { key: '/courses/today', icon: <CalendarOutlined />, label: 'Today' },
  { key: '/courses/history', icon: <HistoryOutlined />, label: 'All Courses' },
  { key: '/change-password', icon: <KeyOutlined />, label: 'Change Password' },
];

export default function TeacherLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, fetchMe } = useAuthStore();

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Determine active menu key
  const selectedKey = menuItems.find(m => location.pathname.startsWith(m.key))?.key || '';

  const userMenu = (
    <Menu
      items={[
        { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
        { key: 'password', icon: <KeyOutlined />, label: 'Change Password', onClick: () => navigate('/change-password') },
        { type: 'divider' as const },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true, onClick: handleLogout },
      ]}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={220}
        collapsedWidth={72}
        style={{
          background: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo area */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0 16px' : '0 20px',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <AppLogo size={collapsed ? 'sm' : 'md'} collapsed={collapsed} />
        </div>

        {/* Menu */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            border: 'none',
            flex: 1,
            padding: '8px 0',
          }}
        />

        {/* Collapse toggle at bottom */}
        <div style={{
          borderTop: '1px solid #E2E8F0',
          padding: '12px 0',
          textAlign: 'center',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: '#64748B' }}
          />
        </div>
      </Sider>

      <Layout>
        <Header style={{
          background: '#FFFFFF',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          borderBottom: '1px solid #E2E8F0',
          height: 64,
        }}>
          <Dropdown overlay={userMenu} trigger={['click']}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar
                size={32}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#5CAADF' }}
              />
              {!collapsed && (
                <span style={{ fontSize: 14, color: '#1A2B4A' }}>
                  {user?.role || 'Teacher'}
                </span>
              )}
            </div>
          </Dropdown>
        </Header>

        <Content style={{
          background: '#F7FAFC',
          padding: '0 0 24px 0',
          overflow: 'auto',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
