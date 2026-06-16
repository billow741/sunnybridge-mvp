import { useState, useEffect } from 'react';
import { Layout, Menu, Dropdown, Avatar, Button } from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  HistoryOutlined,
  ReadOutlined,
  FolderOutlined,
  AppstoreOutlined,
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
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/courses/today', icon: <CalendarOutlined />, label: '今日课程' },
  { key: '/courses/history', icon: <HistoryOutlined />, label: '历史课程' },
  { key: '/teaching-resources', icon: <AppstoreOutlined />, label: '教学资源库' },
  { key: '/reading', icon: <ReadOutlined />, label: '阅读材料' },
  { key: '/resources', icon: <FolderOutlined />, label: '资源列表' },
  { key: '/profile', icon: <UserOutlined />, label: '个人信息' },
  { key: '/change-password', icon: <KeyOutlined />, label: '修改密码' },
];

export default function TeacherLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const dropdownItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
    { key: 'password', icon: <KeyOutlined />, label: '修改密码' },
    { type: 'divider' as const, key: 'd1' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  const handleDropdown = ({ key }: { key: string }) => {
    if (key === 'logout') handleLogout();
    else if (key === 'profile') navigate('/profile');
    else if (key === 'password') navigate('/change-password');
  };

  const selectedKey = menuItems.find((m) => location.pathname.startsWith(m.key))?.key || '/dashboard';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={220}
        style={{ background: '#01579B', overflow: 'auto', height: '100vh', position: 'sticky', top: 0 }}
      >
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
          <AppLogo size={collapsed ? 'sm' : 'md'} variant="sidebar" />
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, background: 'transparent' }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', height: 56 }}>
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
          <Dropdown menu={{ items: dropdownItems, onClick: handleDropdown }} placement="bottomRight">
            <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ background: '#54C5F8' }} />
              <span>{user?.teacher_id ? '老师' : '教师'}</span>
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24, background: '#F7FAFC', minHeight: 'calc(100vh - 56px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
