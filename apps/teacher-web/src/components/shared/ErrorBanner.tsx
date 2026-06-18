import React from 'react';
import { Button } from 'antd';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 6,
    padding: '10px 14px',
  }}>
    <span style={{ color: '#991B1B', fontSize: 14 }}>⚠ {message}</span>
    {onRetry && (
      <Button
        size="small"
        style={{ borderColor: '#FC8181', color: '#991B1B', marginLeft: 12 }}
        onClick={onRetry}
      >
        Retry
      </Button>
    )}
  </div>
);

export default ErrorBanner;
