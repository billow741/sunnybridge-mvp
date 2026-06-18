import logo from '../assets/logo.webp';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'header' | 'login';
}

const sizeMap = { sm: 28, md: 36, lg: 64 };

export default function AppLogo({ size = 'md', variant = 'header' }: AppLogoProps) {
  const px = sizeMap[size];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <img src={logo} alt="阳光桥" style={{ width: px, height: px, borderRadius: 6 }} />
      {(variant === 'login' || size !== 'sm') && (
        <span style={{
          fontWeight: 700,
          fontSize: variant === 'login' ? 28 : size === 'lg' ? 20 : 16,
          color: '#F4A230',
          letterSpacing: 1,
        }}>
          阳光桥
        </span>
      )}
    </div>
  );
}
