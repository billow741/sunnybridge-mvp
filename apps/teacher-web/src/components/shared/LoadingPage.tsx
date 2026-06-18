import React from 'react';
import { Skeleton } from 'antd';

interface LoadingPageProps {
  rows?: number;
}

const LoadingPage: React.FC<LoadingPageProps> = ({ rows = 3 }) => (
  <div style={{ padding: 24 }}>
    <Skeleton active avatar={false} paragraph={{ rows }} />
  </div>
);

export default LoadingPage;
