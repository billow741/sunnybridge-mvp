/**
 * 资源编辑/新建 Drawer
 *
 * 8点修订约束:
 * - module 是前端选择, 决定调 reading 还是 resource API
 * - category 用 Select 受限选项, 不允许自由输入
 * - 草稿态: 创建时只有 title 必填, pdf_url 可空
 * - 上传成功后回填 pdf_url / cover_url
 * - Upload 用 antd customRequest + onChange + progress
 * - resources 封面存 metadata.cover_url
 * - 一二级展示分类联动 (从 DISPLAY_L1/L2 常量)
 */

import { useState, useEffect } from 'react';
import {
  Drawer, Form, Input, Select, Switch, InputNumber,
  Button, Space, message, Upload, Progress, Divider,
  Typography, Image, Tag,
} from 'antd';
import { InboxOutlined, PictureOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import {
  MODULE_LABELS, VALID_CATEGORIES, CATEGORY_LABELS,
  LEVEL_OPTIONS, DISPLAY_L1, DISPLAY_L2, TAG_POOL,
  CATEGORY_DEFAULT_MAP,
} from '../../constants/resource';
import type { ModuleType, ResourceMetadata } from '../../constants/resource';
import type { ResourceItem } from '../../library/adapter';
import {
  createMaterial, updateMaterial, uploadMaterialPdf, uploadMaterialCover,
} from '../../services/reading';
import {
  createResource, updateResource, uploadResourcePdf, uploadResourceCover,
} from '../../services/resource';
import type { MaterialCreateParams, MaterialUpdateParams } from '../../services/reading';
import type { ResourceCreateParams, ResourceUpdateParams } from '../../services/resource';

const { TextArea } = Input;
const { Text } = Typography;

export type DrawerMode = 'create' | 'edit';

interface Props {
  visible: boolean;
  mode: DrawerMode;
  item: ResourceItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResourceDrawer({ visible, mode, item, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [moduleType, setModuleType] = useState<ModuleType>('reading');
  const [pdfProgress, setPdfProgress] = useState<number | null>(null);
  const [coverProgress, setCoverProgress] = useState<number | null>(null);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);

  // 展示分类联动
  const [displayL1, setDisplayL1] = useState('');
  const displayL2Options = displayL1 ? (DISPLAY_L2[displayL1] || []) : [];

  // 编辑模式初始化
  useEffect(() => {
    if (!visible) return;
    form.resetFields();
    setPdfProgress(null);
    setCoverProgress(null);

    if (mode === 'edit' && item) {
      setModuleType(item.source);
      setCurrentPdfUrl(item.fileUrl || null);
      setCurrentCoverUrl(item.coverUrl || null);
      setDisplayL1(item.displayCategoryL1 || '');

      form.setFieldsValue({
        module: item.source,
        title: item.title,
        subtitle: item.subtitle || '',
        description: item.summary || '',
        level: item.level || undefined,
        category: item.category,
        sort_order: item.sortOrder,
        is_active: item.isActive,
        display_category_l1: item.displayCategoryL1 || undefined,
        display_category_l2: item.displayCategoryL2 || undefined,
        tags: item.tags || [],
      });
    } else {
      setModuleType('reading');
      setCurrentPdfUrl(null);
      setCurrentCoverUrl(null);
      setDisplayL1('');
      form.setFieldsValue({ module: 'reading', is_active: false, sort_order: 0 });
    }
  }, [visible, mode, item, form]);

  // 模块切换时更新 category 选项
  const categoryOptions = VALID_CATEGORIES[moduleType]!.map(v => ({
    value: v,
    label: CATEGORY_LABELS[v] || v,
  }));

  // 一级展示分类变更 → 自动设置默认原始 category
  const handleDisplayL1Change = (val: string) => {
    setDisplayL1(val);
    const defaultCat = CATEGORY_DEFAULT_MAP[val];
    if (defaultCat) {
      form.setFieldsValue({ category: defaultCat });
    }
    // 重置二级
    form.setFieldsValue({ display_category_l2: undefined });
  };

  // ── 保存 ──────────────────────────────────────
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const metadata: ResourceMetadata = {};
      if (values.subtitle) metadata.subtitle = values.subtitle;
      if (values.description) metadata.description = values.description;
      if (values.display_category_l1) metadata.display_category_l1 = values.display_category_l1;
      if (values.display_category_l2) metadata.display_category_l2 = values.display_category_l2;
      if (values.tags?.length) metadata.tags = values.tags;

      // resource 的封面从 metadata 读取
      if (moduleType === 'resource' && currentCoverUrl) {
        metadata.cover_url = currentCoverUrl;
      }

      if (moduleType === 'reading') {
        if (mode === 'create') {
          const params: MaterialCreateParams = {
            title: values.title,
            level: values.level || null,
            category: values.category || null,
            cover_url: currentCoverUrl,
            pdf_url: currentPdfUrl,
            sort_order: values.sort_order ?? 0,
            is_active: values.is_active ?? false,
            metadata: Object.keys(metadata).length ? metadata : undefined,
          };
          await createMaterial(params);
        } else {
          const params: MaterialUpdateParams = {
            title: values.title,
            level: values.level || null,
            category: values.category || null,
            cover_url: currentCoverUrl,
            pdf_url: currentPdfUrl,
            sort_order: values.sort_order,
            is_active: values.is_active,
            metadata: Object.keys(metadata).length ? metadata : undefined,
          };
          await updateMaterial(item!.id, params);
        }
      } else {
        if (mode === 'create') {
          const params: ResourceCreateParams = {
            title: values.title,
            category: values.category || null,
            pdf_url: currentPdfUrl,
            sort_order: values.sort_order ?? 0,
            is_active: values.is_active ?? false,
            metadata: Object.keys(metadata).length ? metadata : undefined,
          };
          await createResource(params);
        } else {
          const params: ResourceUpdateParams = {
            title: values.title,
            category: values.category || null,
            pdf_url: currentPdfUrl,
            sort_order: values.sort_order,
            is_active: values.is_active,
            metadata: Object.keys(metadata).length ? metadata : undefined,
          };
          await updateResource(item!.id, params);
        }
      }

      message.success(mode === 'create' ? '创建成功' : '保存成功');
      onSuccess();
    } catch (e: any) {
      if (e?.errorFields) return; // 表单验证失败
      console.error('Save failed', e);
      message.error(e?.response?.data?.detail || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ── PDF 上传 customRequest ────────────────────
  const pdfUploadProps: UploadProps = {
    multiple: false,
    maxCount: 1,
    accept: '.pdf',
    showUploadList: false,
    customRequest: async (options) => {
      const { file, onSuccess: onUploadSuccess, onError } = options;
      const fileId = item?.id;
      if (!fileId) {
        onError?.(new Error('请先保存资源后再上传 PDF'));
        return;
      }
      try {
        setPdfProgress(0);
        let result;
        if (moduleType === 'reading') {
          result = await uploadMaterialPdf(fileId, file as File, pct => setPdfProgress(pct));
        } else {
          result = await uploadResourcePdf(fileId, file as File, pct => setPdfProgress(pct));
        }
        setCurrentPdfUrl(result.pdf_url || result.signed_pdf_url || 'uploaded');
        onUploadSuccess?.(result);
        message.success('PDF 上传成功');
      } catch (err: any) {
        onError?.(err);
        message.error('PDF 上传失败: ' + (err?.message || '未知错误'));
      } finally {
        setPdfProgress(null);
      }
    },
  };

  // ── 封面上传 customRequest ────────────────────
  const coverUploadProps: UploadProps = {
    multiple: false,
    maxCount: 1,
    accept: 'image/*',
    showUploadList: false,
    customRequest: async (options) => {
      const { file, onSuccess: onUploadSuccess, onError } = options;
      const fileId = item?.id;
      if (!fileId) {
        onError?.(new Error('请先保存资源后再上传封面'));
        return;
      }
      try {
        setCoverProgress(0);
        let result;
        if (moduleType === 'reading') {
          result = await uploadMaterialCover(fileId, file as File, pct => setCoverProgress(pct));
          setCurrentCoverUrl(result.cover_url || null);
        } else {
          result = await uploadResourceCover(fileId, file as File, pct => setCoverProgress(pct));
          // resource 封面在 metadata.cover_url
          const coverUrl = result.metadata?.cover_url || result.signed_pdf_url || null;
          setCurrentCoverUrl(coverUrl);
        }
        onUploadSuccess?.(result);
        message.success('封面上传成功');
      } catch (err: any) {
        onError?.(err);
        message.error('封面上传失败: ' + (err?.message || '未知错误'));
      } finally {
        setCoverProgress(null);
      }
    },
  };

  return (
    <Drawer
      title={mode === 'create' ? '新建资源' : '编辑资源'}
      width={560}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            {mode === 'create' ? '创建草稿' : '保存'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" autoComplete="off">
        {/* 模块选择 — 决定调哪个 API */}
        <Form.Item name="module" label="资源模块" rules={[{ required: true }]}>
          <Select
            disabled={mode === 'edit'}
            onChange={v => { setModuleType(v); form.setFieldsValue({ category: undefined, level: undefined }); }}
            options={Object.entries(MODULE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          />
        </Form.Item>

        {/* 标题 — 唯一必填 */}
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
          <Input placeholder="资源标题" maxLength={200} />
        </Form.Item>

        {/* 副标题 (metadata) */}
        <Form.Item name="subtitle" label="副标题">
          <Input placeholder="可选" maxLength={200} />
        </Form.Item>

        {/* 简介 (metadata) */}
        <Form.Item name="description" label="简介">
          <TextArea rows={2} placeholder="可选" maxLength={500} />
        </Form.Item>

        <Divider orientation="left" plain>分类设置</Divider>

        {/* 一级展示分类 (metadata) */}
        <Form.Item name="display_category_l1" label="一级展示分类">
          <Select
            allowClear
            placeholder="选择展示一级分类"
            onChange={handleDisplayL1Change}
            options={[
              ...DISPLAY_L1.reading!.map(v => ({ value: v, label: v })),
              ...DISPLAY_L1.resource!.map(v => ({ value: v, label: v })),
            ]}
          />
        </Form.Item>

        {/* 二级展示分类联动 (metadata) */}
        <Form.Item name="display_category_l2" label="二级展示分类">
          <Select
            allowClear
            placeholder={displayL1 ? '选择展示二级分类' : '请先选一级分类'}
            disabled={!displayL1}
            options={displayL2Options.map(v => ({ value: v, label: v }))}
          />
        </Form.Item>

        {/* 原始 category (Select 受限) */}
        <Form.Item name="category" label="原始分类" rules={[{ required: false }]}>
          <Select allowClear placeholder="选择分类" options={categoryOptions} />
        </Form.Item>

        {/* Level (仅阅读材料) */}
        {moduleType === 'reading' && (
          <Form.Item name="level" label="级别">
            <Select allowClear placeholder="选择级别" options={LEVEL_OPTIONS} />
          </Form.Item>
        )}

        {/* 标签 (metadata) */}
        <Form.Item name="tags" label="标签">
          <Select
            mode="multiple"
            allowClear
            placeholder="选择标签"
            options={TAG_POOL.map(v => ({ value: v, label: v }))}
          />
        </Form.Item>

        <Divider orientation="left" plain>文件上传</Divider>

        {/* 封面预览 */}
        <div style={{ marginBottom: 12, textAlign: 'center' }}>
          {currentCoverUrl ? (
            <Image src={currentCoverUrl} width={120} height={160} style={{ objectFit: 'cover', borderRadius: 8 }}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRUEFTkSuQmCC" />
          ) : (
            <div style={{
              width: 120, height: 160, border: '1px dashed #d9d9d9', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
              color: '#bbb',
            }}>
              <PictureOutlined style={{ fontSize: 32 }} />
            </div>
          )}
        </div>

        {/* 封面上传 */}
        <Form.Item label="封面图">
          <Upload {...coverUploadProps}>
            <Button icon={<PictureOutlined />}>
              {currentCoverUrl ? '更换封面' : '上传封面'}
            </Button>
          </Upload>
          {coverProgress !== null && (
            <Progress percent={coverProgress} size="small" style={{ marginTop: 8 }} />
          )}
          {!item?.id && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              请先创建资源后再上传封面
            </Text>
          )}
        </Form.Item>

        {/* PDF 上传 */}
        <Form.Item label="PDF 文件">
          <Upload {...pdfUploadProps}>
            <Button icon={<InboxOutlined />}>
              {currentPdfUrl ? '更换 PDF' : '上传 PDF'}
            </Button>
          </Upload>
          {pdfProgress !== null && (
            <Progress percent={pdfProgress} size="small" style={{ marginTop: 8 }} />
          )}
          {!item?.id && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              请先创建资源后再上传 PDF（草稿态可先不传）
            </Text>
          )}
          {currentPdfUrl && (
            <Tag color="green" style={{ marginTop: 4 }}>已上传</Tag>
          )}
        </Form.Item>

        <Divider orientation="left" plain>其他设置</Divider>

        {/* 排序 */}
        <Form.Item name="sort_order" label="排序权重">
          <InputNumber min={0} max={9999} />
        </Form.Item>

        {/* 上架状态 */}
        <Form.Item name="is_active" label="上架状态" valuePropName="checked">
          <Switch checkedChildren="上架" unCheckedChildren="下架" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
