import { useEffect, useState, useMemo } from 'react';
import { Card, Table, Tag, Select, Spin, Typography, Space, Image, Button } from 'antd';
import { BookOutlined, DownloadOutlined, FilePdfOutlined, FilterOutlined } from '@ant-design/icons';
import client, { extractError } from '@/api/client';

const { Title, Text } = Typography;

const CEFR_COLORS: Record<string, string> = {
  starter: 'default',
  A1: 'blue',
  A2: 'cyan',
  B1: 'green',
  B2: 'lime',
  C1: 'orange',
  C2: 'red',
};

const CEFR_OPTIONS = [
  { value: '', label: '全部级别' },
  { value: 'starter', label: 'Starter' },
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
];

const CATEGORY_LABELS: Record<string, string> = {
  picture_book: '绘本',
  short_text: '短文',
  story: '故事',
  read_aloud: '跟读',
};

export default function Materials() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchMaterials = async (lvl: string, pg: number) => {
    setLoading(true);
    try {
      const params: any = { page: pg, page_size: pageSize, is_active: true };
      if (lvl) params.level = lvl;
      const res = await client.get('/reading/materials', { params });
      setItems(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials(levelFilter, page);
  }, [levelFilter, page]);

  const handleDownload = async (materialId: string, title: string) => {
    try {
      const res = await client.get(`/reading/materials/${materialId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(extractError(err));
    }
  };

  const columns = [
    {
      title: '封面',
      dataIndex: 'cover_url',
      key: 'cover',
      width: 80,
      render: (url: string) =>
        url ? (
          <Image src={url} width={50} height={66} style={{ objectFit: 'cover', borderRadius: 4 }} preview={false} />
        ) : (
          <div style={{ width: 50, height: 66, background: '#f5f5f5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FilePdfOutlined style={{ fontSize: 20, color: '#999' }} />
          </div>
        ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => <span style={{ fontWeight: 600 }}>{title}</span>,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 90,
      render: (level: string) =>
        level ? (
          <Tag color={CEFR_COLORS[level] || 'default'}>{level.toUpperCase()}</Tag>
        ) : (
          <Tag>未设置</Tag>
        ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 90,
      render: (cat: string) => CATEGORY_LABELS[cat] || cat || '-',
    },
    {
      title: '页数',
      dataIndex: 'page_count',
      key: 'page_count',
      width: 70,
      render: (n: number) => (n ? `${n}页` : '-'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 110,
      render: (d: string) => (d ? d.slice(0, 10) : '-'),
    },
    {
      title: '',
      key: 'action',
      width: 70,
      render: (_: any, r: any) =>
        r.pdf_url ? (
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(r.id, r.title)}
          />
        ) : null,
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 4 }}>
          <BookOutlined style={{ marginRight: 8 }} />
          阅读材料
        </Title>
        <Text type="secondary">共 {total} 份材料，仅显示已上架</Text>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <FilterOutlined style={{ color: '#999' }} />
            <Select
              value={levelFilter}
              onChange={(v) => { setLevelFilter(v); setPage(1); }}
              options={CEFR_OPTIONS}
              style={{ width: 140 }}
            />
          </Space>
        </div>
        <Table
          dataSource={items}
          columns={columns}
          rowKey="id"
          size="middle"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            simple: true,
          }}
        />
      </Card>
    </div>
  );
}
