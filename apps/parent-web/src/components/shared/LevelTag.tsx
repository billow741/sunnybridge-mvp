import React from 'react';

interface LevelTagProps {
  level: string;
}

const levelStyle = (level: string) => {
  const n = parseInt(level.replace('L', ''), 10);
  if (n >= 1 && n <= 3) return { bg: '#E8F5FF', color: '#2B6CB0', border: '#BEE3F8' };
  if (n >= 4 && n <= 6) return { bg: '#FFF5E6', color: '#C05621', border: '#FFD9A0' };
  return { bg: '#F7FAFC', color: '#4A5568', border: '#E2E8F0' };
};

const LevelTag: React.FC<LevelTagProps> = ({ level }) => {
  const s = levelStyle(level);
  return <span className="sun-tag" style={{ background: s.bg, color: s.color, borderColor: s.border }}>{level}</span>;
};

export default LevelTag;
