import React from 'react';
import { Card } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import type { ResourceOut } from '../../types';

interface ResourceCardProps {
  resource: ResourceOut;
  onClick: (id: string) => void;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onClick }) => (
  <Card
    hoverable
    onClick={() => onClick(resource.id)}
    style={{ borderRadius: 14 }}
    bodyStyle={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}
  >
    <div style={{
      width: 44, height: 44, borderRadius: 10, background: '#FFF5E6',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <FilePdfOutlined style={{ fontSize: 22, color: '#F4A230' }} />
    </div>
    <div style={{ flex: 1, overflow: 'hidden' }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {resource.title}
      </div>
      {resource.category && (
        <span className="sun-tag" style={{ marginTop: 4, display: 'inline-block' }}>{resource.category}</span>
      )}
    </div>
  </Card>
);

export default ResourceCard;
