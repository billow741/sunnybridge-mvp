import { Typography } from 'antd';

interface PageContainerProps {
  title?: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}

export default function PageContainer({ title, children, extra }: PageContainerProps) {
  return (
    <div style={{ padding: '0 0 24px' }}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
          {extra}
        </div>
      )}
      {children}
    </div>
  );
}
