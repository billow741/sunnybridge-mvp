import { useEffect } from 'react';
import { Layout, Menu, Dropdown, Avatar, Button } from 'antd';
import {
  HomeOutlined,
  TeamOutlined,
  CalendarOutlined,
  ReadOutlined,
  BookOutlined,
  HistoryOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import AppLogo from '../components/AppLogo';
import { useAuthStore } from '../store/authStore';

const { Header, Content } = Layout;

const navItems = [
  { key: '/home', icon: <HomeOutlined />, label: '首页' },
  { key: '/child', icon: <TeamOutlined />, label: '我的孩子' },
  { key: '/courses/today', icon: <CalendarOutlined />, label: '课程' },
  { key: '/library', icon: <BookOutlined />, label: '资源馆' },
  { key: '/my-reading', icon: <HistoryOutlined />, label: '我的阅读' },
];

export default function ParentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, fetchMe } = useAuthStore();

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const selectedKey = navItems.find((m) => {
    if (m.key === '/library') return location.pathname.startsWith('/library') || location.pathname.startsWith('/reading') || location.pathname.startsWith('/resources');
    return location.pathname.startsWith(m.key);
  })?.key || '/home';

  return (
    <Layout style={{ minHeight: '100vh', background: '#FFFBF0' }}>
      <Header style={{
        background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid #F0E6D6', height: 56,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <AppLogo size="sm" variant="header" />
          <Menu
            mode="horizontal"
            selectedKeys={[selectedKey]}
            items={navItems}
            onClick={({ key }) => navigate(key)}
            style={{ border: 'none', background: 'transparent', lineHeight: '54px' }}
          />
        </div>
        <Dropdown
          menu={{
            items: [
              { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
            ],
            onClick: ({ key }) => { if (key === 'logout') handleLogout(); },
          }}
          placement="bottomRight"
        >
          <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar size="small" icon={<UserOutlined />} style={{ background: '#FFA726' }} />
            <span>家长</span>
          </Button>
        </Dropdown>
      </Header>
      <Content style={{ padding: '24px 24px 48px', background: '#FFFBF0' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
