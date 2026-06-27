import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Spin, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import client, { extractError } from '@/api/client';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const { data } = await client.get(`/courses/${id}`); setCourse(data); }
      catch (err) { console.error(extractError(err)); } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!course) return <div>未找到课程</div>;

  const fb = course.feedback;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>返回</Button>
      <Card style={{ borderRadius: 12 }}>
        <Descriptions column={1} labelStyle={{ fontWeight: 600 }}>
          <Descriptions.Item label="日期">{course.date}</Descriptions.Item>
          <Descriptions.Item label="时间">{course.start_time?.slice(0,5)} - {course.end_time?.slice(0,5)}</Descriptions.Item>
          <Descriptions.Item label="教师">{course.teacher?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="课时">{course.hours ?? 1}</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag color={fb ? 'green' : 'orange'}>{fb ? '已完成' : '待上课'}</Tag></Descriptions.Item>
        </Descriptions>
      </Card>

      {fb && (
        <Card title="教师反馈" style={{ marginTop: 12, borderRadius: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: '📖 上课内容', value: fb.content, color: '#7c3aed' },
              { label: '📝 作业布置', value: fb.homework, color: '#2563eb' },
              { label: '💡 备注', value: fb.notes, color: '#d97706' },
            ].map(s => s.value && (
              <div key={s.label} style={{
                background: '#f9fafb', borderRadius: 10, padding: '14px 16px',
                borderLeft: `4px solid ${s.color}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: s.color, marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 14, color: '#1f2937', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
