import { useState, useEffect, useCallback } from 'react';
import { Card, Tag, Typography, Spin, Empty } from 'antd';
import { StarOutlined, FireOutlined, PlusOutlined, BookOutlined, SoundOutlined } from '@ant-design/icons';
import { getMaterialList } from '../../services/reading';
import { getResourceList } from '../../services/resource';
import {
  fromReadingMaterial,
  fromResource,
  filterResources,
  LEVEL_LABELS,
  READING_CATEGORY_LABELS,
  RESOURCE_CATEGORY_LABELS,
} from '../../library/adapter';
import type { ResourceItem } from '../../library/adapter';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface ShelfItem {
  item: ResourceItem;
  onClick: () => void;
}

function MiniCard({ item, onClick }: ShelfItem) {
  return (
    <Card
      hoverable
      size="small"
      style={{ width: 180, flexShrink: 0, marginRight: 12, borderRadius: 8 }}
      onClick={onClick}
      bodyStyle={{ padding: '12px 14px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Text strong ellipsis style={{ fontSize: 14 }}>{item.title}</Text>
        <div>
          {item.level && <Tag color="blue" style={{ marginRight: 4 }}>{LEVEL_LABELS[item.level]}</Tag>}
          <Tag>{READING_CATEGORY_LABELS[item.category] || RESOURCE_CATEGORY_LABELS[item.category] || item.category}</Tag>
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>{item.isActive ? '上架' : '下架'}</Text>
      </div>
    </Card>
  );
}

interface ShelfProps {
  title: string;
  icon: React.ReactNode;
  items: ResourceItem[];
  loading: boolean;
  onItemClick: (item: ResourceItem) => void;
  emptyText?: string;
}

function Shelf({ title, icon, items, loading, onItemClick, emptyText }: ShelfProps) {
  return (
    <Card title={<>{icon} {title}</>} style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
      {loading ? <Spin /> : items.length === 0 ? <Empty description={emptyText || '暂无资源'} image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
        <div style={{ display: 'flex', overflowX: 'auto', paddingBottom: 8 }}>
          {items.map(item => <MiniCard key={item.id} item={item} onClick={() => onItemClick(item)} />)}
        </div>
      )}
    </Card>
  );
}

export default function LibraryCuration() {
  const [allItems, setAllItems] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, rRes] = await Promise.all([
        getMaterialList({ page_size: 999 } as any),
        getResourceList({ page_size: 999, is_active: null as unknown as undefined } as any),
      ]);
      setAllItems([
        ...mRes.items.map(fromReadingMaterial),
        ...rRes.items.map(fromResource),
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleItemClick = (item: ResourceItem) => {
    navigate(`/library/cataloging?id=${item.id}&source=${item.source}`);
  };

  // Predefined shelves
  const featuredItems = filterResources(allItems, { isFeatured: true, isActive: true });
  const newItems = [...allItems].filter(i => i.isActive).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 15);
  const l1Items = filterResources(allItems, { library: 'reading', level: 'L1', category: 'picture_book', isActive: true });
  const phonicsItems = filterResources(allItems, { category: 'phonics', isActive: true });
  // TODO: 热门资源 needs backend view_count tracking
  const hotItems: ResourceItem[] = []; // placeholder

  return (
    <div>
      <Title level={4}>专题陈列</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        图书馆书展式推荐位，方便家长和老师快速发现优质资源
      </Text>

      <Shelf title="本周推荐" icon={<StarOutlined style={{ color: '#722ed1' }} />} items={featuredItems} loading={loading} onItemClick={handleItemClick} emptyText="暂无推荐资源，可在编目页标记 isFeatured" />
      <Shelf title="热门资源" icon={<FireOutlined style={{ color: '#f5222d' }} />} items={hotItems} loading={loading} onItemClick={handleItemClick} emptyText="TODO: 需要后端记录资源访问量 (view_count)" />
      <Shelf title="新上架" icon={<PlusOutlined style={{ color: '#1890ff' }} />} items={newItems} loading={loading} onItemClick={handleItemClick} />
      <Shelf title="L1 入门绘本" icon={<BookOutlined style={{ color: '#52c41a' }} />} items={l1Items} loading={loading} onItemClick={handleItemClick} />
      <Shelf title="Phonics 专题" icon={<SoundOutlined style={{ color: '#fa8c16' }} />} items={phonicsItems} loading={loading} onItemClick={handleItemClick} />

      <Card style={{ marginTop: 16, background: '#fafafa' }}>
        <Text type="secondary">
          💡 未来可扩展：管理员手选资源进专题、规则自动填充（最近30天访问量前N名）、Level 专题组等
        </Text>
      </Card>
    </div>
  );
}
