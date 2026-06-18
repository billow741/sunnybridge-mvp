import React from 'react';

interface StatusTagProps {
  status: 'pending' | 'completed' | 'cancelled' | 'draft';
}

const statusConfig: Record<string, { bg: string; color: string; text: string }> = {
  pending:   { bg: '#FEF3C7', color: '#92400E', text: 'Pending' },
  completed: { bg: '#D1FAE5', color: '#065F46', text: 'Completed' },
  cancelled: { bg: '#FEE2E2', color: '#991B1B', text: 'Cancelled' },
  draft:     { bg: '#DBEAFE', color: '#1E40AF', text: 'Draft' },
};

const StatusTag: React.FC<StatusTagProps> = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.pending;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 500,
      backgroundColor: cfg.bg,
      color: cfg.color,
      lineHeight: '20px',
    }}>
      {cfg.text}
    </span>
  );
};

export default StatusTag;
