/**
 * TeacherForm — A-TEACHER-FORM Modal (create / edit reuse).
 *
 * ADMIN-02 scope:
 * - Create: POST /teachers → response includes initial_password
 * - Edit:   PUT /teachers/:id
 *
 * Validation rules per API-04 schema:
 * - username: required, 1-50 chars, alphanumeric + underscore only
 * - phone: required, Chinese mobile ^1[3-9]\d{9}$
 * - name: required, 1-50 chars
 */

import React, { useEffect } from 'react';
import { Modal, Form, Input, Alert, Typography } from 'antd';
import type { Teacher } from '../../services/teacher';

const { Text } = Typography;

interface TeacherFormProps {
  open: boolean;
  teacher: Teacher | null; // null = create mode, non-null = edit mode
  loading: boolean;
  onSubmit: (values: { username: string; phone: string; name: string }) => void;
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
  const [form] = Form.useForm();
  const isEdit = teacher !== null;

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (teacher) {
        form.setFieldsValue({
          username: teacher.username,
          phone: teacher.phone,
          name: teacher.name,
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
              <Text>初始密码：</Text>
              <Text strong copyable style={{ fontFamily: 'monospace', fontSize: 16 }}>
                {initialPassword}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                请将初始密码告知教师，首次登录后需修改密码
              </Text>
            </>
          }
        />
      )}

      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        disabled={!!initialPassword} // lock form after create success
      >
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { max: 50, message: '用户名最多50个字符' },
            {
              pattern: /^[a-zA-Z0-9_]+$/,
              message: '仅支持英文字母、数字和下划线',
            },
          ]}
        >
          <Input
            placeholder="如: teacher_wang"
            maxLength={50}
            disabled={isEdit}
          />
        </Form.Item>

        <Form.Item
          name="phone"
          label="手机号"
          rules={[
            { required: true, message: '请输入手机号' },
            {
              pattern: /^1[3-9]\d{9}$/,
              message: '请输入正确的11位手机号',
            },
          ]}
        >
          <Input placeholder="如: 13812345678" maxLength={11} />
        </Form.Item>

        <Form.Item
          name="name"
          label="姓名"
          rules={[
            { required: true, message: '请输入教师姓名' },
            { max: 50, message: '姓名最多50个字符' },
          ]}
        >
          <Input placeholder="如: 王老师" maxLength={50} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TeacherForm;
