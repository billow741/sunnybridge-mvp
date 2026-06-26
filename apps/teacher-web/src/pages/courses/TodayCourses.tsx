import { useEffect, useState } from 'react';
import { Tag, Spin, Empty, Modal, Form, Input, Select, message } from 'antd';
import { ClockCircleOutlined, UserOutlined, BookOutlined, LinkOutlined, EditOutlined, VideoCameraOutlined } from '@ant-design/icons';
import client, { extractError } from '@/api/client';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待上课' },
  scheduled: { color: 'orange', label: '待上课' },
  in_progress: { color: 'processing', label: '进行中' },
  completed: { color: 'green', label: '已完成' },
  absent: { color: 'red', label: '学生缺席' },
  cancelled: { color: 'default', label: '已取消' },
};

export default function TodayCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 会议链接编辑状态
  const [linkModal, setLinkModal] = useState<{ open: boolean; courseIndex: number; value: string; saving: boolean }>({
    open: false, courseIndex: -1, value: '', saving: false,
  });

  // 反馈弹窗
  const [fbModal, setFbModal] = useState<{ open: boolean; courseIndex: number }>({ open: false, courseIndex: -1 });
  const [fbForm] = Form.useForm();
  const [fbSubmitting, setFbSubmitting] = useState(false);

  const load = async () => {
    try {
      const { data } = await client.get('/courses/today');
      setCourses(Array.isArray(data) ? data : (data.items || []));
    } catch (err) { console.error(extractError(err)); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── 保存会议链接 ──
  const saveMeetingLink = async () => {
    const idx = linkModal.courseIndex;
    const course = courses[idx];
    if (!course) return;
    if (!linkModal.value.trim()) { message.warning('请输入会议链接'); return; }
    try {
      linkModal.saving = true;
      setLinkModal({ ...linkModal, saving: true });
      await client.put(`/courses/${course.id}/meeting-link`, { meeting_link: linkModal.value.trim() });
      message.success('会议链接已保存');
      setLinkModal({ open: false, courseIndex: -1, value: '', saving: false });
      load();
    } catch (err) { message.error(extractError(err)); setLinkModal({ ...linkModal, saving: false }); }
  };

  // ── 提交反馈 ──
  const submitFeedback = async (values: any) => {
    const idx = fbModal.courseIndex;
    const course = courses[idx];
    if (!course) return;
    try {
      setFbSubmitting(true);
      if (course.feedback) {
        await client.put(`/courses/${course.id}/feedback`, values);
      } else {
        await client.post(`/courses/${course.id}/feedback`, values);
      }
      message.success('反馈已保存，课时已自动扣减');
      setFbModal({ open: false, courseIndex: -1 });
      fbForm.resetFields();
      load();
    } catch (err) { message.error(extractError(err)); } finally { setFbSubmitting(false); }
  };

  const openFeedback = (idx: number) => {
    const course = courses[idx];
    if (course.feedback) {
      fbForm.setFieldsValue(course.feedback);
    } else {
      fbForm.resetFields();
    }
    setFbModal({ open: true, courseIndex: idx });
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  if (courses.length === 0) {
    return <Empty description="今天没有排课" style={{ marginTop: 80 }} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <VideoCameraOutlined style={{ color: '#722ed1', fontSize: 20 }} />
        <span style={{ fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
          今日课程 ({courses.length})
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {courses.map((c: any, idx: number) => {
          const s = STATUS_MAP[c.status] || STATUS_MAP.pending;
          const hasFeedback = !!c.feedback;
          const hasLink = !!c.meeting_link;
          const isCompleted = c.status === 'completed' || hasFeedback;

          return (
            <div
              key={c.id}
              style={{
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                borderTop: `4px solid ${hasFeedback ? '#52c41a' : '#722ed1'}`,
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)')}
            >
              {/* ── 顶部: 时间 + 状态 ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ClockCircleOutlined style={{ color: '#9ca3af', fontSize: 14 }} />
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{c.start_time?.slice(0,5)} - {c.end_time?.slice(0,5)}</span>
                </div>
                <Tag color={s.color} style={{ borderRadius: 12, margin: 0 }}>{s.label}</Tag>
              </div>

              {/* ── 学生 + 科目 ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserOutlined style={{ color: '#9ca3af', fontSize: 14 }} />
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{c.students?.map((ch: any) => ch.name).join(', ') || '-'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOutlined style={{ color: '#9ca3af', fontSize: 14 }} />
                  <span style={{ color: '#6b7280', fontSize: 14 }}>English</span>
                </div>
              </div>

              {/* ── 分隔线 + 会议链接区 ── */}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>会议链接 / Conference Info</div>
                {hasLink ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{
                      flex: 1,
                      background: hasFeedback ? '#f9fafb' : '#f0f5ff',
                      padding: '8px 10px',
                      borderRadius: 6,
                      fontSize: 13,
                      color: '#374151',
                      wordBreak: 'break-all',
                    }}>
                      {!isCompleted && (
                        <a href={c.meeting_link} target="_blank" rel="noopener noreferrer" style={{ color: '#722ed1' }}>
                          {c.meeting_link}
                        </a>
                      )}
                      {isCompleted && <span>{c.meeting_link}</span>}
                    </div>
                    {!isCompleted && (
                      <button
                        onClick={() => setLinkModal({ open: true, courseIndex: idx, value: c.meeting_link || '', saving: false })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
                      >
                        <EditOutlined />
                      </button>
                    )}
                  </div>
                ) : (
                  !isCompleted && (
                    <button
                      onClick={() => setLinkModal({ open: true, courseIndex: idx, value: '', saving: false })}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#9ca3af', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4,
                        padding: 0,
                      }}
                    >
                      <LinkOutlined style={{ fontSize: 14 }} />
                      添加会议链接
                    </button>
                  )
                )}
              </div>

              {/* ── 底部: 提交反馈按钮 ── */}
              {!isCompleted && (
                <button
                  onClick={() => openFeedback(idx)}
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    background: '#722ed1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#5b21b6')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#722ed1')}
                >
                  提交课程反馈
                </button>
              )}
              {isCompleted && (
                <button
                  onClick={() => openFeedback(idx)}
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    border: '1px solid #bbf7d0',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  查看反馈
                </button>
              )}
            </div>
          );
        })}
      }

      </div>

      {/* ── 会议链接编辑弹窗 ── */}
      <Modal
        title="编辑会议链接"
        open={linkModal.open}
        onCancel={() => setLinkModal({ open: false, courseIndex: -1, value: '', saving: false })}
        onOk={saveMeetingLink}
        okText="保存"
        okButtonProps={{ loading: linkModal.saving }}
        destroyOnClose
      >
        <Input.TextArea
          rows={3}
          placeholder="粘贴腾讯会议链接，如 https://meeting.tencent.com/..."
          value={linkModal.value}
          onChange={e => setLinkModal({ ...linkModal, value: e.target.value })}
        />
      </Modal>

      {/* ── 提交反馈弹窗 ── */}
      <Modal
        title="提交课程反馈"
        open={fbModal.open}
        onCancel={() => { setFbModal({ open: false, courseIndex: -1 }); fbForm.resetFields(); }}
        footer={null}
        destroyOnClose
        width={520}
      >
        {fbModal.courseIndex >= 0 && courses[fbModal.courseIndex] && (
          <div style={{
            background: '#f9fafb',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 16,
            fontSize: 13,
            color: '#6b7280',
          }}>
            {courses[fbModal.courseIndex].students?.map((ch: any) => ch.name).join(', ')}
            {' · '}
            {courses[fbModal.courseIndex].date}
            {' '}
            {courses[fbModal.courseIndex].start_time?.slice(0,5)}-{courses[fbModal.courseIndex].end_time?.slice(0,5)}
          </div>
        )}
        <Form form={fbForm} layout="vertical" onFinish={submitFeedback}>
          <Form.Item name="content" label="上课内容" rules={[{ required: true, message: '请填写上课内容' }]}>
            <Input.TextArea rows={3} placeholder="描述本次课程内容..." />
          </Form.Item>
          <Form.Item name="homework" label="作业布置">
            <Input.TextArea rows={2} placeholder="布置的作业..." />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="学生表现、改进方向..." />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setFbModal({ open: false, courseIndex: -1 }); fbForm.resetFields(); }}
                style={{
                  padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 8,
                  background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151',
                }}
              >
                取消
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 16px', border: 'none', borderRadius: 8,
                  background: '#722ed1', color: '#fff', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600,
                  opacity: fbSubmitting ? 0.6 : 1,
                }}
                disabled={fbSubmitting}
              >
                {fbSubmitting ? '提交中...' : '提交反馈（自动扣课时）'}
              </button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
