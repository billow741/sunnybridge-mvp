/**
 * Admin layout with sidebar — 6 menu items per SPRINT-1 ADMIN-01.
 *
 * Menu items (from IA.md + Sprint 验收标准 ④):
 * 1. 首页概览 (Dashboard)
 * 2. 课程管理 (A-COURSE)
 * 3. 教师管理 (A-TEACHER)
 * 4. 学生管理 (A-STUDENT)
 * 5. 阅读馆管理 (A-READING) — P1
 * 6. 资源库管理 (A-RESOURCE) — P1
 *
 * P1 items: 阅读馆管理 (A-READING) now implemented (ADMIN-05).
 * Resource management (A-RESOURCE) remains disabled.
 */

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, theme } from 'antd';
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
const { Text } = Typography;

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
  label: '阅读馆管理',
 },
 {
 key: '/resources',
 icon: <FolderOutlined />,
 label: '资源库管理',
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

  // Determine active menu key from path
  const selectedKey = menuItems.find((item) =>
    location.pathname.startsWith(item.key),
  )?.key ?? '/courses';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ background: themeToken.colorBgContainer }}
      >
        {/* Logo */}
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
          <Text strong={!collapsed} style={{ fontSize: collapsed ? 14 : 16 }}>
            {collapsed ? 'SB' : 'SunnyBridge'}
          </Text>
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
            justifyContent: 'flex-end',
            alignItems: 'center',
            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
            height: 48,
            lineHeight: '48px',
          }}
        >
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </Header>

        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
