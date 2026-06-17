/**
 * ReadingPage — 阅读馆管理页面，保持现有功能，仅修正常量引用
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Table, Button, Switch, Tag, Typography, Space, Select, Popconfirm, message, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, UploadOutlined, DeleteOutlined, FilePdfOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import ReadingForm from '../../components/ReadingForm';
import {
  getMaterialList,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  uploadMaterialPdf,
} from '../../services/reading';
import type { ReadingMaterial } from '../../services/reading';
import { usePdfUploader, PdfUploadModal } from '../../hooks/usePdfUploader';
import { LEVEL_OPTIONS, VALID_CATEGORIES, CATEGORY_LABELS } from '../../constants/resource';

const CATEGORY_OPTIONS = VALID_CATEGORIES.reading!.map(v => ({ value: v, label: CATEGORY_LABELS[v] || v }));
const CATEGORY_LABEL_MAP = CATEGORY_LABELS;

const { Text } = Typography;

const PENDING_UPLOAD_URL = 'pending_upload';

const ReadingPage: React.FC = () => {
  const [materials, setMaterials] = useState<ReadingMaterial[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [listLoading, setListLoading] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);
  const [filterActive, setFilterActive] = useState<boolean | null | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<ReadingMaterial | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const uploadingMaterialIdRef = useRef<string | null>(null);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await getMaterialList({
        level: filterLevel,
        category: filterCategory,
        is_active: filterActive,
        page,
        page_size: pageSize,
      });
      setMaterials(res.items);
      setTotal(res.total);
    } catch {
      message.error('获取阅读材料列表失败');
    } finally {
      setListLoading(false);
    }
  }, [page, pageSize, filterLevel, filterCategory, filterActive]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const uploader = usePdfUploader({
    uploadFn: (file, onProgress) =>
      uploadMaterialPdf(uploadingMaterialIdRef.current!, file, onProgress),
    successMessage: 'PDF 上传成功，页数已自动更新',
    onSuccess: fetchList,
  });

  const handleFormSubmit = async (values: {
    title: string; level: string; category: string; cover_url?: string | null;
    pdf_url: string; page_count?: number; sort_order?: number; is_active?: boolean;
  }) => {
    setFormLoading(true);
    try {
      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, {
          title: values.title, level: values.level, category: values.category,
          cover_url: values.cover_url || null, sort_order: values.sort_order,
          is_active: values.is_active,
        });
        message.success('阅读材料已更新');
        setFormOpen(false); setEditingMaterial(null); fetchList();
      } else {
        const result = await createMaterial({
          title: values.title, level: values.level, category: values.category,
          cover_url: values.cover_url || null,
          pdf_url: values.pdf_url || PENDING_UPLOAD_URL,
          page_count: values.page_count ?? 0, sort_order: values.sort_order ?? 0,
          is_active: values.is_active ?? true,
        });
        message.success('阅读材料创建成功，请上传 PDF 文件');
        setFormOpen(false); fetchList();
        uploadingMaterialIdRef.current = result.id;
        uploader.openUploadModal(result.title);
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { code?: string; message?: string } }>;
      message.error(axiosErr.response?.data?.detail?.message || '操作失败，请重试');
    } finally { setFormLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMaterial(id); message.success('阅读材料已删除'); fetchList(); }
    catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { message?: string } }>;
      message.error(axiosErr.response?.data?.detail?.message || '删除失败');
    }
  };

  const handleToggleActive = async (record: ReadingMaterial, checked: boolean) => {
    try { await updateMaterial(record.id, { is_active: checked }); message.success(checked ? '已上架' : '已下架'); fetchList(); }
    catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { message?: string } }>;
      message.error(axiosErr.response?.data?.detail?.message || '状态切换失败');
    }
  };

  const columns: ColumnsType<ReadingMaterial> = [
    { title: '标题', dataIndex: 'title', key: 'title', width: 200, ellipsis: true },
    { title: '级别', dataIndex: 'level', key: 'level', width: 70, render: (level: string | null) => level ? <Tag color="blue">{level}</Tag> : <Text type="secondary">—</Text> },
    { title: '分类', dataIndex: 'category', key: 'category', width: 80, render: (category: string | null) => category ? (CATEGORY_LABEL_MAP[category] ?? category) : <Text type="secondary">—</Text> },
    { title: '页数', dataIndex: 'page_count', key: 'page_count', width: 70, render: (count: number) => (count > 0 ? count : <Text type="secondary">—</Text>) },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 70 },
    { title: '上架', dataIndex: 'is_active', key: 'is_active', width: 80, render: (isActive: boolean) => isActive ? <Tag color="green">上架</Tag> : <Tag color="default">下架</Tag> },
    {
      title: 'PDF', dataIndex: 'pdf_url', key: 'pdf_url', width: 100, ellipsis: true,
      render: (url: string | null) => {
        if (!url || url === PENDING_UPLOAD_URL) return <Tag color="warning">未上传</Tag>;
        return <Tooltip title={url}><Tag color="success" icon={<FilePdfOutlined />}>已上传</Tag></Tooltip>;
      },
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 170, render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 170, render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    {
      title: '操作', key: 'action', width: 260,
      render: (_: unknown, record: ReadingMaterial) => (
        <Space size="small" wrap>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingMaterial(record); setFormOpen(true); }}>编辑</Button>
          <Button type="link" size="small" icon={<UploadOutlined />} onClick={() => { uploadingMaterialIdRef.current = record.id; uploader.openUploadModal(record.title); }}>上传PDF</Button>
          {record.is_active ? (
            <Popconfirm title="确定下架该阅读材料吗？" description="下架后 App 端将不再展示此材料" onConfirm={() => handleToggleActive(record, false)} okText="确定下架" cancelText="取消">
              <Switch size="small" checked={record.is_active} checkedChildren="上架" unCheckedChildren="下架" />
            </Popconfirm>
          ) : (
            <Switch size="small" checked={record.is_active} onChange={() => handleToggleActive(record, true)} checkedChildren="上架" unCheckedChildren="下架" />
          )}
          <Popconfirm title="确定删除该阅读材料吗？" description="删除后不可恢复" onConfirm={() => handleDelete(record.id)} okText="确定删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>阅读馆管理</Typography.Title>
        <Space>
          <Select placeholder="级别筛选" allowClear style={{ width: 100 }} value={filterLevel} onChange={val => { setFilterLevel(val); setPage(1); }} options={[...LEVEL_OPTIONS]} />
          <Select placeholder="分类筛选" allowClear style={{ width: 100 }} value={filterCategory} onChange={val => { setFilterCategory(val); setPage(1); }} options={CATEGORY_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))} />
          <Select placeholder="上架状态" allowClear style={{ width: 100 }} value={filterActive} onChange={val => { setFilterActive(val); setPage(1); }} options={[{ value: true, label: '上架' }, { value: false, label: '下架' }]} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingMaterial(null); setFormOpen(true); }}>新建材料</Button>
        </Space>
      </div>
      <Table<ReadingMaterial> rowKey="id" columns={columns} dataSource={materials} loading={listLoading}
        pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: t => `共 ${t} 条`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
        scroll={{ x: 1100 }} />
      <ReadingForm open={formOpen} material={editingMaterial} loading={formLoading} onSubmit={handleFormSubmit} onCancel={() => { setFormOpen(false); setEditingMaterial(null); }} />
      <PdfUploadModal uploader={uploader} />
    </Card>
  );
};

export default ReadingPage;