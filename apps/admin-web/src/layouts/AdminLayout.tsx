import { useState, useMemo } from 'react';
import { Layout, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined, TeamOutlined, BookOutlined, TrophyOutlined,
  DollarOutlined, FileTextOutlined, SettingOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, SwapRightOutlined, AuditOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import AppLogo from '@/components/AppLogo';
import GlobalSearch from '@/components/GlobalSearch';
import EntityDrawer from '@/components/EntityDrawer';
import { useAuthStore } from '@/store/authStore';

const { Sider, Content, Header } = Layout;

type MenuKey = string[];
type MenuItem = { key: string; icon?: React.ReactNode; label: string; children?: { key: string; label: string }[] };

const menuItems: MenuItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/students', icon: <TeamOutlined />, label: '学员' },
  { key: '/courses', icon: <BookOutlined />, label: '课程' },
  { key: '/teachers', icon: <TrophyOutlined />, label: '教师' },
  { key: '/finance', icon: <DollarOutlined />, label: '财务', children: [
    { key: '/finance/reconciliation', label: '财务对账' },
    { key: '/finance/settlements', label: '教师结算' },
    { key: '/finance/payments', label: '收款记录' },
  ]},
  { key: '/content', icon: <FileTextOutlined />, label: '内容' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

function flattenMenu(items: MenuItem[]): MenuItem[] {
  return items.flatMap(i => [i, ...(i.children?.map(c => ({ key: c.key, label: c.label })) || [])]);
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const selectedKeys = useMemo(() => {
    const all = flattenMenu(menuItems);
    // 优先匹配精确路径
    const exact = all.find(i => i.key === location.pathname);
    if (exact) return [exact.key];
    // 再匹配前缀
    const prefix = all
      .filter(i => location.pathname.startsWith(i.key) && i.key !== '/')
      .sort((a, b) => b.key.length - a.key.length)[0];
    return prefix ? [prefix.key] : ['/'];
  }, [location.pathname]);

  const items: MenuProps['items'] = menuItems.map(item => {
    if (item.children) {
      return {
        key: item.key,
        icon: item.icon,
        label: item.label,
        children: item.children.map(c => ({ key: c.key, label: c.label, onClick: () => navigate(c.key) })),
      };
    }
    return { key: item.key, icon: item.icon, label: item.label, onClick: () => navigate(item.key) };
  });

  const menuTheme = 'dark';

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={232}
        collapsedWidth={80}
        style={{ background: '#1a1a2e', boxShadow: '2px 0 12px rgba(0,0,0,0.15)' }}
      >
        <AppLogo collapsed={collapsed} />
        <Menu
          mode="inline"
          theme={menuTheme}
          selectedKeys={selectedKeys}
          openKeys={collapsed ? [] : undefined}
          items={items}
          style={{ background: 'transparent', borderRight: 0, padding: '0 0 0 0' }}
        />
        <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          v1.0.0
        </div>
      </Sider>
      <Layout>
        <Header
          style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: '#fff', padding: '0 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0', height: 56,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ cursor: 'pointer', color: '#64748b', fontSize: 18 }} onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
            <GlobalSearch />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#64748b', fontSize: 14 }}>
            <span>{user?.name || user?.username || '管理员'}</span>
            <button
              onClick={() => { logout(); window.location.href = '/login'; }}
              style={{ background: 'none', border: 'none', color: '#5CAADF', cursor: 'pointer', fontSize: 13 }}
            >退出</button>
          </div>
        </Header>
        <Content style={{ background: '#f0f2f5', minHeight: 'calc(100vh - 56px)' }}>
          <Outlet />
        </Content>
      </Layout>
      {/* 全局实体详情 Drawer — 从搜索/通知等入口触发 */}
      <EntityDrawer />
    </Layout>
  );
}
