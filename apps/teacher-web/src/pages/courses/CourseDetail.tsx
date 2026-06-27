import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tag, Form, Input, Button, message, Spin, Alert, Card } from 'antd';
import {
  ArrowLeftOutlined, VideoCameraOutlined, ClockCircleOutlined,
  UserOutlined, BookOutlined, LinkOutlined, CheckCircleOutlined,
  CalendarOutlined, EditOutlined,
} from '@ant-design/icons';
import client, { extractError } from '@/api/client';

const STATUS_TAG: Record<string, { bg: string; text: string; label: string }> = {
  scheduled:   { bg: '#fff7ed', text: '#c2410c', label: '待上课' },
  in_progress: { bg: '#eff6ff', text: '#1d4ed8', label: '进行中' },
  completed:   { bg: '#f0fdf4', text: '#16a34a', label: '已完成' },
  absent:      { bg: '#fef2f2', text: '#dc2626', label: '学生缺席' },
  cancelled:   { bg: '#f9fafb', text: '#6b7280', label: '已取消' },
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <span style={{ color: '#9ca3af', fontSize: 15, width: 20, textAlign: 'center' }}>{icon}</span>
      <span style={{ color: '#6b7280', fontSize: 13, width: 56 }}>{label}</span>
      <span style={{ color: '#1f2937', fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/* 反馈只读显示（深色可读） — 三段式卡片布局 */
function FeedbackView({ feedback, onEdit }: { feedback: any; onEdit: () => void }) {
  const sections = [
    { icon: '📖', label: '上课内容', value: feedback.content, color: '#7c3aed' },
    { icon: '📝', label: '作业布置', value: feedback.homework, color: '#2563eb' },
    { icon: '💡', label: '备注', value: feedback.notes, color: '#d97706' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sections.map(s => s.value && (
        <div key={s.label} style={{
          background: '#f9fafb', borderRadius: 10, padding: '14px 16px',
          borderLeft: `4px solid ${s.color}`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: s.color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{s.icon}</span>{s.label}
          </div>
          <div style={{ fontSize: 14, color: '#1f2937', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {s.value}
          </div>
        </div>
      ))}
      <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
        <Button
          type="primary"
          ghost
          icon={<EditOutlined />}
          onClick={onEdit}
          style={{ borderRadius: 8, borderColor: '#722ed1', color: '#722ed1', height: 36, fontWeight: 500 }}
        >
          编辑反馈
        </Button>
      </div>
    </div>
  );
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fbForm] = Form.useForm();
  const [meetingLink, setMeetingLink] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(false);
  const [fbSubmitting, setFbSubmitting] = useState(false);

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
      setFbSubmitting(true);
      if (course.feedback) {
        // 编辑反馈 → PUT，不扣课时
        await client.put(`/courses/${id}/feedback`, values);
        message.success('反馈已更新');
      } else {
        // 首次提交 → POST，自动扣课时
        await client.post(`/courses/${id}/feedback`, values);
        message.success('反馈已保存，课时已自动扣减');
      }
      setEditingFeedback(false);
      load();
    } catch (err) { message.error(extractError(err)); } finally { setFbSubmitting(false); }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!course) return <div>未找到课程</div>;

  const isCompleted = !!course.feedback;
  const statusKey = isCompleted ? 'completed' : (course.status || 'scheduled');
  const s = STATUS_TAG[statusKey] || STATUS_TAG.scheduled;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16, color: '#6b7280', padding: 0 }}
      >
        返回
      </Button>

      {/* ── 课程信息卡 ── */}
      <div style={{
        background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: 24, marginBottom: 16,
        borderTop: `4px solid ${isCompleted ? '#22c55e' : '#722ed1'}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockCircleOutlined style={{ color: '#722ed1', fontSize: 18 }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              {course.start_time?.slice(0,5)} - {course.end_time?.slice(0,5)}
            </span>
          </div>
          <span style={{ fontSize: 13, padding: '3px 12px', borderRadius: 12, background: s.bg, color: s.text, fontWeight: 500 }}>
            {s.label}
          </span>
        </div>

        <InfoRow icon={<CalendarOutlined />} label="日期" value={course.date} />
        <InfoRow icon={<UserOutlined />} label="学生" value={course.students?.map((c: any) => c.name).join(', ')} />
        <InfoRow icon={<BookOutlined />} label="科目" value="English" />
        <InfoRow icon={<ClockCircleOutlined />} label="课时" value={course.hours ?? 1} />
      </div>

      {/* ── 腾讯会议链接 ── */}
      <div style={{
        background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: 20, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <VideoCameraOutlined style={{ color: '#722ed1', fontSize: 16 }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1f2937' }}>腾讯会议链接</span>
        </div>
        {isCompleted ? (
          <div style={{
            background: '#f9fafb', borderRadius: 8, padding: '12px 14px',
            fontSize: 13, color: '#374151',
          }}>
            {course.meeting_link
              ? <span><LinkOutlined style={{ marginRight: 6 }} />{course.meeting_link}</span>
              : '未设置会议链接'}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                placeholder="粘贴腾讯会议链接，如 https://meeting.tencent.com/..."
                value={meetingLink}
                onChange={e => setMeetingLink(e.target.value)}
                style={{ flex: 1, borderRadius: 8 }}
              />
              <Button
                type="primary"
                loading={savingLink}
                onClick={saveMeetingLink}
                style={{ background: '#722ed1', borderColor: '#722ed1', borderRadius: 8 }}
              >
                保存链接
              </Button>
            </div>
            {course.meeting_link && (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message="家长可通过此链接进入会议室"
                style={{ marginTop: 10, borderRadius: 8, border: '1px solid #bbf7d0' }}
              />
            )}
          </>
        )}
      </div>

      {/* ── 课程反馈 ── */}
      <div style={{
        background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: 20,
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1f2937', marginBottom: 14 }}>
          课程反馈
        </div>

        {/* 有反馈 + 非编辑模式 → 只读深色显示 + 编辑按钮 */}
        {course.feedback && !editingFeedback ? (
          <FeedbackView feedback={course.feedback} onEdit={() => setEditingFeedback(true)} />
        ) : course.feedback && editingFeedback ? (
          /* 编辑模式 → 表单可编辑，PUT保存不扣课时 */
          <>
            <Alert
              type="info"
              message="编辑反馈不会额外扣减课时"
              style={{ marginBottom: 14, borderRadius: 8 }}
            />
            <Form form={fbForm} layout="vertical" onFinish={submitFeedback}>
              <Form.Item name="content" label="上课内容" rules={[{ required: true, message: '请填写上课内容' }]}>
                <Input.TextArea rows={3} placeholder="描述本次课程内容..." style={{ borderRadius: 8 }} />
              </Form.Item>
              <Form.Item name="homework" label="作业布置">
                <Input.TextArea rows={2} placeholder="布置的作业..." style={{ borderRadius: 8 }} />
              </Form.Item>
              <Form.Item name="notes" label="备注">
                <Input.TextArea rows={2} placeholder="其他备注..." style={{ borderRadius: 8 }} />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button onClick={() => { setEditingFeedback(false); fbForm.setFieldsValue(course.feedback); }} style={{ borderRadius: 8 }}>
                    取消
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={fbSubmitting}
                    style={{ background: '#722ed1', borderColor: '#722ed1', borderRadius: 8, height: 38, fontWeight: 600 }}
                  >
                    保存修改
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </>
        ) : (
          /* 无反馈 → 提交表单（POST，扣课时） */
          <Form form={fbForm} layout="vertical" onFinish={submitFeedback}>
            <Form.Item name="content" label="上课内容" rules={[{ required: true, message: '请填写上课内容' }]}>
              <Input.TextArea rows={3} placeholder="描述本次课程内容..." style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="homework" label="作业布置">
              <Input.TextArea rows={2} placeholder="布置的作业..." style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={2} placeholder="其他备注..." style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={fbSubmitting}
                style={{ background: '#722ed1', borderColor: '#722ed1', borderRadius: 8, height: 38, fontWeight: 600 }}
              >
                提交反馈（自动扣课时）
              </Button>
            </Form.Item>
          </Form>
        )}
      </div>
    </div>
  );
}
