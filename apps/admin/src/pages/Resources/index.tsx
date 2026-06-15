/**
 * ResourcesPage — A-RESOURCE (ADMIN-06).
 *
 * Features:
 * - Paginated resource list (Ant Design Table)
 * - Category / Active status filters
 * - Create resource → Modal form → pdf_url auto-filled as pending_upload
 * - Edit resource → Modal form (pre-filled)
 * - Delete resource → Popconfirm → hard delete
 * - Upload/Replace PDF → via shared usePdfUploader hook + PdfUploadModal
 * - Toggle is_active (上架/下架) via switch in action column
 *
 * Auth: relies on ADMIN-01 AuthGuard + Axios interceptor.
 * API: consumes API-09 endpoints via services/resource.ts.
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Button,
  Table,
  Tag,
  Space,
  Popconfirm,
  message,
  Typography,
  Card,
  Select,
  Switch,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import ResourceForm from '../../components/ResourceForm';
import {
  getResourceList,
  createResource,
  updateResource,
  deleteResource,
  uploadResourcePdf,
  RESOURCE_CATEGORY_OPTIONS,
  RESOURCE_CATEGORY_LABEL_MAP,
  PENDING_UPLOAD_URL,
} from '../../services/resource';
import type { Resource } from '../../services/resource';
import { usePdfUploader, PdfUploadModal } from '../../hooks/usePdfUploader';

const ResourcesPage: React.FC = () => {
  // ── List state ──────────────────────────────────
  const [resources, setResources] = useState<Resource[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [listLoading, setListLoading] = useState(false);

  // ── Filter state ────────────────────────────────
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);
  const [filterActive, setFilterActive] = useState<boolean | null | undefined>(undefined);

  // ── Form modal state ────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // ── Upload ref (resource id set before upload starts) ──
  const uploadingResourceIdRef = useRef<string | null>(null);

  // ── Fetch list ──────────────────────────────────
  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await getResourceList({
        category: filterCategory,
        is_active: filterActive,
        page,
        page_size: pageSize,
      });
      setResources(res.items);
      setTotal(res.total);
    } catch {
      message.error('获取资源列表失败');
    } finally {
      setListLoading(false);
    }
  }, [page, pageSize, filterCategory, filterActive]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // ── Shared PDF uploader ─────────────────────────
  const uploader = usePdfUploader({
    uploadFn: (file, onProgress) =>
      uploadResourcePdf(uploadingResourceIdRef.current!, file, onProgress),
    successMessage: 'PDF 上传成功',
    onSuccess: fetchList,
  });

  // ── Create / Edit submit ────────────────────────
  const handleFormSubmit = async (values: {
    title: string;
    category: string;
    pdf_url: string;
    sort_order?: number;
    is_active?: boolean;
  }) => {
    setFormLoading(true);
    try {
      if (editingResource) {
        await updateResource(editingResource.id, {
          title: values.title,
          category: values.category,
          sort_order: values.sort_order,
          is_active: values.is_active,
        });
        message.success('资源已更新');
        setFormOpen(false);
        setEditingResource(null);
        fetchList();
      } else {
        const result = await createResource({
          title: values.title,
          category: values.category,
          pdf_url: values.pdf_url || PENDING_UPLOAD_URL,
          sort_order: values.sort_order ?? 0,
          is_active: values.is_active ?? true,
        });
        message.success('资源创建成功，请上传 PDF 文件');
        setFormOpen(false);
        fetchList();
        // Auto-open upload modal for the newly created resource
        uploadingResourceIdRef.current = result.id;
        uploader.openUploadModal(result.title);
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { code?: string; message?: string } }>;
      const detail = axiosErr.response?.data?.detail;
      message.error(detail?.message || '操作失败，请重试');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setEditingResource(null);
  };

  // ── Delete ──────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await deleteResource(id);
      message.success('资源已删除');
      fetchList();
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { message?: string } }>;
      message.error(axiosErr.response?.data?.detail?.message || '删除失败');
    }
  };

  // ── Toggle is_active ────────────────────────────
  const handleToggleActive = async (record: Resource, checked: boolean) => {
    try {
      await updateResource(record.id, { is_active: checked });
      message.success(checked ? '已上架' : '已下架');
      fetchList();
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { message?: string } }>;
      message.error(axiosErr.response?.data?.detail?.message || '状态切换失败');
    }
  };

  // ── Table columns ───────────────────────────────
  const columns: ColumnsType<Resource> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => (
        <Tag color="purple">{RESOURCE_CATEGORY_LABEL_MAP[category] ?? category}</Tag>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 70,
    },
    {
      title: '上架',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) =>
        isActive ? <Tag color="green">上架</Tag> : <Tag color="default">下架</Tag>,
    },
    {
      title: 'PDF',
      dataIndex: 'pdf_url',
      key: 'pdf_url',
      width: 100,
      ellipsis: true,
      render: (url: string | null) => {
        if (!url || url === PENDING_UPLOAD_URL) {
          return <Tag color="warning">未上传</Tag>;
        }
        return (
          <Tooltip title={url}>
            <Tag color="success" icon={<FilePdfOutlined />}>已上传</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      render: (_: unknown, record: Resource) => (
        <Space size="small" wrap>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingResource(record);
              setFormOpen(true);
            }}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<UploadOutlined />}
            onClick={() => {
              uploadingResourceIdRef.current = record.id;
              uploader.openUploadModal(record.title);
            }}
          >
            上传PDF
          </Button>
          {record.is_active ? (
            <Popconfirm
              title="确定下架该资源吗？"
              description="下架后 App 端将不再展示此资源"
              onConfirm={() => handleToggleActive(record, false)}
              okText="确定下架"
              cancelText="取消"
            >
              <Switch
                size="small"
                checked={record.is_active}
                checkedChildren="上架"
                unCheckedChildren="下架"
              />
            </Popconfirm>
          ) : (
            <Switch
              size="small"
              checked={record.is_active}
              onChange={() => handleToggleActive(record, true)}
              checkedChildren="上架"
              unCheckedChildren="下架"
            />
          )}
          <Popconfirm
            title="确定删除该资源吗？"
            description="删除后不可恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          资源库管理
        </Typography.Title>
        <Space>
          <Select
            placeholder="分类筛选"
            allowClear
            style={{ width: 120 }}
            value={filterCategory}
            onChange={(val) => {
              setFilterCategory(val);
              setPage(1);
            }}
            options={RESOURCE_CATEGORY_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
          />
          <Select
            placeholder="上架状态"
            allowClear
            style={{ width: 100 }}
            value={filterActive}
            onChange={(val) => {
              setFilterActive(val);
              setPage(1);
            }}
            options={[
              { value: true, label: '上架' },
              { value: false, label: '下架' },
            ]}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingResource(null);
              setFormOpen(true);
            }}
          >
            新建资源
          </Button>
        </Space>
      </div>

      <Table<Resource>
        rowKey="id"
        columns={columns}
        dataSource={resources}
        loading={listLoading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        scroll={{ x: 1100 }}
      />

      <ResourceForm
        open={formOpen}
        resource={editingResource}
        loading={formLoading}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
      />

      <PdfUploadModal uploader={uploader} />
    </Card>
  );
};

export default ResourcesPage;