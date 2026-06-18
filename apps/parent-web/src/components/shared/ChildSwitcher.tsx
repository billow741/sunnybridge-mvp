import React from 'react';
import { Avatar, Dropdown } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import type { ChildBrief, ChildOut } from '../../types';

interface ChildSwitcherProps {
  children: ChildBrief[] | ChildOut[];
  currentId: string;
  onChange: (id: string) => void;
}

const ChildSwitcher: React.FC<ChildSwitcherProps> = ({ children, currentId, onChange }) => {
  const current = children.find(c => c.id === currentId);
  const items = children.map(c => ({
    key: c.id,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar size={24} style={{ background: '#F4A230', color: '#fff', fontSize: 12 }}>
          {(c.english_name || c.name)[0]}
        </Avatar>
        <span>{c.english_name || c.name}</span>
      </div>
    ),
  }));

  return (
    <Dropdown menu={{ items, onClick: e => onChange(e.key) }} trigger={['click']}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        <Avatar size={28} style={{ background: '#F4A230', color: '#fff' }}>
          {current ? (current.english_name || current.name)[0] : '?'}
        </Avatar>
        <span style={{ fontWeight: 600, fontSize: 15, color: '#2D3748' }}>
          {current ? (current.english_name || current.name) : '选择孩子'}
        </span>
        <SwapOutlined style={{ color: '#A0AEC0', fontSize: 12 }} />
      </div>
    </Dropdown>
  );
};

export default ChildSwitcher;
