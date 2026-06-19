import { useState } from 'react';
import { Modal, Form, Input, Button, Alert, message } from 'antd';
import apiClient from '../api/client';
import type { FeedbackCreate } from '../types';

interface FeedbackModalProps {
  courseId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FeedbackModal({ courseId, open, onClose, onSuccess }: FeedbackModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values: FeedbackCreate) => {
    setLoading(true);
    setError('');
    try {
      await apiClient.post(`/courses/${courseId}/feedback`, values);
      message.success('Feedback submitted successfully');
      form.resetFields();
      onClose();
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to submit feedback';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Submit Feedback"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      {error && (
        <Alert type="error" message={error} showIcon closable onClose={() => setError('')} style={{ marginBottom: 16 }} />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="content"
          label="What was covered in class?"
          rules={[{ required: true, message: 'Please describe the class content' }]}
        >
          <Input.TextArea rows={3} placeholder="Summary of today's class..." />
        </Form.Item>

        <Form.Item
          name="homework"
          label="Homework assignment"
        >
          <Input.TextArea rows={2} placeholder="Optional homework assignment..." />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Additional notes"
        >
          <Input.TextArea rows={2} placeholder="Any additional notes..." />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Submit Feedback
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
