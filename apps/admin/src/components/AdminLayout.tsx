/**
 * Admin layout with sidebar.
 *
 * 菜单结构 (6项):
 * 1. 首页概览 (Dashboard)
 * 2. 课程管理 (1v1)
 * 3. 教师管理
 * 4. 学生管理
 * 5. 阅读材料管理
 * 6. 资源管理
 */

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  TeamOutlined,
  UserOutlined,
  ReadOutlined,
  FolderOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { logout } from '../api/auth';
import AppLogo from './AppLogo';

const { Sider, Header, Content } = Layout;

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '首页概览',
  },
  {
    key: '/courses',
    icon: <BookOutlined />,
    label: '课程管理',
  },
  {
    key: '/teachers',
    icon: <TeamOutlined />,
    label: '教师管理',
  },
  {
    key: '/students',
    icon: <UserOutlined />,
    label: '学生管理',
  },
  {
    key: '/reading',
    icon: <ReadOutlined />,
    label: '阅读材料',
  },
  {
    key: '/resources',
    icon: <FolderOutlined />,
    label: '资源管理',
  },
];

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleMenuClick = (info: { key: string }) => {
    navigate(info.key);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const selectedKey = menuItems.find(item => location.pathname.startsWith(item.key))?.key ?? '/dashboard';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={200}
        collapsedWidth={64}
        style={{
          background: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo area — 使用统一的 AppLogo */}
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

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: 'none', flex: 1, padding: '8px 0' }}
        />
      </Sider>

      <Layout>
        <Header style={{
          background: '#FFFFFF',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #E2E8F0',
          height: 64,
        }}>
          <span style={{ fontSize: 14, color: '#64748B' }}>
            管理后台
          </span>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </Header>

        <Content style={{
          background: '#F7FAFC',
          padding: 24,
          minHeight: 280,
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
