/**
 * TeacherForm — A-TEACHER-FORM Modal (create / edit reuse).
 *
 * ADMIN-02 scope:
 * - Create: POST /teachers → response includes initial_password
 * - Edit:   PUT /teachers/:id
 *
 * Validation rules per API-04 schema:
 * - name: required, 1-50 chars
 * - phone: optional, 5-20 chars (Philippine format, e.g. +63 917 123 4567)
 * - email: optional, valid email
 * - bio: optional, max 500 chars
 */

import React, { useEffect } from 'react';
import { Modal, Form, Input, Alert, Card, InputNumber } from 'antd';
import type { Teacher } from '../../services/teacher';

interface TeacherFormValues {
  username: string;
  name: string;
  phone?: string;
  email?: string;
  bio?: string;
  hourly_rate?: number;
}

interface TeacherFormProps {
  open: boolean;
  teacher: Teacher | null;
  loading: boolean;
  onSubmit: (values: { username: string; name: string; phone?: string; email?: string; bio?: string; hourly_rate?: number }) => void;
  onCancel: () => void;
  /** initial_password returned after create — displayed in parent */
  initialPassword?: string | null;
}

const TeacherForm: React.FC<TeacherFormProps> = ({
  open,
  teacher,
  loading,
  onSubmit,
  onCancel,
  initialPassword,
}) => {
  const [form] = Form.useForm<TeacherFormValues>();
  const isEdit = teacher !== null;

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (teacher) {
        form.setFieldsValue({
          username: teacher.username,
          name: teacher.name,
          phone: (teacher.phone as string | undefined) ?? undefined,
          email: (teacher.email as string | undefined) ?? undefined,
          bio: (teacher.bio as string | undefined) ?? undefined,
          hourly_rate: teacher.hourly_rate ?? undefined,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, teacher, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch {
      // validation failed — antd shows field errors
    }
  };

  // After create success, show only a Close button (prevent re-submit)
  const showSuccessState = !isEdit && !!initialPassword;

  return (
    <Modal
      title={isEdit ? '编辑教师' : '新建教师'}
      open={open}
      onOk={showSuccessState ? onCancel : handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={showSuccessState ? '关闭' : isEdit ? '保存' : '创建'}
      cancelButtonProps={{ style: { display: showSuccessState ? 'none' : undefined } }}
      cancelText="取消"
      destroyOnClose
      width={480}
    >
      {/* Show initial password after successful create */}
      {!isEdit && initialPassword && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message="教师创建成功"
          description={
            <>
              <span>初始密码：</span>
              <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold' }}>
                {initialPassword}
              </span>
              <br />
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                请将此密码转交教师，首次登录后需修改密码
              </span>
            </>
          }
        />
      )}

      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        disabled={!!initialPassword}
      >
        <Card
          size="small"
          title="基本信息"
          bordered={false}
          style={{ marginBottom: 16, background: '#fafafa' }}
        >
          <Form.Item
            name="username"
            label="登录用户名"
            tooltip="教师登录时使用的用户名，创建后不可修改"
            rules={[
              { required: true, message: '请输入用户名' },
              { max: 50, message: '用户名最多50个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '仅支持英文、数字和下划线' },
            ]}
          >
            <Input placeholder="例如: teacher01" maxLength={50} disabled={isEdit} />
          </Form.Item>

          <Form.Item
            name="name"
            label="姓名"
            rules={[
              { required: true, message: '请输入姓名' },
              { max: 50, message: '姓名最多50个字符' },
            ]}
          >
            <Input placeholder="请输入姓名" maxLength={50} />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { min: 5, message: '手机号至少5位' },
              { max: 20, message: '手机号最多20位' },
            ]}
          >
            <Input
              placeholder="例如: +63 917 123 4567"
              maxLength={20}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            name="bio"
            label="个人简介"
            rules={[
              { max: 500, message: '个人简介最多500个字符' },
            ]}
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入个人简介"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item label="时薪 (元/小时)" name="hourly_rate" tooltip="教师的课时费用单价">
            <InputNumber min={0} step={10} precision={2} style={{ width: '100%' }} placeholder="可选" />
          </Form.Item>
        </Card>
      </Form>
    </Modal>
  );
};

export default TeacherForm;
