/**
 * Admin layout with sidebar.
 *
 * Menu structure:
 * 1. 首页概览 (Dashboard)
 * 2. 课程管理 (A-COURSE)
 * 3. 教师管理 (A-TEACHER)
 * 4. 学生管理 (A-STUDENT)
 * 5. 阅读馆管理 (A-READING)
 * 6. 资源馆 (Library — SubMenu)
 *    ├── 总览
 *    ├── 馆藏目录
 *    ├── 资源编目
 *    ├── 资源检索
 *    ├── 专题陈列
 *    └── 使用记录
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
  AppstoreOutlined,
  EditOutlined,
  StarOutlined,
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
    key: '/library',
    icon: <BookOutlined />,
    label: '资源馆',
    children: [
      { key: '/library/overview', icon: <AppstoreOutlined />, label: '总览' },
      { key: '/library/list', icon: <EditOutlined />, label: '资源列表' },
      { key: '/library/categories', icon: <FolderOutlined />, label: '分类管理' },
      { key: '/library/curation', icon: <StarOutlined />, label: '推荐配置' },
    ],
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

  // Flatten all keys (including submenu children) for matching
  const allKeys = menuItems.flatMap(item =>
    'children' in item ? [item.key, ...item.children!.map(c => c.key)] : [item.key]
  );
  const selectedKey = allKeys.find(key => location.pathname.startsWith(key)) ?? '/dashboard';
  // Open the submenu if on a library page
  const openKeys = location.pathname.startsWith('/library') ? ['/library'] : [];

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
          defaultOpenKeys={openKeys}
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
