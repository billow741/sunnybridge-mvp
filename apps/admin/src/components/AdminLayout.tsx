/**
 * Admin layout with sidebar.
 *
 * MVP 菜单结构 (6项):
 * 1. 首页概览 (Dashboard)
 * 2. 课程管理 (1v1)
 * 3. 教师管理
 * 4. 学生管理
 * 5. 阅读材料管理
 * 6. 资源管理
 */

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, theme } from 'antd';
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
  const { token: themeToken } = theme.useToken();

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
        width={208}
        style={{ background: themeToken.colorBgContainer }}
      >
        {/* Brand */}
        <div
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
            margin: '0 0 8px',
          }}
        >
          <span style={{ fontSize: collapsed ? 14 : 16, fontWeight: collapsed ? 400 : 600, color: '#5AA0DC' }}>
            {collapsed ? 'SB' : 'SunnyBridge'}
          </span>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: themeToken.colorBgContainer,
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
            height: 48,
            lineHeight: '48px',
          }}
        >
          <span style={{ fontSize: 13, color: themeToken.colorTextSecondary }}>
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

        <Content style={{ margin: 24, background: '#FAFAFA', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
