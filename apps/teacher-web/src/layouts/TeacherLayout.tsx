import { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space, Typography } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  CalendarOutlined,
  HistoryOutlined,
  KeyOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  LogoutOutlined,
  UserOutlined,
  TeamOutlined,
  BookOutlined,
} from '@ant-design/icons';
import AppLogo from '@/components/AppLogo';
import { useAuthStore } from '@/store/authStore';

const { Sider, Content, Header } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/today', icon: <CalendarOutlined />, label: '今日课程' },
  { key: '/courses', icon: <HistoryOutlined />, label: '全部课程' },
  { key: '/students', icon: <TeamOutlined />, label: '我的学员' },
  { key: '/materials', icon: <BookOutlined />, label: '阅读材料' },
  { key: '/change-password', icon: <KeyOutlined />, label: '修改密码' },
];

export default function TeacherLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const selectedKey = location.pathname === '/' ? '/' : location.pathname;

  const userName = user?.name || user?.username || '教师';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider
        collapsible
        trigger={null}
        collapsed={collapsed}
        width={240}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        <div style={{ padding: collapsed ? '16px 8px' : '16px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <AppLogo collapsed={collapsed} />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, flex: 1, padding: '8px 0' }}
        />
        {/* 底部折叠按钮 */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: '100%' }}
          />
        </div>
      </Sider>

      <Layout>
        {/* 顶栏 */}
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            height: 56,
            lineHeight: '56px',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>
            欢迎回来，{userName} 👋
          </span>
          <Space size={16}>
            <Dropdown
              menu={{
                items: [
                  { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
                  { type: 'divider' },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: '退出登录',
                    danger: true,
                    onClick: () => { logout(); window.location.href = '/login'; },
                  },
                ],
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size={32}
                  style={{ backgroundColor: '#5CAADF', verticalAlign: 'middle' }}
                >
                  {userName.slice(0, 1)}
                </Avatar>
                {!collapsed && <Typography.Text style={{ color: '#64748b' }}>{userName}</Typography.Text>}
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* 内容区 */}
        <Content
          style={{
            margin: 0,
            padding: 24,
            background: '#f8fafc',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
