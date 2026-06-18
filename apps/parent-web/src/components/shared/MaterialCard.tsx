import React from 'react';
import { Card } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import type { MaterialOut } from '../../types';
import LevelTag from './LevelTag';

interface MaterialCardProps {
  material: MaterialOut;
  onClick: (id: string) => void;
}

const categoryLabels: Record<string, string> = {
  picture_book: '绘本',
  short_text: '短文',
  story: '故事',
  read_aloud: '朗读',
};

const MaterialCard: React.FC<MaterialCardProps> = ({ material, onClick }) => (
  <Card
    hoverable
    onClick={() => onClick(material.id)}
    cover={
      material.cover_url ? (
        <img src={material.cover_url} alt={material.title}
          style={{ height: 140, objectFit: 'cover', borderRadius: '14px 14px 0 0' }} />
      ) : (
        <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #FFF5E6, #FFD9A0)', borderRadius: '14px 14px 0 0' }}>
          <BookOutlined style={{ fontSize: 40, color: '#F4A230' }} />
        </div>
      )
    }
    style={{ borderRadius: 14 }}
    bodyStyle={{ padding: 12 }}
  >
    <div style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {material.title}
    </div>
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {material.level && <LevelTag level={material.level} />}
      {material.category && <span style={{ fontSize: 12, color: '#A0AEC0' }}>{categoryLabels[material.category] || material.category}</span>}
    </div>
  </Card>
);

export default MaterialCard;
