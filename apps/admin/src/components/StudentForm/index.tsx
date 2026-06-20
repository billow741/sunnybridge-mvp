/**
 * StudentForm — A-STUDENT-FORM Modal (create / edit reuse).
 *
 * 设计方案: 基本信息区块
 * - 姓名*, 手机号*(+86), 英文名, 生日, 级别(L1-L6), 家长电话*(+86)
 * 对齐后端: StudentCreateParams { name, parent_phone, english_name, birth_date, level }
 */

import React, { useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Select, Card, InputNumber } from 'antd';
import dayjs from 'dayjs';
import type { Student, Level } from '../../services/student';

interface StudentFormValues {
  name: string;
  phone: string;
  english_name?: string;
  birth_date?: string; // YYYY-MM-DD
  level?: Level;
  parent_phone: string;
  totalhours?: number;
  usedhours?: number;
}

interface StudentFormProps {
  open: boolean;
  student: Student | null;
  loading: boolean;
  onSubmit: (values: {
    name: string;
    parent_phone: string;
    english_name?: string;
    birth_date?: string;
    level?: Level;
    totalhours?: number;
    usedhours?: number;
  }) => void;
  onCancel: () => void;
}

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: 'L1', label: 'L1 一年级' },
  { value: 'L2', label: 'L2 二年级' },
  { value: 'L3', label: 'L3 三年级' },
  { value: 'L4', label: 'L4 四年级' },
  { value: 'L5', label: 'L5 五年级' },
  { value: 'L6', label: 'L6 六年级' },
];

const StudentForm: React.FC<StudentFormProps> = ({
  open,
  student,
  loading,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm<StudentFormValues>();
  const isEdit = student !== null;

  useEffect(() => {
    if (open) {
      if (student) {
        form.setFieldsValue({
          name: student.name,
          phone: student.phone || '',
          english_name: student.english_name || undefined,
          birth_date: student.birth_date ? dayjs(student.birth_date) : undefined,
          level: student.level || undefined,
          parent_phone: student.parent_phone || student.parent?.phone || '',
          totalhours: student.totalhours || 0,
          usedhours: student.usedhours || 0,
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
        english_name: values.english_name,
        birth_date: values.birth_date,
        level: values.level,
        totalhours: values.totalhours,
        usedhours: values.usedhours,
      });
    } catch {
      // antd shows field errors
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
      width={480}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Card
          size="small"
          title="基本信息"
          bordered={false}
          style={{ marginBottom: 16, background: '#fafafa' }}
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" maxLength={50} />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" maxLength={11} prefix="+86" />
          </Form.Item>

          <Form.Item name="english_name" label="英文名">
            <Input placeholder="请输入英文名" maxLength={50} />
          </Form.Item>

          <Form.Item name="birth_date" label="生日">
            <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="level" label="级别">
            <Select options={LEVEL_OPTIONS} placeholder="选择级别" allowClear />
          </Form.Item>

          <Form.Item
            name="parent_phone"
            label="家长电话"
            rules={[{ required: true, message: '请输入家长电话' }]}
          >
            <Input placeholder="请输入家长电话" maxLength={11} prefix="+86" />
          </Form.Item>
        </Card>

        <Card
          size="small"
          title="课时信息"
          bordered={false}
          style={{ marginBottom: 16, background: '#fafafa' }}
        >
          <Form.Item
            name="totalhours"
            label="总课时"
            initialValue={isEdit ? undefined : 0}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入总课时" />
          </Form.Item>

          <Form.Item
            name="usedhours"
            label="已用课时"
            initialValue={isEdit ? undefined : 0}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入已用课时" />
          </Form.Item>
        </Card>
      </Form>
    </Modal>
  );
};

export default StudentForm;
