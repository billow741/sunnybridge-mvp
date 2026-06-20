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
          <Descriptions column={1} labelStyle={{ fontWeight: 600 }}>
            <Descriptions.Item label="上课内容">{fb.content}</Descriptions.Item>
            {fb.homework && <Descriptions.Item label="作业">{fb.homework}</Descriptions.Item>}
            {fb.notes && <Descriptions.Item label="备注">{fb.notes}</Descriptions.Item>}
          </Descriptions>
        </Card>
      )}
    </div>
  );
}
