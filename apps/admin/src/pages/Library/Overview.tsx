/**
 * 资源馆总览 — 轻量版
 * 
 * 展示: 资源总数/上架比例/分类分布/待处理提醒/最近记录
 * 数据来源: 同样是两个接口前端合并 (和列表页同样的 MVP 限制)
 */

import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Statistic, Tag, Table, Typography, Spin, Alert } from 'antd';
import {
  BookOutlined, CheckCircleOutlined, StopOutlined,
  PlusOutlined, WarningOutlined,
} from '@ant-design/icons';
import { getMaterialList } from '../../services/reading';
import { getResourceList } from '../../services/resource';
import {
  fromReadingMaterial, fromResource,
  READING_CATEGORY_LABELS, RESOURCE_CATEGORY_LABELS,
} from '../../library/adapter';
import type { ResourceItem } from '../../library/adapter';
import { CATEGORY_LABELS, MODULE_LABELS } from '../../constants/resource';

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
        ...mRes.items.map(m => fromReadingMaterial(m)),
        ...rRes.items.map(r => fromResource(r)),
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
  const noPdfItems = items.filter(i => !i.fileUrl);
  const noCoverItems = items.filter(i => !i.coverUrl);
  const featuredCount = items.filter(i => i.isFeatured).length;

  const byModule = (src: 'reading' | 'resource') => items.filter(i => i.source === src).length;
  const byCategory = (cat: string) => items.filter(i => i.category === cat).length;

  const recentItems = [...items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // unused: libraryColors / levelColors reserved for future UI
  void 0;

  const recentColumns = [
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: '模块', dataIndex: 'source', key: 'source', width: 100,
      render: (s: 'reading' | 'resource') => <Tag color={s === 'reading' ? 'blue' : 'green'}>{MODULE_LABELS[s]}</Tag>,
    },
    {
      title: '分类', dataIndex: 'category', key: 'category', width: 100,
      render: (v: string) => CATEGORY_LABELS[v] || READING_CATEGORY_LABELS[v] || RESOURCE_CATEGORY_LABELS[v] || v,
    },
    {
      title: '状态', dataIndex: 'isActive', key: 'isActive', width: 80,
      render: (v: boolean) => v ? <Tag color="green">上架</Tag> : <Tag>下架</Tag>,
    },
    {
      title: '创建', dataIndex: 'createdAt', key: 'createdAt', width: 170,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
  ];

  return (
    <div>
      <Title level={4}>资源馆总览</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="总资源数" value={total} prefix={<BookOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="已上架" value={activeCount} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="未上架" value={inactiveCount} valueStyle={{ color: '#999' }} prefix={<StopOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="推荐资源" value={featuredCount} valueStyle={{ color: '#722ed1' }} prefix={<PlusOutlined />} /></Card></Col>
      </Row>

      {/* 待处理提醒 */}
      {(noPdfItems.length > 0 || noCoverItems.length > 0) && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
          message={
            <span>
              {noPdfItems.length > 0 && <span>有 <b>{noPdfItems.length}</b> 个资源缺少 PDF；</span>}
              {noCoverItems.length > 0 && <span>有 <b>{noCoverItems.length}</b> 个资源缺少封面</span>}
            </span>
          }
        />
      )}

      {/* 按模块统计 */}
      <Card title="模块分布" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          {(['reading', 'resource'] as const).map(k => (
            <Col span={6} key={k}>
              <Card size="small" style={{ textAlign: 'center', borderTop: `3px solid ${k === 'reading' ? '#54C5F8' : '#48BB78'}` }}>
                <Statistic title={MODULE_LABELS[k]} value={byModule(k)} valueStyle={{ color: k === 'reading' ? '#54C5F8' : '#48BB78' }} />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 分类统计 */}
      <Card title="分类统计" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
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
