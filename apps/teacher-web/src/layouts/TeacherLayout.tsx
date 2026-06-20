import { useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CalendarOutlined, HistoryOutlined, KeyOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import AppLogo from '@/components/AppLogo';
import { useAuthStore } from '@/store/authStore';

const { Sider, Content, Header } = Layout;

const menuItems = [
  { key: '/today', icon: <CalendarOutlined />, label: '今日课程' },
  { key: '/courses', icon: <HistoryOutlined />, label: '全部课程' },
  { key: '/change-password', icon: <KeyOutlined />, label: '修改密码' },
];

export default function TeacherLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const selectedKey = location.pathname === '/' ? '/today' : location.pathname;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible trigger={null} collapsed={collapsed} width={220} style={{ background: '#fff' }}>
        <AppLogo collapsed={collapsed} />
        <Menu mode="inline" selectedKeys={[selectedKey]} items={menuItems} onClick={({ key }) => navigate(key)} style={{ borderRight: 0 }} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#64748b' }}>{user?.name || user?.username || '教师'}</span>
            <Button type="link" onClick={() => { logout(); window.location.href = '/login'; }}>退出</Button>
          </div>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#f5f5f5', minHeight: 360 }}><Outlet /></Content>
      </Layout>
    </Layout>
  );
}
