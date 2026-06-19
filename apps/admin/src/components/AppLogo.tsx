/**
 * SunnyBridge Admin Logo 组件
 * 统一品牌标识：图片Logo + 品牌色文字
 */

import logo from '../assets/logo.webp';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  collapsed?: boolean;
}

const sizeMap = {
  sm: { logo: 24, text: 14, gap: 6 },
  md: { logo: 36, text: 18, gap: 10 },
  lg: { logo: 48, text: 22, gap: 12 },
};

export default function AppLogo({ size = 'md', collapsed }: AppLogoProps) {
  const s = sizeMap[size];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.gap }}>
      <img
        src={logo}
        alt="SunnyBridge"
        style={{ width: s.logo, height: s.logo, objectFit: 'contain' }}
      />
      {!collapsed && (
        <span style={{ fontSize: s.text, fontWeight: 700, color: '#5CAADF', whiteSpace: 'nowrap' }}>
          SunnyBridge
        </span>
      )}
    </div>
  );
}
