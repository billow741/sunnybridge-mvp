import React from 'react';
import { Button } from 'antd';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => (
  <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 12, padding: 16, textAlign: 'center' }}>
    <div style={{ color: '#E53E3E', fontSize: 14, marginBottom: onRetry ? 10 : 0 }}>{message}</div>
    {onRetry && <Button type="primary" size="small" onClick={onRetry}>重试</Button>}
  </div>
);

export default ErrorBanner;
