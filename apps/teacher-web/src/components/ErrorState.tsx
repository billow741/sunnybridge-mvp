import { Button, Result } from 'antd';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = '加载失败', onRetry }: ErrorStateProps) {
  return (
    <Result
      status="error"
      title={message}
      extra={onRetry ? <Button type="primary" onClick={onRetry}>重试</Button> : undefined}
    />
  );
}
