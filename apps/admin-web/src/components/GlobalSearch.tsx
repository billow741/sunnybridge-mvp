import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Empty, Spin, Typography, Space, Tag } from 'antd';
import { SearchOutlined, TeamOutlined, TrophyOutlined, BookOutlined, FileTextOutlined } from '@ant-design/icons';
import client from '@/api/client';

const { Text } = Typography;

interface SearchItem {
  id: string;
  name: string;
  sub: string;
  type: string;
  path: string;
}

interface SearchResult {
  students: SearchItem[];
  teachers: SearchItem[];
  courses: SearchItem[];
  resources: SearchItem[];
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  student:  { icon: <TeamOutlined />, label: '学员', color: '#5CAADF' },
  teacher:  { icon: <TrophyOutlined />, label: '教师', color: '#52c41a' },
  course:   { icon: <BookOutlined />, label: '课程', color: '#F4A230' },
  resource: { icon: <FileTextOutlined />, label: '内容', color: '#722ed1' },
};

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const navigate = useNavigate();
  const inputRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // 防抖搜索
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResult(null); return; }
    setLoading(true);
    try {
      const { data } = await client.get('/search', { params: { q: q.trim() } });
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResult(null); return; }
    timerRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, doSearch]);

  const handleClick = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery('');
    setResult(null);
  };

  const allItems = result
    ? [
        ...result.students.map(s => ({ ...s, type: 'student' })),
        ...result.teachers.map(t => ({ ...t, type: 'teacher' })),
        ...result.courses.map(c => ({ ...c, type: 'course' })),
        ...result.resources.map(r => ({ ...r, type: 'resource' })),
      ]
    : [];

  const hasResult = allItems.length > 0;

  // 分组渲染
  const renderGrouped = () => {
    const groups: Record<string, SearchItem[]> = {};
    for (const item of allItems) {
      groups[item.type] = groups[item.type] || [];
      groups[item.type].push(item);
    }
    return Object.entries(groups).map(([type, items]) => {
      const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.resource;
      return (
        <div key={type} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
            {cfg.label}
          </div>
          {items.map(item => (
            <div key={item.id} onClick={() => handleClick(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                fontSize: 13,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ color: cfg.color }}>{cfg.icon}</span>
              <Text style={{ flex: 1 }}>{item.name}</Text>
              {item.sub && <Text type="secondary" style={{ fontSize: 11 }}>{item.sub}</Text>}
            </div>
          ))}
        </div>
      );
    });
  };

  return (
    <div style={{ position: 'relative', width: 280 }}>
      <Input
        ref={inputRef}
        prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
        placeholder="搜索学员、教师、课程..."
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        style={{ borderRadius: 20, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
        allowClear
      />
      {open && query.trim() && (
        <div style={{
          position: 'absolute', top: 40, left: 0, zIndex: 1000,
          width: 360, maxHeight: 420, overflow: 'auto',
          background: '#fff', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: 12,
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
          ) : hasResult ? (
            renderGrouped()
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到结果" />
          )}
        </div>
      )}
    </div>
  );
}
