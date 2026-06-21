import sunbLogo from '/sunblogo1.webp';

export default function AppLogo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 16px 12px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
        <img src={sunbLogo} alt="SunnyBridge" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      {!collapsed && (
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', lineHeight: '22px', letterSpacing: 0.5 }}>SunnyBridge</div>
          <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: '14px' }}>运营后台</div>
        </div>
      )}
    </div>
  );
}
