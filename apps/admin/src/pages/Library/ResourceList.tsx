/**
 * 资源列表页 — 合并 reading + resources 视图
 *
 * ⚠️ MVP 限制说明:
 * - 分页和总数不精确: 两个接口分别分页, 前端合并排序后只做前端分页
 * - 后续需要后端提供统一聚合接口 /api/v1/library/items
 * - module 列仅做标记, 不入库 (reading→readingmaterials, resource→resources)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Tag, Input, Select, Space, Popconfirm,
  message, Avatar, Tooltip, Typography, Alert,
} from 'antd';
import {
  PlusOutlined, EditOutlined, UploadOutlined,
  PictureOutlined, CheckCircleOutlined, StopOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { getMaterialList, deleteMaterial } from '../../services/reading';
import { getResourceList, deleteResource } from '../../services/resource';
import { fromReadingMaterial, fromResource } from '../../library/adapter';
import type { ResourceItem } from '../../library/adapter';
import { MODULE_LABELS, CATEGORY_LABELS } from '../../constants/resource';
import type { ModuleType } from '../../constants/resource';
import ResourceDrawer, { type DrawerMode } from './ResourceDrawer';

const { Search } = Input;
const { Text } = Typography;

export default function ResourceListPage() {
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [filterModule, setFilterModule] = useState<ModuleType | ''>('');
  const [filterStatus, setFilterStatus] = useState<'active' | 'inactive' | ''>('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create');
  const [editingItem, setEditingItem] = useState<ResourceItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // ⚠️ MVP: 分别拉取后前端合并, 总数不精确
      const [mRes, rRes] = await Promise.all([
        getMaterialList({ page_size: 999, is_active: null as unknown as undefined } as any),
        getResourceList({ page_size: 999, is_active: null as unknown as undefined } as any),
      ]);
      const all: ResourceItem[] = [
        ...mRes.items.map(m => fromReadingMaterial(m)),
        ...rRes.items.map(r => fromResource(r)),
      ];
      // 按创建时间倒序
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(all);
    } catch (e) {
      console.error('Failed to fetch resources', e);
      message.error('加载资源列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 筛选
  const filtered = items.filter(item => {
    if (filterModule && item.source !== filterModule) return false;
    if (filterStatus === 'active' && !item.isActive) return false;
    if (filterStatus === 'inactive' && item.isActive) return false;
    if (keyword) {
      const kw = keyword.toLowerCase();
      if (!item.title.toLowerCase().includes(kw)) return false;
    }
    return true;
  });

  // 统计
  const totalCount = filtered.length;
  const activeCount = filtered.filter(i => i.isActive).length;
  const noPdfCount = filtered.filter(i => !i.fileUrl).length;
  const noCoverCount = filtered.filter(i => !i.coverUrl).length;

  const handleToggleActive = async (item: ResourceItem) => {
    try {
      if (item.source === 'reading') {
        const { updateMaterial } = await import('../../services/reading');
        await updateMaterial(item.id, { is_active: !item.isActive });
      } else {
        const { updateResource } = await import('../../services/resource');
        await updateResource(item.id, { is_active: !item.isActive });
      }
      message.success(item.isActive ? '已下架' : '已上架');
      fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (item: ResourceItem) => {
    try {
      if (item.source === 'reading') {
        await deleteMaterial(item.id);
      } else {
        await deleteResource(item.id);
      }
      message.success('已删除');
      fetchData();
    } catch {
      message.error('删除失败');
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setDrawerMode('create');
    setDrawerVisible(true);
  };

  const openEdit = (item: ResourceItem) => {
    setEditingItem(item);
    setDrawerMode('edit');
    setDrawerVisible(true);
  };

  const columns = [
    {
      title: '封面',
      dataIndex: 'coverUrl',
      key: 'cover',
      width: 64,
      render: (url: string | undefined, _record: ResourceItem) => (
        <Avatar
          shape="square"
          size={40}
          src={url}
          style={{ backgroundColor: '#f0f0f0' }}
        >
          {!url && <PictureOutlined />}
        </Avatar>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (t: string, record: ResourceItem) => (
        <div>
          <Text strong>{t}</Text>
          {record.subtitle && <><br /><Text type="secondary" style={{ fontSize: 12 }}>{record.subtitle}</Text></>}
        </div>
      ),
    },
    {
      title: '模块',
      dataIndex: 'source',
      key: 'module',
      width: 100,
      render: (s: 'reading' | 'resource') => (
        <Tag color={s === 'reading' ? 'blue' : 'green'}>
          {MODULE_LABELS[s]}
        </Tag>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (c: string) => CATEGORY_LABELS[c] || c,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 70,
      render: (l: string | undefined) =>
        l ? <Tag>{l}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'PDF',
      key: 'hasPdf',
      width: 60,
      render: (_: any, record: ResourceItem) =>
        record.fileUrl
          ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
          : <StopOutlined style={{ color: '#ff4d4f' }} />,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (v: boolean) =>
        v ? <Tag color="green">上架</Tag> : <Tag>下架</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: ResourceItem) => (
        <Space size={4}>
          <Tooltip title="编辑">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title={record.isActive ? '下架' : '上架'}>
            <Button type="link" size="small" icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
              onClick={() => handleToggleActive(record)} />
          </Tooltip>
          {!record.fileUrl && (
            <Tooltip title="上传PDF">
              <Button type="link" size="small" icon={<UploadOutlined />} onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          {!record.coverUrl && (
            <Tooltip title="上传封面">
              <Button type="link" size="small" icon={<PictureOutlined />} onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Search
            placeholder="搜索资源标题"
            allowClear
            onSearch={setKeyword}
            onChange={e => !e.target.value && setKeyword('')}
            style={{ width: 240 }}
          />
          <Select
            placeholder="模块筛选"
            allowClear
            style={{ width: 120 }}
            value={filterModule || undefined}
            onChange={v => setFilterModule(v || '')}
            options={[
              { value: 'reading', label: '阅读材料' },
              { value: 'resource', label: '通用资源' },
            ]}
          />
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 100 }}
            value={filterStatus || undefined}
            onChange={v => setFilterStatus(v || '')}
            options={[
              { value: 'active', label: '上架' },
              { value: 'inactive', label: '下架' },
            ]}
          />
          <Text type="secondary">共 {totalCount} 条 | 上架 {activeCount} | 无PDF {noPdfCount} | 无封面 {noCoverCount}</Text>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建资源
        </Button>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message={
          <>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ⚠️ MVP 限制: 列表由 reading + resources 两个接口合并而来, 分页和总数为前端计算, 不完全精确。
              后续需要后端提供统一聚合接口。
            </Text>
          </>
        }
      />

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
        size="middle"
      />

      <ResourceDrawer
        visible={drawerVisible}
        mode={drawerMode}
        item={editingItem}
        onClose={() => setDrawerVisible(false)}
        onSuccess={() => { setDrawerVisible(false); fetchData(); }}
      />
    </div>
  );
}
