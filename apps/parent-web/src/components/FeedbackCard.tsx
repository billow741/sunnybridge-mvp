import { Card, Descriptions, Typography } from 'antd';
import type { FeedbackOut } from '../types';

export default function FeedbackCard({ feedback }: { feedback: FeedbackOut }) {
  return (
    <Card title="课后反馈" size="small">
      <Descriptions column={1} size="small">
        <Descriptions.Item label="反馈内容">
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{feedback.content}</Typography.Paragraph>
        </Descriptions.Item>
        {feedback.homework && (
          <Descriptions.Item label="课后作业">
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{feedback.homework}</Typography.Paragraph>
          </Descriptions.Item>
        )}
        {feedback.notes && (
          <Descriptions.Item label="备注">
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{feedback.notes}</Typography.Paragraph>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="教师">{feedback.teacher?.name || '—'}</Descriptions.Item>
        <Descriptions.Item label="提交时间">{feedback.created_at ? new Date(feedback.created_at).toLocaleString('zh-CN') : '—'}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}