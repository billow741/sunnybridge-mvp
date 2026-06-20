import { useEffect, useState } from 'react';
import { Card, List, Tag, Spin, Select } from 'antd';
import client, { extractError } from '@/api/client';

export default function ReadingList() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/reading-materials', { params: { page: 1, page_size: 200 } });
        setMaterials(Array.isArray(data) ? data : (data.items || []));
      } catch (err) { console.error(extractError(err)); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  const levels = [...new Set(materials.map((m: any) => m.level).filter(Boolean))];
  const filtered = levelFilter ? materials.filter(m => m.level === levelFilter) : materials;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>阅读资源</div>
        {levels.length > 0 && <Select placeholder="筛选级别" style={{ width: 120 }} allowClear onChange={setLevelFilter}
          options={levels.map(l => ({ value: l, label: l }))} />}
      </div>
      <List grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }} dataSource={filtered} renderItem={(m: any) => (
        <List.Item>
          <Card hoverable size="small" style={{ borderRadius: 10 }}
            cover={m.cover_url ? <img src={m.cover_url} alt={m.title} style={{ height: 120, objectFit: 'cover', borderRadius: '10px 10px 0 0' }} /> : undefined}
            actions={m.pdf_url ? [<a href={m.pdf_url} target="_blank" rel="noopener" style={{ fontSize: 13 }}>查看PDF</a>] : undefined}>
            <Card.Meta
              title={<span style={{ fontSize: 14 }}>{m.title}</span>}
              description={<>{m.level && <Tag color="blue">{m.level}</Tag>}{m.category && <Tag>{m.category}</Tag>}{m.page_count && <span style={{ color: '#94a3b8', fontSize: 12 }}>{m.page_count}页</span>}</>}
            />
          </Card>
        </List.Item>
      )} />
    </div>
  );
}
