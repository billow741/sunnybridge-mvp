import { useMemo } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  HomeOutlined,
  BookOutlined,
  ReadOutlined,
  FolderOutlined,
  PayCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';

const { Sider } = Layout;

// 侧边栏宽度
const SIDER_WIDTH = 240;

// 导航项配置（非嵌套结构，flat 列表）
const navItems = [
  { key: '/', icon: <HomeOutlined />, label: '概览' },
  { key: '/courses', icon: <BookOutlined />, label: '课程' },
  { key: '/reading', icon: <ReadOutlined />, label: '阅读' },
  { key: '/resources', icon: <FolderOutlined />, label: '资源' },
  { key: '/payments', icon: <PayCircleOutlined />, label: '缴费' },
  { key: '/profile', icon: <UserOutlined />, label: '个人' },
];

// 获取当前页面标题
function getPageTitle(pathname: string) {
  switch (pathname) {
    case '/':
      return '概览';
    case '/courses':
      return '课程';
    case '/reading':
      return '阅读';
    case '/resources':
      return '资源';
    case '/payments':
      return '缴费';
    case '/profile':
      return '个人';
    default:
      if (pathname.startsWith('/courses/')) return '课程详情';
      if (pathname === '/reading/progress') return '阅读进度';
      return '';
  }
}

export default function ParentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  // 当前选中菜单项
  const selectedKeys = useMemo(() => {
    const { pathname } = location;
    // '/courses/:id' 属于 '/courses'
    if (pathname.startsWith('/courses/')) return ['/courses'];
    if (pathname === '/reading/progress') return ['/reading'];
    return [pathname];
  }, [location.pathname]);

  // 手机号脱敏 (保留后 4 位)
  const maskedPhone = useMemo(() => {
    if (!user?.phone) return '138****0000';
    const phone = String(user.phone);
    if (phone.length <= 4) return phone;
    const suffix = phone.slice(-4);
    const prefix = phone.slice(0, -4).replace(/\d/g, '*');
    return prefix + suffix;
  }, [user?.phone]);

  const pageTitle = getPageTitle(location.pathname);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 左侧固定侧边栏 */}
      <Sider
        width={SIDER_WIDTH}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          zIndex: 100,
          overflow: 'auto',
        }}
      >
        {/* Logo 区域 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            height: 64,
            borderBottom: '1px solid #E2E8F0',
            padding: '0 16px',
          }}
        >
          {/* SB 圆形渐变图标 */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F4A230 0%, #5CAADF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            SB
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#1A2B4A',
              whiteSpace: 'nowrap',
            }}
          >
            SunnyBridge
          </span>
        </div>

        {/* 导航菜单 */}
        <div style={{ padding: '16px 0' }}>
          <Menu
            mode="vertical"
            selectedKeys={selectedKeys}
            onClick={({ key }) => navigate(key)}
            style={{
              background: 'transparent',
              border: 'none',
            }}
            items={navItems.map((item) => ({
              key: item.key,
              icon: item.icon,
              label: item.label,
              style: {
                margin: '4px 12px',
                borderRadius: 8,
                transition: 'all 0.2s',
              },
            }))}
          />
        </div>

        {/* 底部手机号脱敏 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px 20px',
            borderTop: '1px solid #E2E8F0',
            fontSize: 12,
            color: '#64748B',
            textAlign: 'center',
            letterSpacing: 0.5,
          }}
        >
          {maskedPhone}
        </div>
      </Sider>

      {/* 主内容区 */}
      <Layout
        style={{
          marginLeft: SIDER_WIDTH,
          minHeight: '100vh',
          background: '#F7FAFC',
        }}
      >
        {/* 顶栏 */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 30px',
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          {/* 当前页面标题 */}
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#1A2B4A',
            }}
          >
            {pageTitle}
          </span>
        </div>

        {/* 页面内容 — 带动画 */}
        <div
          style={{
            padding: 30,
            minHeight: 'calc(100vh - 64px)',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <Outlet />
        </div>
      </Layout>

      {/* fadeIn 动画样式 */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Layout>
  );
}
