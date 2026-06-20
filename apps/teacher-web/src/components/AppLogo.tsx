export default function AppLogo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 16px 8px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #5CAADF, #F4A230)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', fontWeight: 700, flexShrink: 0 }}>S</div>
      {!collapsed && <div><div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>SunnyBridge</div><div style={{ fontSize: 11, color: '#64748b' }}>教师工作台</div></div>}
    </div>
  );
}
