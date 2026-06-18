import React from 'react';

interface StatusTagProps {
  status: 'pending' | 'completed' | 'cancelled';
}

const labelMap: Record<string, { text: string; bg: string; color: string }> = {
  pending:   { text: '待上课', bg: '#FFF5E6', color: '#D48A20' },
  completed: { text: '已完成', bg: '#F0FFF4', color: '#38A169' },
  cancelled: { text: '已取消', bg: '#FFF5F5', color: '#E53E3E' },
};

const StatusTag: React.FC<StatusTagProps> = ({ status }) => {
  const s = labelMap[status] || labelMap.pending;
  return <span className="sun-tag" style={{ background: s.bg, color: s.color, borderColor: s.bg }}>{s.text}</span>;
};

export default StatusTag;
