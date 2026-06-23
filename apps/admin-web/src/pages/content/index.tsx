/**
 * 内容管理 — Reading Materials + Resources 双分区
 *
 * P2 升级:
 * - PDF 上传（POST /reading/materials/{id}/upload）
 * - 封面上传（POST /reading/materials/{id}/cover）
 * - 详情 Drawer: 封面预览 + PDF 下载/链接 + 分类标签 + 元数据面板
 * - 分类筛选用 categories API
 * - 分类下拉从 API 加载
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Tag, Card, Space, Typography, Drawer, Modal,
  Form, Input, InputNumber, Select, Switch, Upload, message,
  Tabs, Tooltip, Popconfirm, Badge, Empty, Image, Divider,
} from 'antd';
import {
  BookOutlined, FilePdfOutlined, PlusOutlined, EditOutlined,
  UploadOutlined, DeleteOutlined, EyeOutlined, PictureOutlined,
  CheckCircleOutlined, StopOutlined, SearchOutlined,
  CloudUploadOutlined, DownloadOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';

const { Text, Title, Paragraph } = Typography;

// ── 类型定义 ──
interface ReadingMaterial {
  id: string;
  title: string;
  level: string;
  category: string;
  cover_url: string | null;
  pdf_url: string | null;
  page_count: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

interface Resource {
  id: string;
  title: string;
  category: string;
  pdf_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

interface CategoryOption { value: string; label: string; }

// ── 常量 ──
const LEVEL_OPTIONS = [
  { value: 'L1', label: 'L1 — 入门' },
  { value: 'L2', label: 'L2 — 基础' },
  { value: 'L3', label: 'L3 — 进阶' },
  { value: 'L4', label: 'L4 — 中级' },
  { value: 'L5', label: 'L5 — 高级' },
  { value: 'L6', label: 'L6 — 精通' },
];

const RESOURCE_CATEGORIES: CategoryOption[] = [
  { value: 'phonics', label: '自然拼读' },
  { value: 'word_card', label: '词卡' },
  { value: 'recommended', label: '推荐' },
  { value: 'grammar', label: '语法' },
];

const LEVEL_COLORS: Record<string, string> = {
  L1: '#52c41a', L2: '#5CAADF', L3: '#F4A230',
  L4: '#722ed1', L5: '#eb2f96', L6: '#f5222d',
};

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState('materials');
  // ── Reading Materials ──
  const [materials, setMaterials] = useState<ReadingMaterial[]>([]);
  const [mLoading, setMLoading] = useState(false);
  const [mFilterLevel, setMFilterLevel] = useState<string | undefined>();
  const [mFilterCategory, setMFilterCategory] = useState<string | undefined>();
  const [mFilterActive, setMFilterActive] = useState<boolean | undefined>();
  const [mEditOpen, setMEditOpen] = useState(false);
  const [mEditTarget, setMEditTarget] = useState<ReadingMaterial | null>(null);
  const [mcreateForm] = Form.useForm();
  const [mDrawerOpen, setMDrawerOpen] = useState(false);
  const [mDrawerTarget, setMDrawerTarget] = useState<ReadingMaterial | null>(null);
  // 分类从后端 API 加载
  const [readingCategories, setReadingCategories] = useState<CategoryOption[]>([]);

  // ── Resources ──
  const [resources, setResources] = useState<Resource[]>([]);
  const [rLoading, setRLoading] = useState(false);
  const [rFilterCat, setRFilterCat] = useState<string | undefined>();
  const [rFilterActive, setRFilterActive] = useState<boolean | undefined>();
  const [rEditOpen, setREditOpen] = useState(false);
  const [rEditTarget, setREditTarget] = useState<Resource | null>(null);
  const [rForm] = Form.useForm();
  const [rDrawerOpen, setRDrawerOpen] = useState(false);
  const [rDrawerTarget, setRDrawerTarget] = useState<Resource | null>(null);

  // ── 上传状态 ──
  const [mUploading, setMUploading] = useState<string | null>(null);

  // ── 加载分类 API ──
  const loadCategories = async () => {
    try {
      const { data } = await client.get('/reading/categories');
      setReadingCategories(data || []);
    } catch {
      setReadingCategories([
        { value: 'picture_book', label: '绘本' },
        { value: 'story', label: '故事' },
        { value: 'short_text', label: '短文' },
        { value: 'read_aloud', label: '跟读' },
      ]);
    }
  };

  // ── 加载 Materials ──
  const loadMaterials = async () => {
    setMLoading(true);
    try {
      const params: any = { page: 1, page_size: 100 };
      if (mFilterLevel) params.level = mFilterLevel;
      if (mFilterCategory) params.category = mFilterCategory;
      if (mFilterActive !== undefined) params.is_active = mFilterActive;
      const { data } = await client.get('/reading/materials', { params });
      setMaterials(data.items || []);
    } catch (err) { message.error(extractError(err)); }
    finally { setMLoading(false); }
  };

  // ── 加载 Resources ──
  const loadResources = async () => {
    setRLoading(true);
    try {
      const params: any = { page: 1, page_size: 100 };
      if (rFilterCat) params.category = rFilterCat;
      if (rFilterActive !== undefined) params.is_active = rFilterActive;
      const { data } = await client.get('/resources', { params });
      setResources(data.items || []);
    } catch (err) { message.error(extractError(err)); }
    finally { setRLoading(false); }
  };

  useEffect(() => { loadCategories(); loadMaterials(); loadResources(); }, []);
  useEffect(() => { loadMaterials(); }, [mFilterLevel, mFilterCategory, mFilterActive]);
  useEffect(() => { loadResources(); }, [rFilterCat, rFilterActive]);

  // ── 分类名称查找 ──
  const catLabel = (val: string) => {
    const c = readingCategories.find(c => c.value === val);
    return c?.label || val;
  };

  // ── Material CRUD ──
  const openMCreate = () => {
    setMEditTarget(null);
    mcreateForm.resetFields();
    setMEditOpen(true);
  };

  const openMEdit = (r: ReadingMaterial) => {
    setMEditTarget(r);
    mcreateForm.setFieldsValue({
      title: r.title, level: r.level, category: r.category,
      sort_order: r.sort_order, is_active: r.is_active,
    });
    setMEditOpen(true);
  };

  const saveMaterial = async () => {
    try {
      const values = await mcreateForm.validateFields();
      if (mEditTarget) {
        await client.put(`/reading/materials/${mEditTarget.id}`, values);
        message.success('阅读材料已更新');
      } else {
        await client.post('/reading/materials', values);
        message.success('阅读材料已创建');
      }
      setMEditOpen(false);
      loadMaterials();
    } catch (err) { if (err instanceof Error) message.error(extractError(err)); }
  };

  const toggleMaterialActive = async (r: ReadingMaterial) => {
    try {
      await client.put(`/reading/materials/${r.id}`, { is_active: !r.is_active });
      message.success(r.is_active ? '已停用' : '已启用');
      loadMaterials();
    } catch (err) { message.error(extractError(err)); }
  };

  const deleteMaterial = async (id: string) => {
    try {
      await client.delete(`/reading/materials/${id}`);
      message.success('已删除');
      loadMaterials();
      if (mDrawerTarget?.id === id) setMDrawerOpen(false);
    } catch (err) { message.error(extractError(err)); }
  };

  // ── PDF / 封面上传 ──
  const uploadPdf = async (materialId: string, file: File) => {
    setMUploading(materialId);
    try {
      const form = new FormData();
      form.append('file', file);
      await client.post(`/reading/materials/${materialId}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('PDF 已上传');
      loadMaterials();
      if (mDrawerTarget?.id === materialId) {
        const { data } = await client.get(`/reading/materials/${materialId}`);
        setMDrawerTarget(data);
      }
    } catch (err) { message.error(extractError(err)); }
    finally { setMUploading(null); }
  };

  const uploadCover = async (materialId: string, file: File) => {
    setMUploading(materialId);
    try {
      const form = new FormData();
      form.append('file', file);
      await client.post(`/reading/materials/${materialId}/cover`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('封面已上传');
      loadMaterials();
      if (mDrawerTarget?.id === materialId) {
        const { data } = await client.get(`/reading/materials/${materialId}`);
        setMDrawerTarget(data);
      }
    } catch (err) { message.error(extractError(err)); }
    finally { setMUploading(null); }
  };

  // ── Resource CRUD ──
  const openRCreate = () => {
    setREditTarget(null);
    rForm.resetFields();
    setREditOpen(true);
  };

  const openREdit = (r: Resource) => {
    setREditTarget(r);
    rForm.setFieldsValue({
      title: r.title, category: r.category,
      sort_order: r.sort_order, is_active: r.is_active,
    });
    setREditOpen(true);
  };

  const saveResource = async () => {
    try {
      const values = await rForm.validateFields();
      if (rEditTarget) {
        await client.put(`/resources/${rEditTarget.id}`, values);
        message.success('资源已更新');
      } else {
        await client.post('/resources', values);
        message.success('资源已创建');
      }
      setREditOpen(false);
      loadResources();
    } catch (err) { if (err instanceof Error) message.error(extractError(err)); }
  };

  const toggleResourceActive = async (r: Resource) => {
    try {
      await client.put(`/resources/${r.id}`, { is_active: !r.is_active });
      message.success(r.is_active ? '已停用' : '已启用');
      loadResources();
    } catch (err) { message.error(extractError(err)); }
  };

  const deleteResource = async (id: string) => {
    try {
      await client.delete(`/resources/${id}`);
      message.success('已删除');
      loadResources();
      if (rDrawerTarget?.id === id) setRDrawerOpen(false);
    } catch (err) { message.error(extractError(err)); }
  };

  // ── Material 列 ──
  const mColumns = [
    {
      title: '级别', dataIndex: 'level', width: 70,
      render: (v: string) => <Tag color={LEVEL_COLORS[v] || '#999'} style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</Tag>,
      sorter: (a: ReadingMaterial, b: ReadingMaterial) => a.level.localeCompare(b.level),
    },
    {
      title: '标题', dataIndex: 'title', width: 200,
      render: (v: string, r: ReadingMaterial) => (
        <a onClick={() => { setMDrawerTarget(r); setMDrawerOpen(true); }}>{v}</a>
      ),
    },
    {
      title: '分类', dataIndex: 'category', width: 100,
      render: (v: string) => <Tag>{catLabel(v)}</Tag>,
    },
    {
      title: 'PDF', dataIndex: 'pdf_url', width: 100, align: 'center' as const,
      render: (v: string | null, r: ReadingMaterial) =>
        v ? (
          <Tooltip title="下载 PDF">
            <a href={v} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>
              <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
            </a>
          </Tooltip>
        ) : (
          <Upload
            showUploadList={false}
            accept=".pdf"
            beforeUpload={file => { uploadPdf(r.id, file); return false; }}
          >
            <Tooltip title="上传 PDF">
              <Button type="text" size="small" icon={<CloudUploadOutlined />}
                loading={mUploading === r.id}
                style={{ color: '#bbb' }}
              />
            </Tooltip>
          </Upload>
        ),
    },
    {
      title: '封面', dataIndex: 'cover_url', width: 80, align: 'center' as const,
      render: (v: string | null, r: ReadingMaterial) =>
        v ? (
          <Image src={v} width={32} height={42}
            style={{ objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
            preview={false}
            onClick={e => { e.stopPropagation(); setMDrawerTarget(r); setMDrawerOpen(true); }}
          />
        ) : (
          <Upload
            showUploadList={false}
            accept=".webp,.jpg,.jpeg,.png"
            beforeUpload={file => { uploadCover(r.id, file); return false; }}
          >
            <Tooltip title="上传封面">
              <Button type="text" size="small" icon={<PictureOutlined />}
                loading={mUploading === r.id}
                style={{ color: '#bbb' }}
              />
            </Tooltip>
          </Upload>
        ),
    },
    {
      title: '页数', dataIndex: 'page_count', width: 60, align: 'center' as const,
      render: (v: number) => v ? <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</span> : '—',
    },
    {
      title: '排序', dataIndex: 'sort_order', width: 60, align: 'center' as const,
      render: (v: number) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</span>,
    },
    {
      title: '状态', dataIndex: 'is_active', width: 80, align: 'center' as const,
      render: (v: boolean, r: ReadingMaterial) => (
        <Tag color={v ? 'green' : 'default'} style={{ cursor: 'pointer' }} onClick={() => toggleMaterialActive(r)}>
          {v ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作', width: 120, fixed: 'right' as const,
      render: (_: any, r: ReadingMaterial) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openMEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => deleteMaterial(r.id)}>
            <Button danger type="text" size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Resource 列 ──
  const rColumns = [
    {
      title: '标题', dataIndex: 'title', width: 200,
      render: (v: string, r: Resource) => (
        <a onClick={() => { setRDrawerTarget(r); setRDrawerOpen(true); }}>{v}</a>
      ),
    },
    {
      title: '分类', dataIndex: 'category', width: 120,
      render: (v: string) => {
        const cat = RESOURCE_CATEGORIES.find(c => c.value === v);
        return <Tag>{cat?.label || v}</Tag>;
      },
    },
    {
      title: 'PDF', dataIndex: 'pdf_url', width: 80, align: 'center' as const,
      render: (v: string | null) => v ? <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 16 }} /> : <Text type="secondary">—</Text>,
    },
    {
      title: '排序', dataIndex: 'sort_order', width: 60, align: 'center' as const,
      render: (v: number) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</span>,
    },
    {
      title: '状态', dataIndex: 'is_active', width: 80, align: 'center' as const,
      render: (v: boolean, r: Resource) => (
        <Tag color={v ? 'green' : 'default'} style={{ cursor: 'pointer' }} onClick={() => toggleResourceActive(r)}>
          {v ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作', width: 120, fixed: 'right' as const,
      render: (_: any, r: Resource) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openREdit(r)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => deleteResource(r.id)}>
            <Button danger type="text" size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Material 详情 Drawer（升级版） ──
  const renderMDrawer = () => {
    if (!mDrawerTarget) return null;
    const r = mDrawerTarget;
    return (
      <>
        {/* 封面预览 */}
        {r.cover_url ? (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Image src={r.cover_url} style={{ maxHeight: 240, borderRadius: 8, objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{
            textAlign: 'center', marginBottom: 16, padding: '32px 0',
            background: '#fafafa', borderRadius: 8,
          }}>
            <PictureOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />
            <div style={{ marginTop: 8 }}>
              <Upload
                showUploadList={false}
                accept=".webp,.jpg,.jpeg,.png"
                beforeUpload={file => { uploadCover(r.id, file); return false; }}
              >
                <Button size="small" icon={<CloudUploadOutlined />} loading={mUploading === r.id}>
                  上传封面
                </Button>
              </Upload>
            </div>
          </div>
        )}

        <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>{r.title}</Title>
        <Space style={{ marginBottom: 12 }}>
          <Tag color={LEVEL_COLORS[r.level] || '#999'}>{r.level}</Tag>
          <Tag>{catLabel(r.category)}</Tag>
          <Tag color={r.is_active ? 'green' : 'default'}>{r.is_active ? '启用' : '停用'}</Tag>
        </Space>

        {/* PDF 区域 */}
        <Card size="small" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <FilePdfOutlined style={{ fontSize: 20, color: r.pdf_url ? '#ff4d4f' : '#d9d9d9' }} />
              <div>
                <div style={{ fontWeight: 500 }}>{r.pdf_url ? 'PDF 已上传' : '未上传 PDF'}</div>
                {r.page_count > 0 && <Text type="secondary" style={{ fontSize: 12 }}>{r.page_count} 页</Text>}
              </div>
            </Space>
            <Space>
              {r.pdf_url && (
                <Button size="small" icon={<DownloadOutlined />}
                  href={r.pdf_url} target="_blank">下载</Button>
              )}
              <Upload
                showUploadList={false}
                accept=".pdf"
                beforeUpload={file => { uploadPdf(r.id, file); return false; }}
              >
                <Button size="small" icon={<CloudUploadOutlined />}
                  loading={mUploading === r.id}>
                  {r.pdf_url ? '替换' : '上传'}
                </Button>
              </Upload>
            </Space>
          </div>
        </Card>

        {/* 元数据面板 */}
        <div style={{ background: '#fafafa', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <tbody>
              <tr><td style={{ color: '#999', padding: '4px 0', width: 60 }}>排序</td><td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.sort_order}</td></tr>
              <tr><td style={{ color: '#999', padding: '4px 0' }}>创建</td><td>{dayjs(r.created_at).format('YYYY-MM-DD HH:mm')}</td></tr>
              <tr><td style={{ color: '#999', padding: '4px 0' }}>更新</td><td>{dayjs(r.updated_at).format('YYYY-MM-DD HH:mm')}</td></tr>
            </tbody>
          </table>
        </div>

        {r.metadata && Object.keys(r.metadata).length > 0 && (
          <Card title="Metadata" size="small" style={{ marginBottom: 12 }}>
            <pre style={{ fontSize: 12, margin: 0 }}>{JSON.stringify(r.metadata, null, 2)}</pre>
          </Card>
        )}

        <Divider style={{ margin: '8px 0' }} />

        <Space>
          <Button icon={<EditOutlined />} onClick={() => { setMDrawerOpen(false); openMEdit(r); }}>编辑</Button>
          <Button onClick={() => toggleMaterialActive(r)} icon={r.is_active ? <StopOutlined /> : <CheckCircleOutlined />}>
            {r.is_active ? '停用' : '启用'}
          </Button>
          <Popconfirm title="确认删除？" onConfirm={() => deleteMaterial(r.id)}>
            <Button danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      </>
    );
  };

  // ── Resource 详情 Drawer ──
  const renderRDrawer = () => {
    if (!rDrawerTarget) return null;
    const r = rDrawerTarget;
    const cat = RESOURCE_CATEGORIES.find(c => c.value === r.category);
    return (
      <>
        <Title level={4} style={{ marginTop: 0 }}>{r.title}</Title>
        <Space style={{ marginBottom: 16 }}>
          <Tag>{cat?.label || r.category}</Tag>
          <Tag color={r.is_active ? 'green' : 'default'}>{r.is_active ? '启用' : '停用'}</Tag>
        </Space>

        {/* PDF 区域 */}
        <Card size="small" style={{ marginBottom: 12 }}>
          <Space>
            <FilePdfOutlined style={{ fontSize: 20, color: r.pdf_url ? '#ff4d4f' : '#d9d9d9' }} />
            {r.pdf_url ? (
              <a href={r.pdf_url} target="_blank" rel="noopener">
                <Button size="small" icon={<DownloadOutlined />}>下载 PDF</Button>
              </a>
            ) : (
              <Text type="secondary">未上传 PDF</Text>
            )}
          </Space>
        </Card>

        <div style={{ background: '#fafafa', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <tbody>
              <tr><td style={{ color: '#999', padding: '4px 0' }}>排序</td><td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.sort_order}</td></tr>
              <tr><td style={{ color: '#999', padding: '4px 0' }}>创建</td><td>{dayjs(r.created_at).format('YYYY-MM-DD HH:mm')}</td></tr>
              <tr><td style={{ color: '#999', padding: '4px 0' }}>更新</td><td>{dayjs(r.updated_at).format('YYYY-MM-DD HH:mm')}</td></tr>
            </tbody>
          </table>
        </div>

        {r.metadata && Object.keys(r.metadata).length > 0 && (
          <Card title="Metadata" size="small" style={{ marginBottom: 16 }}>
            <pre style={{ fontSize: 12, margin: 0 }}>{JSON.stringify(r.metadata, null, 2)}</pre>
          </Card>
        )}

        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
          <Space>
            <Button icon={<EditOutlined />} onClick={() => { setRDrawerOpen(false); openREdit(r); }}>编辑</Button>
            <Button onClick={() => toggleResourceActive(r)} icon={r.is_active ? <StopOutlined /> : <CheckCircleOutlined />}>
              {r.is_active ? '停用' : '启用'}
            </Button>
            <Popconfirm title="确认删除？" onConfirm={() => deleteResource(r.id)}>
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        </div>
      </>
    );
  };

  // ── 渲染 ──
  return (
    <div style={{ padding: 16 }}>
      <Card className="sb-card"
        title={<span><BookOutlined style={{ marginRight: 6 }} />内容管理</span>}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'materials',
            label: <span><BookOutlined /> 阅读材料</span>,
            children: (
              <div>
                {/* 筛选栏 — 增加分类筛选 */}
                <div style={{
                  display: 'flex', gap: 12, marginBottom: 12,
                  position: 'sticky', top: 0, zIndex: 10,
                  background: '#fff', padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <Select placeholder="级别" allowClear style={{ width: 140 }}
                    value={mFilterLevel} onChange={setMFilterLevel}
                    options={LEVEL_OPTIONS}
                  />
                  <Select placeholder="分类" allowClear style={{ width: 120 }}
                    value={mFilterCategory} onChange={setMFilterCategory}
                    options={readingCategories}
                  />
                  <Select placeholder="状态" allowClear style={{ width: 100 }}
                    value={mFilterActive} onChange={setMFilterActive}
                    options={[{ value: true, label: '启用' }, { value: false, label: '停用' }]}
                  />
                  <div style={{ flex: 1 }} />
                  <Button type="primary" icon={<PlusOutlined />} onClick={openMCreate}>
                    新建阅读材料
                  </Button>
                </div>

                <Table
                  dataSource={materials}
                  columns={mColumns}
                  rowKey="id"
                  loading={mLoading}
                  size="small"
                  pagination={false}
                  scroll={{ x: 900, y: 'calc(100vh - 300px)' }}
                  locale={{ emptyText: <Empty description="暂无阅读材料" /> }}
                />
              </div>
            ),
          },
          {
            key: 'resources',
            label: <span><FilePdfOutlined /> 学习资源</span>,
            children: (
              <div>
                <div style={{
                  display: 'flex', gap: 12, marginBottom: 12,
                  position: 'sticky', top: 0, zIndex: 10,
                  background: '#fff', padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <Select placeholder="分类" allowClear style={{ width: 140 }}
                    value={rFilterCat} onChange={setRFilterCat}
                    options={RESOURCE_CATEGORIES}
                  />
                  <Select placeholder="状态" allowClear style={{ width: 100 }}
                    value={rFilterActive} onChange={setRFilterActive}
                    options={[{ value: true, label: '启用' }, { value: false, label: '停用' }]}
                  />
                  <div style={{ flex: 1 }} />
                  <Button type="primary" icon={<PlusOutlined />} onClick={openRCreate}>
                    新建资源
                  </Button>
                </div>

                <Table
                  dataSource={resources}
                  columns={rColumns}
                  rowKey="id"
                  loading={rLoading}
                  size="small"
                  pagination={false}
                  scroll={{ x: 660, y: 'calc(100vh - 300px)' }}
                  locale={{ emptyText: <Empty description="暂无学习资源" /> }}
                />
              </div>
            ),
          },
        ]} />
      </Card>

      {/* ── Material 编辑/新建弹窗 ── */}
      <Modal
        title={mEditTarget ? '编辑阅读材料' : '新建阅读材料'}
        open={mEditOpen}
        onOk={saveMaterial}
        onCancel={() => setMEditOpen(false)}
        destroyOnClose width={520}
      >
        <Form form={mcreateForm} layout="vertical" preserve={false}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="阅读材料标题" />
          </Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="level" label="级别" rules={[{ required: true, message: '请选择' }]}>
              <Select style={{ width: 200 }} options={LEVEL_OPTIONS} placeholder="选择级别" />
            </Form.Item>
            <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择' }]}>
              <Select style={{ width: 200 }} options={readingCategories} placeholder="选择分类" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="sort_order" label="排序" initialValue={0}>
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="is_active" label="启用" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* ── Resource 编辑/新建弹窗 ── */}
      <Modal
        title={rEditTarget ? '编辑学习资源' : '新建学习资源'}
        open={rEditOpen}
        onOk={saveResource}
        onCancel={() => setREditOpen(false)}
        destroyOnClose width={480}
      >
        <Form form={rForm} layout="vertical" preserve={false}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="资源标题" />
          </Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择' }]}>
              <Select style={{ width: 200 }} options={RESOURCE_CATEGORIES} placeholder="选择分类" />
            </Form.Item>
            <Form.Item name="sort_order" label="排序" initialValue={0}>
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item name="is_active" label="启用" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Material 详情 Drawer ── */}
      <Drawer
        title="阅读材料详情"
        open={mDrawerOpen}
        onClose={() => { setMDrawerOpen(false); loadMaterials(); }}
        width={440} destroyOnClose
      >
        {renderMDrawer()}
      </Drawer>

      {/* ── Resource 详情 Drawer ── */}
      <Drawer
        title="学习资源详情"
        open={rDrawerOpen}
        onClose={() => { setRDrawerOpen(false); loadResources(); }}
        width={440} destroyOnClose
      >
        {renderRDrawer()}
      </Drawer>
    </div>
  );
}