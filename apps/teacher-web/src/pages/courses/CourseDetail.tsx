import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Form, Input, Button, message, Spin, Divider, Alert } from 'antd';
import { ArrowLeftOutlined, VideoCameraOutlined } from '@ant-design/icons';
import client, { extractError } from '@/api/client';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fbForm] = Form.useForm();
  const [meetingLink, setMeetingLink] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  const load = async () => {
    try {
      const { data } = await client.get(`/courses/${id}`);
      setCourse(data);
      setMeetingLink(data.meeting_link || '');
      if (data.feedback) fbForm.setFieldsValue(data.feedback);
    } catch (err) { message.error(extractError(err)); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const saveMeetingLink = async () => {
    if (!meetingLink.trim()) { message.warning('请输入会议链接'); return; }
    try {
      setSavingLink(true);
      await client.put(`/courses/${id}/meeting-link`, { meeting_link: meetingLink.trim() });
      message.success('会议链接已保存');
      load();
    } catch (err) { message.error(extractError(err)); } finally { setSavingLink(false); }
  };

  const submitFeedback = async (values: any) => {
    try {
      if (course.feedback) { await client.put(`/courses/${id}/feedback`, values); }
      else { await client.post(`/courses/${id}/feedback`, values); }
      message.success('反馈已保存，课时已自动扣减');
      load();
    } catch (err) { message.error(extractError(err)); }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!course) return <div>未找到课程</div>;

  const isCompleted = !!course.feedback;
  const status = course.status || (isCompleted ? 'completed' : 'pending');

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
          <Descriptions.Item label="状态">
            <Tag color={status === 'completed' ? 'green' : 'orange'}>
              {status === 'completed' ? '已完成' : status === 'in_progress' ? '进行中' : '待上课'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* ── 腾讯会议链接 ── */}
      <Card
        title={<span><VideoCameraOutlined style={{ marginRight: 8 }} />腾讯会议链接</span>}
        style={{ marginBottom: 16 }}
      >
        {isCompleted ? (
          <Alert
            type="info"
            showIcon
            message="课程已完成"
            description={course.meeting_link ? `会议链接: ${course.meeting_link}` : '未设置会议链接'}
          />
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              placeholder="粘贴腾讯会议链接，如 https://meeting.tencent.com/..."
              value={meetingLink}
              onChange={e => setMeetingLink(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button type="primary" loading={savingLink} onClick={saveMeetingLink}>
              保存链接
            </Button>
          </div>
        )}
        {course.meeting_link && !isCompleted && (
          <Alert
            type="success"
            showIcon
            message="家长可通过此链接进入会议室"
            style={{ marginTop: 8 }}
          />
        )}
      </Card>

      {/* ── 课程反馈 ── */}
      <Card title="课程反馈">
        {isCompleted && !course.feedback?.content ? (
          <Alert type="info" message="课程已完成" />
        ) : (
          <Form form={fbForm} layout="vertical" onFinish={submitFeedback}>
            <Form.Item name="content" label="上课内容" rules={[{ required: true, message: '请填写上课内容' }]}>
              <Input.TextArea rows={3} placeholder="描述本次课程内容..." disabled={isCompleted} />
            </Form.Item>
            <Form.Item name="homework" label="作业布置">
              <Input.TextArea rows={2} placeholder="布置的作业..." disabled={isCompleted} />
            </Form.Item>
            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={2} placeholder="其他备注..." disabled={isCompleted} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" disabled={isCompleted}>
                {course.feedback ? '更新反馈' : '提交反馈（自动扣课时）'}
              </Button>
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  );
}
