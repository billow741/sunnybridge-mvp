import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Table, Tag, Select, Input, Switch, Button, Space, Typography } from 'antd';
import { SearchOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getMaterialList } from '../../services/reading';
import { getResourceList } from '../../services/resource';
import {
  fromReadingMaterial,
  fromResource,
  filterResources,
  LIBRARY_LABELS,
  LIBRARY_OPTIONS,
  LEVEL_LABELS,
  LEVEL_OPTIONS,
  READING_CATEGORY_LABELS,
  RESOURCE_CATEGORY_LABELS,
  AUDIENCE_OPTIONS,
} from '../../library/adapter';
import type { ResourceItem, LibraryType, MaterialLevel, Audience } from '../../library/adapter';

const { Title } = Typography;

export default function LibrarySearch() {
  const [allItems, setAllItems] = useState<ResourceItem[]>([]);
  const [filtered, setFiltered] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState('');
  const [library, setLibrary] = useState<LibraryType | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [level, setLevel] = useState<MaterialLevel | undefined>();
  const [audience, setAudience] = useState<Audience | undefined>();
  const [isActive, setIsActive] = useState<boolean | undefined>();
  const [isFeatured, setIsFeatured] = useState<boolean | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, rRes] = await Promise.all([
        getMaterialList({ page_size: 999 } as any),
        getResourceList({ page_size: 999, is_active: null as unknown as undefined } as any),
      ]);
      const all = [
        ...mRes.items.map(m => fromReadingMaterial(m)),
                ...rRes.items.map(r => fromResource(r)),
      ];
      setAllItems(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    setFiltered(filterResources(allItems, {
      keyword: keyword || undefined,
      library,
      category,
      level,
      audience,
      isActive,
      isFeatured,
    }));
  }, [allItems, keyword, library, category, level, audience, isActive, isFeatured]);

  const libraryColors: Record<string, string> = { reading: '#54C5F8', teaching: '#48BB78', parent_support: '#ED8936', curation: '#9F7AEA' };

  const columns = [
    {
      title: '标题', dataIndex: 'title', key: 'title', ellipsis: true, width: 240,
      render: (v: string) => {
        if (!keyword) return v;
        const idx = v.toLowerCase().indexOf(keyword.toLowerCase());
        if (idx === -1) return v;
        return <span>{v.slice(0, idx)}<mark>{v.slice(idx, idx + keyword.length)}</mark>{v.slice(idx + keyword.length)}</span>;
      },
    },
    { title: '馆', dataIndex: 'library', key: 'library', width: 100, render: (v: LibraryType) => <Tag color={libraryColors[v]}>{LIBRARY_LABELS[v]}</Tag> },
    { title: 'Level', dataIndex: 'level', key: 'level', width: 80, render: (v: MaterialLevel) => v ? <Tag color="blue">{LEVEL_LABELS[v]}</Tag> : '-' },
    { title: '分类', dataIndex: 'category', key: 'category', width: 90, render: (v: string) => READING_CATEGORY_LABELS[v] || RESOURCE_CATEGORY_LABELS[v] || v },
    { title: '适用', dataIndex: 'audience', key: 'audience', width: 80, render: (v: Audience) => v === 'both' ? '通用' : v === 'parent' ? '家长' : '教师' },
    { title: '状态', dataIndex: 'isActive', key: 'isActive', width: 70, render: (v: boolean) => v ? <Tag color="green">上架</Tag> : <Tag>下架</Tag> },
    { title: '推荐', dataIndex: 'isFeatured', key: 'featured', width: 60, render: (v: boolean) => v ? <Tag color="purple">★</Tag> : '' },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: ResourceItem) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/library/cataloging?id=${record.id}&source=${record.source}`)}>编辑</Button>
      ),
    },
  ];

  const clearFilters = () => {
    setKeyword('');
    setLibrary(undefined);
    setCategory(undefined);
    setLevel(undefined);
    setAudience(undefined);
    setIsActive(undefined);
    setIsFeatured(undefined);
  };

  return (
    <div>
      <Title level={4}>资源检索</Title>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]} align="middle">
          <Col flex="auto">
            <Input.Search
              prefix={<SearchOutlined />}
              placeholder="关键词搜索标题..."
              allowClear
              enterButton="搜索"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onSearch={setKeyword}
              size="large"
            />
          </Col>
        </Row>
        <Row gutter={12} style={{ marginTop: 12 }} align="middle">
          <Col><span style={{ color: '#666' }}>筛选:</span></Col>
          <Col><Select placeholder="馆" allowClear style={{ width: 130 }} options={LIBRARY_OPTIONS} value={library} onChange={setLibrary} /></Col>
          <Col><Select placeholder="分类" allowClear style={{ width: 120 }} options={[...Object.entries(READING_CATEGORY_LABELS), ...Object.entries(RESOURCE_CATEGORY_LABELS)].map(([v,l])=>({value:v,label:l}))} value={category} onChange={setCategory} /></Col>
          <Col><Select placeholder="级别" allowClear style={{ width: 120 }} options={LEVEL_OPTIONS} value={level} onChange={setLevel} /></Col>
          <Col><Select placeholder="适用对象" allowClear style={{ width: 110 }} options={AUDIENCE_OPTIONS} value={audience} onChange={setAudience} /></Col>
          <Col><span style={{ color: '#666' }}>上架:</span> <Switch checked={isActive} onChange={v => setIsActive(v)} /> </Col>
          <Col><span style={{ color: '#666' }}>推荐:</span> <Switch checked={isFeatured} onChange={v => setIsFeatured(v)} /></Col>
          <Col><Button type="link" onClick={clearFilters}>清除筛选</Button></Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space>
              <Typography.Text type="secondary">找到 {filtered.length} 条结果</Typography.Text>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table rowKey="id" columns={columns} dataSource={filtered} loading={loading} size="small"
          pagination={{ pageSize: 25, showTotal: t => `共 ${t} 条`, showSizeChanger: true }}
          onRow={(record) => ({ onDoubleClick: () => navigate(`/library/cataloging?id=${record.id}&source=${record.source}`) })}
        />
      </Card>
    </div>
  );
}
