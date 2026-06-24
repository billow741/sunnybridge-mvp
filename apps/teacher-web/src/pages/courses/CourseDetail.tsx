import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Form, Input, Button, message, Spin, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import client, { extractError } from '@/api/client';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fbForm] = Form.useForm();

  const load = async () => {
    try {
      const { data } = await client.get(`/courses/${id}`);
      setCourse(data);
      if (data.feedback) fbForm.setFieldsValue(data.feedback);
    } catch (err) { message.error(extractError(err)); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const submitFeedback = async (values: any) => {
    try {
      if (course.feedback) { await client.put(`/courses/${id}/feedback`, values); }
      else { await client.post(`/courses/${id}/feedback`, values); }
      message.success('反馈已保存'); load();
    } catch (err) { message.error(extractError(err)); }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!course) return <div>未找到课程</div>;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>返回</Button>
      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={3}>
          <Descriptions.Item label="日期">{course.date}</Descriptions.Item>
          <Descriptions.Item label="时间">{course.start_time?.slice(0,5)} - {course.end_time?.slice(0,5)}</Descriptions.Item>
          <Descriptions.Item label="课时">{course.hours ?? 1}</Descriptions.Item>
          <Descriptions.Item label="学生">{course.students?.map((c: any) => c.name).join(', ')}</Descriptions.Item>
          <Descriptions.Item label="教师">{course.teacher?.name}</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag color={course.feedback ? 'green' : 'orange'}>{course.feedback ? '已完成' : '待上课'}</Tag></Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="课程反馈">
        <Form form={fbForm} layout="vertical" onFinish={submitFeedback}>
          <Form.Item name="content" label="上课内容" rules={[{ required: true, message: '请填写上课内容' }]}>
            <Input.TextArea rows={3} placeholder="描述本次课程内容..." />
          </Form.Item>
          <Form.Item name="homework" label="作业布置">
            <Input.TextArea rows={2} placeholder="布置的作业..." />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="其他备注..." />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit">{course.feedback ? '更新反馈' : '提交反馈'}</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
