import logo from '../assets/logo.png';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'header' | 'login';
}

const sizeMap = { sm: 28, md: 36, lg: 64 };

export default function AppLogo({ size = 'md', variant = 'header' }: AppLogoProps) {
  const px = sizeMap[size];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img src={logo} alt="SunnyBridge" style={{ width: px, height: px, borderRadius: variant === 'login' ? 12 : 6 }} />
      {variant !== 'login' && (
        <span style={{
          fontSize: 18, fontWeight: 600, color: variant === 'header' ? '#01579B' : '#fff', whiteSpace: 'nowrap',
        }}>SunnyBridge</span>
      )}
    </div>
  );
}
