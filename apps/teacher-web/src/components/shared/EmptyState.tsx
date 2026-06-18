import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 15, fontWeight: 600, color: '#1A2B4A', marginBottom: 6 }}>{title}</div>
    {description && (
      <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 16 }}>{description}</div>
    )}
    {action}
  </div>
);

export default EmptyState;
