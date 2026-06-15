/**
 * ResourceForm — A-RESOURCE-FORM Modal (create / edit reuse).
 *
 * ADMIN-06 scope:
 * - Create: POST /resources → pdf_url defaults to 'pending_upload'
 * - Edit:   PUT /resources/:id
 *
 * Fields:
 * - title (required, 1-200 chars)
 * - category (required, phonics/word_card/recommended enum)
 * - sort_order (optional, number ≥0)
 * - is_active (optional, switch, default true)
 *
 * Notes:
 * - pdf_url in create mode: auto-filled as pending_upload (backend requires min_length=1)
 * - pdf_url in edit mode: not displayed as form field; shown as read-only status text
 * - Resource has no level, cover_url, or page_count — simpler than ReadingForm
 */

import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Switch, Typography, Alert } from 'antd';
import type { Resource } from '../../services/resource';
import {
  RESOURCE_CATEGORY_OPTIONS,
  PENDING_UPLOAD_URL,
} from '../../services/resource';

const { Text } = Typography;

interface ResourceFormProps {
  open: boolean;
  resource: Resource | null; // null = create mode, non-null = edit mode
  loading: boolean;
  onSubmit: (values: {
    title: string;
    category: string;
    pdf_url: string;
    sort_order?: number;
    is_active?: boolean;
  }) => void;
  onCancel: () => void;
}

const ResourceForm: React.FC<ResourceFormProps> = ({
  open,
  resource,
  loading,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const isEdit = resource !== null;

  // Populate form when editing or reset on create
  useEffect(() => {
    if (open) {
      if (resource) {
        form.setFieldsValue({
          title: resource.title,
          category: resource.category,
          sort_order: resource.sort_order,
          is_active: resource.is_active,
        });
      } else {
        form.resetFields();
        // Set defaults for create mode
        form.setFieldsValue({
          pdf_url: PENDING_UPLOAD_URL,
          sort_order: 0,
          is_active: true,
        });
      }
    }
  }, [open, resource, form]);

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
      title={isEdit ? '编辑资源' : '新建资源'}
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
          description="创建资源后，请在列表中点击「上传PDF」按钮上传实际文件。"
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
          <Input placeholder="如: Phonics Level 1" maxLength={200} />
        </Form.Item>

        <Form.Item
          name="category"
          label="分类"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select
            placeholder="选择分类"
            options={RESOURCE_CATEGORY_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
          />
        </Form.Item>

        {/* Edit mode: show current pdf status */}
        {isEdit && resource && (
          <Form.Item label="PDF 文件">
            {resource.pdf_url && resource.pdf_url !== PENDING_UPLOAD_URL ? (
              <Text type="success" copyable={{ text: resource.pdf_url }}>
                已上传 ({resource.pdf_url})
              </Text>
            ) : (
              <Text type="warning">未上传 — 请在列表中点击「上传PDF」</Text>
            )}
          </Form.Item>
        )}

        <Form.Item
          name="sort_order"
          label="排序"
        >
          <InputNumber min={0} style={{ width: '100%' }} placeholder="同级内排序，越小越靠前" />
        </Form.Item>

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

export default ResourceForm;