import { useState } from 'react';
import { Form, Input, Button, Space, message } from 'antd';
import apiClient from '../api/client';
import type { FeedbackCreate, FeedbackOut, FeedbackUpdate } from '../types';

interface FeedbackFormProps {
  courseId: string;
  initialData?: FeedbackOut;
  onSuccess: (feedback: FeedbackOut) => void;
  onCancel?: () => void;
}

export default function FeedbackForm({ courseId, initialData, onSuccess, onCancel }: FeedbackFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isEdit = !!initialData;

  const handleSubmit = async (values: FeedbackCreate) => {
    setLoading(true);
    try {
      let res;
      if (isEdit) {
        const updateData: FeedbackUpdate = {};
        if (values.content !== initialData!.content) updateData.content = values.content;
        if (values.homework !== initialData!.homework) updateData.homework = values.homework;
        if (values.notes !== initialData!.notes) updateData.notes = values.notes;
        res = await apiClient.put<FeedbackOut>(`/courses/${courseId}/feedback`, updateData);
      } else {
        res = await apiClient.post<FeedbackOut>(`/courses/${courseId}/feedback`, values);
      }
      message.success(isEdit ? '反馈已更新' : '反馈已提交');
      onSuccess(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.detail?.message || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        content: initialData?.content || '',
        homework: initialData?.homework || '',
        notes: initialData?.notes || '',
      }}
    >
      <Form.Item name="content" label="这节课孩子表现如何？" rules={[{ required: true, message: '请填写反馈内容' }]}>
        <Input.TextArea rows={4} placeholder="描述这节课的学习情况、孩子的表现..." />
      </Form.Item>
      <Form.Item name="homework" label="课后作业安排">
        <Input.TextArea rows={3} placeholder="给孩子们布置的课后练习..." />
      </Form.Item>
      <Form.Item name="notes" label="备注">
        <Input.TextArea rows={2} placeholder="其他需要记录的信息..." />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEdit ? '更新反馈' : '提交反馈'}
          </Button>
          {onCancel && <Button onClick={onCancel}>取消</Button>}
        </Space>
      </Form.Item>
    </Form>
  );
}
