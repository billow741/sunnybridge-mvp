import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Dropdown, Menu, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface SearchResult {
  key: string;
  label: string;
  path: string;
  category: '学员' | '教师' | '课程' | '资源';
}

const mockData: SearchResult[] = [
  { key: 's1', label: '王小明 - 剩余 2 课时', path: '/students', category: '学员' },
  { key: 's2', label: '李华 - 剩余 8 课时', path: '/students', category: '学员' },
  { key: 't1', label: 'Ms. Sarah', path: '/teachers', category: '教师' },
  { key: 't2', label: 'Mr. James', path: '/teachers', category: '教师' },
  { key: 'c1', label: '2025-06-15 英语课', path: '/courses', category: '课程' },
  { key: 'c2', label: '2025-06-17 数学课', path: '/courses', category: '课程' },
  { key: 'r1', label: '阅读资料 - Level 3', path: '/content', category: '资源' },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<any>(null);

  const filtered = query.trim()
    ? mockData.filter(d => d.label.toLowerCase().includes(query.toLowerCase()))
    : [];

  const grouped = filtered.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const menuItems = Object.entries(grouped).map(([cat, items]) => ({
    key: `cat-${cat}`,
    type: 'group' as const,
    label: cat,
    children: items.map(item => ({
      key: item.key,
      label: <span onClick={() => { navigate(item.path); setOpen(false); setQuery(''); }}>{item.label}</span>,
    })),
  }));

  return (
    <Dropdown
      open={open && filtered.length > 0}
      dropdownRender={() => (
        <div style={{ padding: 8, minWidth: 320, background: '#fff', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          {filtered.length > 0 ? <Menu items={menuItems} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到结果" />}
        </div>
      )}
    >
      <div style={{ width: 280 }}>
        <Input
          ref={inputRef}
          prefix={<SearchOutlined />}
          placeholder="搜索学员、教师、课程..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          style={{ borderRadius: 20, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
        />
      </div>
    </Dropdown>
  );
}
