import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Tree, Table, Tag, Button, Space, Popconfirm, Typography, Input, Spin } from 'antd';
import { EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import type { TreeProps } from 'antd';
import { getMaterialList, deleteMaterial } from '../../services/reading';
import { getResourceList, deleteResource } from '../../services/resource';
import {
  fromReadingMaterial,
  fromResource,
  buildCatalogTree,
  filterResources,
  LIBRARY_LABELS,
  LEVEL_LABELS,
  READING_CATEGORY_LABELS,
  RESOURCE_CATEGORY_LABELS,
} from '../../library/adapter';
import type { ResourceItem } from '../../library/adapter';
import { useNavigate } from 'react-router-dom';

const { Sider, Content } = Layout;
const { Search } = Input;

export default function LibraryCatalog() {
  const [allItems, setAllItems] = useState<ResourceItem[]>([]);
  const [filtered, setFiltered] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<Record<string, any>>({});
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, rRes] = await Promise.all([
        getMaterialList({ page_size: 999 } as any),
        getResourceList({ page_size: 999, is_active: null as unknown as undefined } as any),
      ]);
      const all = [
        ...mRes.items.map(fromReadingMaterial),
        ...rRes.items.map(fromResource),
      ];
      setAllItems(all);
      setFiltered(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    setFiltered(filterResources(allItems, { ...selectedFilter, keyword: searchText || undefined }));
  }, [allItems, selectedFilter, searchText]);

  const onSelect: TreeProps['onSelect'] = (_keys, info) => {
    const node = info.node as any;
    if (node.filter) {
      setSelectedFilter(node.filter);
    } else {
      setSelectedFilter({});
    }
  };

  const handleDelete = async (item: ResourceItem) => {
    try {
      if (item.source === 'reading') {
        await deleteMaterial(item.id);
      } else {
        await deleteResource(item.id);
      }
      fetchData();
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const libraryColors: Record<string, string> = { reading: '#54C5F8', teaching: '#48BB78', parent_support: '#ED8936', curation: '#9F7AEA' };

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true, width: 220 },
    { title: '来源', dataIndex: 'source', key: 'source', width: 80, render: (v: string) => <Tag color={v === 'reading' ? 'blue' : 'green'}>{v === 'reading' ? '阅读' : '资源'}</Tag> },
    { title: '馆', dataIndex: 'library', key: 'library', width: 100, render: (v: string) => <Tag color={libraryColors[v]}>{LIBRARY_LABELS[v as keyof typeof LIBRARY_LABELS] || v}</Tag> },
    { title: 'Level', dataIndex: 'level', key: 'level', width: 80, render: (v: string) => v ? <Tag color="blue">{LEVEL_LABELS[v] || v}</Tag> : '-' },
    { title: '分类', dataIndex: 'category', key: 'category', width: 90, render: (v: string) => READING_CATEGORY_LABELS[v] || RESOURCE_CATEGORY_LABELS[v] || v },
    { title: '状态', dataIndex: 'isActive', key: 'isActive', width: 70, render: (v: boolean) => v ? <Tag color="green">上架</Tag> : <Tag>下架</Tag> },
    { title: 'PDF', dataIndex: 'fileUrl', key: 'pdf', width: 70, render: (v: string) => v && v !== 'pending_upload' ? <Tag color="success">有</Tag> : <Tag color="warning">无</Tag> },
    { title: '更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 150, render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
    {
      title: '操作', key: 'action', width: 140,
      render: (_: any, record: ResourceItem) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/library/cataloging?id=${record.id}&source=${record.source}`)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record)} okText="删除" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const treeData = buildCatalogTree() as any;

  return (
    <Layout style={{ background: 'transparent' }}>
      <Sider width={260} style={{ background: '#fff', borderRadius: 8, marginRight: 16, overflow: 'auto', height: 'calc(100vh - 160px)' }}>
        <div style={{ padding: '12px 12px 0' }}>
          <Typography.Text strong style={{ fontSize: 14 }}>馆藏目录</Typography.Text>
        </div>
        <Tree.DirectoryTree
          showIcon={false}
          treeData={treeData}
          onSelect={onSelect}
          defaultExpandParent
          style={{ padding: 8 }}
        />
      </Sider>
      <Content>
        <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <Search placeholder="搜索资源..." allowClear onSearch={setSearchText} onChange={e => !e.target.value && setSearchText('')} style={{ width: 300 }} />
            <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
          </div>
          <Table rowKey="id" columns={columns} dataSource={filtered} loading={loading} size="small"
            pagination={{ pageSize: 20, showTotal: t => `共 ${t} 项` }}
            scroll={{ y: 'calc(100vh - 320px)' }}
          />
        </div>
      </Content>
    </Layout>
  );
}
