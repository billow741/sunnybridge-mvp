import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { HomeOutlined, BookOutlined, ReadOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';

const tabs = [
  { key: '/', icon: '🏠', label: '首页' },
  { key: '/courses', icon: '📚', label: '课程' },
  { key: '/reading', icon: '📖', label: '阅读' },
];

export default function ParentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // 确定当前选中tab
  const currentTab = tabs.find(t => t.key === location.pathname)?.key || '/';

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 60 }}>
      {/* 顶部栏 */}
      <div style={{ background: 'linear-gradient(135deg, #F4A230, #5CAADF)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>S</div>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>SunnyBridge</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }} onClick={() => { logout(); window.location.href = '/login'; }}>退出</span>
      </div>

      {/* 内容区 */}
      <div style={{ padding: 16, maxWidth: 600, margin: '0 auto' }}>
        <Outlet />
      </div>

      {/* 底部Tab栏 */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e5e7eb', display: 'flex', zIndex: 999 }}>
        {tabs.map(tab => (
          <div key={tab.key} onClick={() => navigate(tab.key)}
            style={{ flex: 1, textAlign: 'center', padding: '8px 0', cursor: 'pointer',
              color: currentTab === tab.key ? '#F4A230' : '#64748b',
              fontWeight: currentTab === tab.key ? 600 : 400,
            }}>
            <div style={{ fontSize: 20 }}>{tab.icon}</div>
            <div style={{ fontSize: 11 }}>{tab.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
