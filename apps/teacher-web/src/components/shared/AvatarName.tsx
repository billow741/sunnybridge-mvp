import React from 'react';
import { Avatar } from 'antd';

interface AvatarNameProps {
  name: string;
  size?: number;
}

const AvatarName: React.FC<AvatarNameProps> = ({ name, size = 32 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <Avatar
      size={size}
      style={{ backgroundColor: '#5CAADF', fontSize: size * 0.4, flexShrink: 0 }}
    >
      {name?.charAt(0)?.toUpperCase() || '?'}
    </Avatar>
    <span style={{ fontSize: 14, color: '#1A2B4A' }}>{name}</span>
  </div>
);

export default AvatarName;
