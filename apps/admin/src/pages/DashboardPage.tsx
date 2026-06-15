/**
 * Dashboard / placeholder pages.
 *
 * ADMIN-01 scope: only login + layout + placeholder content.
 * Actual CRUD pages are ADMIN-02+.
 */

import React from 'react';
import { Card, Typography } from 'antd';
import { DashboardOutlined, ToolOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

/** Dashboard — 首页概览, shown after login. */
export const DashboardPage: React.FC = () => (
 <Card>
 <div style={{ textAlign: 'center', padding: '64px 0' }}>
 <DashboardOutlined style={{ fontSize: 64, color: '#bbb' }} />
 <Title level={4} style={{ marginTop: 16, color: '#666' }}>
 首页概览
 </Title>
 <Paragraph type="secondary">
 即将实现 · Coming Soon
 </Paragraph>
 </div>
 </Card>
);

/** Generic placeholder for not-yet-implemented admin pages. */
export const PlaceholderPage: React.FC<{ title: string; routeName?: string }> = ({
  title,
  routeName,
}) => (
  <Card>
    <div style={{ textAlign: 'center', padding: '64px 0' }}>
      <ToolOutlined style={{ fontSize: 64, color: '#bbb' }} />
      <Title level={4} style={{ marginTop: 16, color: '#666' }}>
        {title}
      </Title>
      <Paragraph type="secondary">
        即将实现 · Coming Soon
      </Paragraph>
      {routeName && (
        <Paragraph type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
          Route: {routeName}
        </Paragraph>
      )}
    </div>
  </Card>
);
