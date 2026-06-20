import { useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined, TeamOutlined, DollarOutlined, CalendarOutlined,
  BookOutlined, ScheduleOutlined, SettingOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, TrophyOutlined, PayCircleOutlined,
} from '@ant-design/icons';
import AppLogo from '@/components/AppLogo';
import { useAuthStore } from '@/store/authStore';

const { Sider, Content, Header } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/students', icon: <TeamOutlined />, label: '学生管理' },
  { key: '/payments', icon: <DollarOutlined />, label: '收款记录' },
  { key: '/classes', icon: <CalendarOutlined />, label: '上课记录' },
  { key: '/schedule', icon: <ScheduleOutlined />, label: '排课管理' },
  { key: '/teachers', icon: <TrophyOutlined />, label: '教师管理' },
  { key: '/teacher-payments', icon: <PayCircleOutlined />, label: '教师薪资' },
  { key: '/courses', icon: <BookOutlined />, label: '课程管理' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible trigger={null} collapsed={collapsed} width={220} style={{ background: '#fff' }}>
        <AppLogo collapsed={collapsed} />
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#64748b' }}>{user?.name || user?.username || '管理员'}</span>
            <Button type="link" onClick={() => { logout(); window.location.href = '/login'; }}>退出</Button>
          </div>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#f5f5f5', minHeight: 360, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
