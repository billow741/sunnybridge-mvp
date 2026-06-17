/**
 * ReadingForm — A-READING-FORM Modal (create / edit reuse).
 *
 * ADMIN-05 scope:
 * - Create: POST /reading/materials → pdf_url defaults to 'pending_upload'
 * - Edit:   PUT /reading/materials/:id
 *
 * Fields:
 * - title (required, 1-200 chars)
 * - level (可选, L1-L6, 草稿态可空→后端默认L1)
 * - category (可选, Select受限, 草稿态可空→后端默认__draft__)
 * - cover_url (optional, URL string)
 * - pdf_url (create: auto-filled pending_upload, edit: read-only display)
 * - page_count (optional, number ≥0)
 * - sort_order (optional, number ≥0)
 * - is_active (optional, switch, default true)
 */

import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Switch, Typography, Alert } from 'antd';
import type { ReadingMaterial } from '../../services/reading';
import { LEVEL_OPTIONS } from '../../constants/resource';
import { VALID_CATEGORIES, CATEGORY_LABELS } from '../../constants/resource';

// 从常量构建旧接口需要的选项格式
const CATEGORY_OPTIONS = VALID_CATEGORIES.reading!.map(v => ({
  value: v,
  label: CATEGORY_LABELS[v] || v,
}));

const { Text } = Typography;

interface ReadingFormProps {
  open: boolean;
  material: ReadingMaterial | null; // null = create mode, non-null = edit mode
  loading: boolean;
  onSubmit: (values: {
    title: string;
    level: string;
    category: string;
    cover_url?: string | null;
    pdf_url: string;
    page_count?: number;
    sort_order?: number;
    is_active?: boolean;
  }) => void;
  onCancel: () => void;
}

const ReadingForm: React.FC<ReadingFormProps> = ({
  open,
  material,
  loading,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const isEdit = material !== null;

  // Populate form when editing or reset on create
  useEffect(() => {
    if (open) {
      if (material) {
        form.setFieldsValue({
          title: material.title,
          level: material.level,
          category: material.category,
          cover_url: material.cover_url || '',
          page_count: material.page_count,
          sort_order: material.sort_order,
          is_active: material.is_active,
        });
      } else {
        form.resetFields();
        // Set defaults for create mode (草稿态 pdf_url 可空)
        form.setFieldsValue({
          page_count: 0,
          sort_order: 0,
          is_active: true,
        });
      }
    }
  }, [open, material, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch {
      // validation failed — antd shows field errors
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑阅读材料' : '新建阅读材料'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={isEdit ? '保存' : '创建'}
      cancelText="取消"
      destroyOnClose
      width={520}
    >
      {/* In create mode, show note about PDF upload flow */}
      {!isEdit && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="PDF 上传说明"
          description="创建材料后，请在列表中点击「上传PDF」按钮上传实际文件，系统将自动提取页数。"
        />
      )}

      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="title"
          label="标题"
          rules={[
            { required: true, message: '请输入标题' },
            { max: 200, message: '标题最多200个字符' },
          ]}
        >
          <Input placeholder="如: Brown Bear, Brown Bear" maxLength={200} />
        </Form.Item>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            name="level"
            label="级别"
            rules={[{ required: false }]}
            style={{ flex: 1 }}
          >
            <Select placeholder="选择级别" options={[...LEVEL_OPTIONS]} />
          </Form.Item>

          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: false }]}
            style={{ flex: 1 }}
          >
            <Select
              placeholder="选择分类"
              options={CATEGORY_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />
          </Form.Item>
        </div>

        <Form.Item
          name="cover_url"
          label="封面图 URL"
        >
          <Input placeholder="如: https://example.com/cover.jpg" />
        </Form.Item>

        {/* Edit mode: show current pdf_url as info text */}
        {isEdit && material && (
          <Form.Item label="PDF 文件">
            {material.page_count > 0 ? (
              <Text type="success">已上传 ({material.page_count} 页)</Text>
            ) : (
              <Text type="warning">未上传 — 请在列表中点击「上传PDF」</Text>
            )}
          </Form.Item>
        )}

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            name="page_count"
            label="页数"
            extra={isEdit ? '由上传 PDF 自动提取，不可手动修改' : undefined}
            style={{ flex: 1 }}
          >
            <InputNumber min={0} disabled={isEdit} style={{ width: '100%' }} placeholder={isEdit ? '自动提取' : '上传PDF后自动填充'} />
          </Form.Item>

          <Form.Item
            name="sort_order"
            label="排序"
            style={{ flex: 1 }}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="同级内排序，越小越靠前" />
          </Form.Item>
        </div>

        <Form.Item
          name="is_active"
          label="上架状态"
          valuePropName="checked"
        >
          <Switch checkedChildren="上架" unCheckedChildren="下架" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ReadingForm;
