import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Statistic, Tag, Table, Typography, Spin } from 'antd';
import {
  BookOutlined,
  ReadOutlined,
  TeamOutlined,
  StarOutlined,
  CheckCircleOutlined,
  StopOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { getMaterialList } from '../../services/reading';
import { getResourceList } from '../../services/resource';
import {
  fromReadingMaterial,
  fromResource,
  LIBRARY_LABELS,
  LEVEL_LABELS,
  READING_CATEGORY_LABELS,
  RESOURCE_CATEGORY_LABELS,
} from '../../library/adapter';
import type { ResourceItem, LibraryType, MaterialLevel } from '../../library/adapter';

const { Title } = Typography;

export default function LibraryOverview() {
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, rRes] = await Promise.all([
        getMaterialList({ page_size: 999, is_active: null as unknown as undefined } as any),
        getResourceList({ page_size: 999, is_active: null as unknown as undefined } as any),
      ]);
      const all = [
        ...mRes.items.map(fromReadingMaterial),
        ...rRes.items.map(fromResource),
      ];
      setItems(all);
    } catch (e) {
      console.error('Failed to fetch library data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>;

  const total = items.length;
  const activeCount = items.filter(i => i.isActive).length;
  const inactiveCount = total - activeCount;
  const featuredCount = items.filter(i => i.isFeatured).length;

  const byLibrary = (lt: LibraryType) => items.filter(i => i.library === lt).length;
  const byLevel = (lv: MaterialLevel) => items.filter(i => i.level === lv).length;
  const byCategory = (cat: string) => items.filter(i => i.category === cat).length;

  const recentItems = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  const libraryColors: Record<string, string> = { reading: '#54C5F8', teaching: '#48BB78', parent_support: '#ED8936', curation: '#9F7AEA' };
  const levelColors: Record<string, string> = { L1: 'blue', L2: 'cyan', L3: 'green', L4: 'orange', L5: 'red', L6: 'purple' };

  const recentColumns = [
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: '馆', dataIndex: 'library', key: 'library', width: 120, render: (v: LibraryType) => <Tag color={libraryColors[v]}>{LIBRARY_LABELS[v]}</Tag> },
    { title: 'Level', dataIndex: 'level', key: 'level', width: 80, render: (v: MaterialLevel) => v ? <Tag color={levelColors[v]}>{LEVEL_LABELS[v]}</Tag> : '-' },
    { title: '分类', dataIndex: 'category', key: 'category', width: 100, render: (v: string) => READING_CATEGORY_LABELS[v] || RESOURCE_CATEGORY_LABELS[v] || v },
    { title: '状态', dataIndex: 'isActive', key: 'isActive', width: 80, render: (v: boolean) => v ? <Tag color="green">上架</Tag> : <Tag>下架</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: (v: string) => new Date(v).toLocaleString('zh-CN') },
  ];

  return (
    <div>
      <Title level={4}>资源馆总览</Title>

      {/* 统计概要 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="总资源数" value={total} prefix={<BookOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="已上架" value={activeCount} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="未上架" value={inactiveCount} valueStyle={{ color: '#999' }} prefix={<StopOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="推荐资源" value={featuredCount} valueStyle={{ color: '#722ed1' }} prefix={<StarOutlined />} /></Card></Col>
      </Row>

      {/* 按馆统计 */}
      <Card title="馆藏分布" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          {(Object.entries(LIBRARY_LABELS) as [LibraryType, string][]).map(([k, label]) => (
            <Col span={6} key={k}>
              <Card size="small" style={{ textAlign: 'center', borderTop: `3px solid ${libraryColors[k]}` }}>
                <Statistic title={label} value={byLibrary(k)} valueStyle={{ color: libraryColors[k] }} />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 按Level统计 */}
      <Card title="级别分布（阅读馆）" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['L1','L2','L3','L4','L5','L6'] as MaterialLevel[]).map(lv => (
            <Tag key={lv} color={levelColors[lv]} style={{ fontSize: 14, padding: '4px 12px' }}>
              {LEVEL_LABELS[lv]}: {byLevel(lv)}
            </Tag>
          ))}
        </div>
      </Card>

      {/* 按Category统计 */}
      <Card title="分类统计" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries({ ...READING_CATEGORY_LABELS, ...RESOURCE_CATEGORY_LABELS }).map(([k, label]) => (
            <Tag key={k} style={{ fontSize: 13, padding: '4px 12px' }}>
              {label}: {byCategory(k)}
            </Tag>
          ))}
        </div>
      </Card>

      {/* 最近新增 */}
      <Card title={<><PlusOutlined /> 最近新增</>}>
        <Table rowKey="id" columns={recentColumns} dataSource={recentItems} pagination={false} size="small" />
      </Card>
    </div>
  );
}
