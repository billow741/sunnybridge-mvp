import React from 'react';

interface LevelTagProps {
  level: string;
}

const getLevelColor = (level: string) => {
  const n = parseInt(level.replace('L', ''), 10);
  if (n >= 1 && n <= 3) return { bg: '#ECFDF5', color: '#047857' };
  if (n >= 4 && n <= 6) return { bg: '#EFF6FF', color: '#1D4ED8' };
  return { bg: '#F3F4F6', color: '#6B7280' };
};

const LevelTag: React.FC<LevelTagProps> = ({ level }) => {
  const { bg, color } = getLevelColor(level);
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 500,
      backgroundColor: bg,
      color,
      lineHeight: '20px',
    }}>
      {level}
    </span>
  );
};

export default LevelTag;
