/**
 * StudentForm — A-STUDENT-FORM Modal (create / edit reuse).
 *
 * ADMIN-03 scope:
 * - Create: POST /children → parent_phone to find/auto-create parent
 * - Edit: PUT /children/:id
 *
 * Validation rules per API-05 ChildCreate/ChildUpdate schema:
 * - name: required, 1-50 chars
 * - parent_phone: required (create), Chinese mobile ^1[3-9]\d{9}$
 * - english_name: optional, max 50 chars
 * - birth_date: optional, valid date
 * - level: optional, L1-L6 enum (defaults to L1 on backend if omitted)
 */

import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { LEVELS, type Level, type Student } from '../../services/student';

interface StudentFormValues {
  name: string;
  parent_phone: string;
  english_name?: string;
  birth_date?: dayjs.Dayjs;
  level?: Level;
}

interface StudentFormProps {
  open: boolean;
  student: Student | null; // null = create mode, non-null = edit mode
  loading: boolean;
  onSubmit: (values: {
    name: string;
    parent_phone: string;
    english_name?: string;
    birth_date?: string;
    level?: Level;
  }) => void;
  onCancel: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({
  open,
  student,
  loading,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm<StudentFormValues>();
  const isEdit = student !== null;
  const hasParentPhone = isEdit && !!student?.parent?.phone;

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (student) {
        form.setFieldsValue({
          name: student.name,
          parent_phone: student.parent?.phone || '',
          english_name: student.english_name || undefined,
          birth_date: student.birth_date ? dayjs(student.birth_date) : undefined,
          level: student.level || undefined,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, student, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit({
        name: values.name,
        parent_phone: values.parent_phone,
        english_name: values.english_name || undefined,
        birth_date: values.birth_date?.format('YYYY-MM-DD') || undefined,
        level: values.level || undefined,
      });
    } catch {
      // validation failed — antd shows field errors
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑学生' : '新建学生'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={isEdit ? '保存' : '创建'}
      cancelText="取消"
      destroyOnClose
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="name"
          label="学生姓名"
          rules={[
            { required: true, message: '请输入学生姓名' },
            { max: 50, message: '姓名最多50个字符' },
          ]}
        >
          <Input placeholder="如: 王小明" maxLength={50} />
        </Form.Item>

        <Form.Item
          name="english_name"
          label="英文名"
          rules={[
            { max: 50, message: '英文名最多50个字符' },
          ]}
        >
          <Input placeholder="如: Tom" maxLength={50} />
        </Form.Item>

        <Form.Item
          name="parent_phone"
          label="家长手机号"
          rules={[
            { required: true, message: '请输入家长手机号' },
            {
              pattern: /^1[3-9]\d{9}$/,
              message: '请输入正确的11位手机号',
            },
          ]}
          extra={
            !hasParentPhone && isEdit
              ? '⚠️ 未找到原家长信息，请输入新手机号'
              : isEdit
                ? '修改手机号将重新关联家长'
                : '新手机号将自动创建家长账号'
          }
        >
          <Input placeholder="如: 13812345678" maxLength={11} />
        </Form.Item>

        <Form.Item
          name="birth_date"
          label="出生日期"
        >
          <DatePicker
            style={{ width: '100%' }}
            placeholder="选择出生日期"
            disabledDate={(current) => current && current > dayjs()}
          />
        </Form.Item>

        <Form.Item
          name="level"
          label="学习级别"
          initialValue={undefined}
        >
          <Select placeholder="选择级别" allowClear>
            {LEVELS.map((lv) => (
              <Select.Option key={lv} value={lv}>
                {lv}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StudentForm;
