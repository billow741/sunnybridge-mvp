import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div style={{ textAlign: 'center', padding: '48px 16px' }}>
    <div style={{ fontSize: 48, color: '#D48A20', marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 600, color: '#2D3748', marginBottom: 6 }}>{title}</div>
    {description && <div style={{ fontSize: 14, color: '#A0AEC0', marginBottom: 16 }}>{description}</div>}
    {action}
  </div>
);

export default EmptyState;
