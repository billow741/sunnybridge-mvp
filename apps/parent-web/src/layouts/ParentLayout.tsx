import React, { useEffect } from 'react';
import { Layout, Dropdown, Avatar } from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  ReadOutlined,
  FolderOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import AppLogo from '../components/AppLogo';
import { useAuthStore } from '../store/authStore';
import { ChildSwitcher } from '../components/shared';
import type { ChildBrief } from '../types';

const { Content } = Layout;

const TAB_ITEMS = [
  { key: '/home', icon: <HomeOutlined />, label: '首页' },
  { key: '/courses/today', icon: <CalendarOutlined />, label: '课程' },
  { key: '/library', icon: <ReadOutlined />, label: '阅读' },
  { key: '/resources', icon: <FolderOutlined />, label: '资源' },
  { key: '/profile', icon: <UserOutlined />, label: '我的' },
];

export default function ParentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, children: childList, currentChildId, setCurrentChild } = useAuthStore();

  // 自动选当前路径对应的 tab
  const activeTab = TAB_ITEMS.find(t => location.pathname.startsWith(t.key))?.key || '/home';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#FFFBF0' }}>
      {/* 顶部栏 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#fff', borderBottom: '1px solid #F0E6D6',
        padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <AppLogo size="sm" />
        <ChildSwitcher
          children={childList || []}
          currentId={currentChildId || ''}
          onChange={setCurrentChild}
        />
        <Dropdown menu={{
          items: [
            { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
            { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
          ],
          onClick: e => e.key === 'logout' ? handleLogout() : navigate('/profile'),
        }}>
          <Avatar size={30} style={{ background: '#F4A230', cursor: 'pointer' }}>
            {user?.role === 'parent' ? '家长' : '?'}
          </Avatar>
        </Dropdown>
      </div>

      {/* 内容区 */}
      <Content style={{ paddingBottom: 72 }}>
        <Outlet />
      </Content>

      {/* 底部 TabBar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: '#fff', borderTop: '1px solid #F0E6D6',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        height: 56, paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {TAB_ITEMS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <div key={tab.key} onClick={() => navigate(tab.key)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                cursor: 'pointer', flex: 1, padding: '6px 0',
                color: active ? '#F4A230' : '#A0AEC0',
                transition: 'color 0.2s',
              }}>
              <span style={{ fontSize: 20 }}>{React.cloneElement(tab.icon as React.ReactElement, {
                style: { color: active ? '#F4A230' : '#A0AEC0' }
              })}</span>
              <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, marginTop: 2 }}>{tab.label}</span>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
