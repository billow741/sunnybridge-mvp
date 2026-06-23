/**
 * 全局搜索 — P1-B: 查看更多 / loadMore 分页
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Empty, Spin, Typography, Space, Tag, Button, Divider } from 'antd';
import { SearchOutlined, TeamOutlined, TrophyOutlined, BookOutlined, FileTextOutlined, DollarOutlined, ArrowRightOutlined } from '@ant-design/icons';
import client from '@/api/client';
import { useEntityDrawerStore } from '@/store/entityDrawerStore';

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
  payments: SearchItem[];
  has_more: Record<string, boolean>;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; entityType: string }> = {
  student:  { icon: <TeamOutlined />,    label: '学员', color: '#5CAADF', entityType: 'student' },
  teacher:  { icon: <TrophyOutlined />,  label: '教师', color: '#52c41a', entityType: 'teacher' },
  course:   { icon: <BookOutlined />,    label: '课程', color: '#F4A230', entityType: 'course' },
  resource: { icon: <FileTextOutlined />, label: '内容', color: '#722ed1', entityType: 'reading_material' },
  payment:  { icon: <DollarOutlined />,  label: '收款', color: '#eb2f96', entityType: 'payment' },
};

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [moreType, setMoreType] = useState<string | null>(null);
  const [moreItems, setMoreItems] = useState<SearchItem[]>([]);
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreTotal, setMoreTotal] = useState(0);
  const [morePage, setMorePage] = useState(1);
  const openEntity = useEntityDrawerStore(s => s.openEntity);
  const inputRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResult(null); return; }
    setLoading(true);
    try {
      const { data } = await client.get('/search', { params: { q: q.trim() } });
      setResult(data);
      setMoreType(null);
    } catch { setResult(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResult(null); return; }
    timerRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, doSearch]);

  // 查看更多
  const loadMore = async (type: string, page = 1) => {
    setMoreLoading(true);
    try {
      const { data } = await client.get('/search/more', { params: { q: query.trim(), type, page, page_size: 10 } });
      if (page === 1) setMoreItems(data.items || []);
      else setMoreItems(prev => [...prev, ...(data.items || [])]);
      setMoreTotal(data.total || 0);
      setMorePage(page);
      setMoreType(type);
    } catch { /* 静默 */ }
    finally { setMoreLoading(false); }
  };

  const handleClick = (item: SearchItem) => {
    const cfg = TYPE_CONFIG[item.type];
    if (cfg) openEntity(cfg.entityType, item.id);
    setOpen(false);
    setQuery('');
    setResult(null);
    setMoreType(null);
  };

  const groups: Record<string, SearchItem[]> = {};
  if (result) {
    for (const s of result.students || []) { groups.student = groups.student || []; groups.student.push({ ...s, type: 'student' }); }
    for (const t of result.teachers || []) { groups.teacher = groups.teacher || []; groups.teacher.push({ ...t, type: 'teacher' }); }
    for (const c of result.courses || []) { groups.course = groups.course || []; groups.course.push({ ...c, type: 'course' }); }
    for (const r of result.resources || []) { groups.resource = groups.resource || []; groups.resource.push({ ...r, type: 'resource' }); }
    for (const p of result.payments || []) { groups.payment = groups.payment || []; groups.payment.push({ ...p, type: 'payment' }); }
  }

  const hasResult = Object.keys(groups).length > 0;
  const showingMore = moreType !== null;

  const renderItem = (item: SearchItem) => {
    const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.resource;
    return (
      <div key={item.id} onClick={() => handleClick(item)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ color: cfg.color }}>{cfg.icon}</span>
        <Text style={{ flex: 1 }}>{item.name}</Text>
        {item.sub && <Text type="secondary" style={{ fontSize: 11 }}>{item.sub}</Text>}
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', width: 280 }}>
      <Input
        ref={inputRef}
        prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
        placeholder="搜索学员、教师、课程..."
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setMoreType(null); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        style={{ borderRadius: 20, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
        allowClear
      />
      {open && query.trim() && (
        <div style={{
          position: 'absolute', top: 40, left: 0, zIndex: 1000,
          width: 360, maxHeight: 480, overflow: 'auto',
          background: '#fff', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: 12,
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
          ) : showingMore ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Button size="small" onClick={() => setMoreType(null)}>← 返回</Button>
                <Text strong>{TYPE_CONFIG[moreType]?.label || moreType} ({moreTotal})</Text>
              </div>
              {moreItems.map(renderItem)}
              {moreLoading && <div style={{ textAlign: 'center', padding: 12 }}><Spin /></div>}
              {moreItems.length < moreTotal && (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Button type="link" size="small" loading={moreLoading}
                    onClick={() => loadMore(moreType!, morePage + 1)}>
                    加载更多
                  </Button>
                </div>
              )}
            </>
          ) : hasResult ? (
            Object.entries(groups).map(([type, items]) => {
              const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.resource;
              const hasMore = result?.has_more?.[type];
              return (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {cfg.label}
                  </div>
                  {items.map(renderItem)}
                  {hasMore && (
                    <Button type="link" size="small" style={{ padding: '2px 8px', fontSize: 12 }}
                      icon={<ArrowRightOutlined />}
                      onClick={(e) => { e.stopPropagation(); loadMore(type, 1); }}>
                      查看更多 {cfg.label}
                    </Button>
                  )}
                </div>
              );
            })
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到结果" />
          )}
        </div>
      )}
    </div>
  );
}
