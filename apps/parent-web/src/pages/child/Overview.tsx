import { useEffect, useState } from 'react';
import { Card, Statistic, Row, Col, List, Tag, Spin, Alert, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import client, { extractError } from '@/api/client';

export default function ChildOverview() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [chRes, cRes] = await Promise.all([
          client.get('/children/mine'),
          client.get('/courses/history'),
        ]);
        setChildren(Array.isArray(chRes.data) ? chRes.data : (chRes.data.items || []));
        setCourses(Array.isArray(cRes.data) ? cRes.data : (cRes.data.items || []));
      } catch (err) {
        // fallback: 如果 /children/mine 不支持，尝试列表
        try {
          const { data } = await client.get('/children', { params: { page: 1, page_size: 50 } });
          setChildren(data.items || []);
        } catch {}
      }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  if (children.length === 0) {
    return <Alert type="info" message="暂无关联孩子信息" description="请联系管理员绑定" showIcon />;
  }

  return (
    <div>
      {children.map((child: any) => {
        const remaining = child.remaining_hours ?? (child.totalhours - child.usedhours);
        const childCourses = courses.filter((c: any) => c.students?.some((ch: any) => ch.id === child.id));
        const recentCourses = childCourses.slice(0, 5);

        return (
          <Card key={child.id} style={{ marginBottom: 16, borderRadius: 12 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{child.name}</div>
              {child.english_name && <span style={{ color: '#64748b', marginLeft: 8 }}>{child.english_name}</span>}
              {child.level && <Tag color="blue" style={{ marginLeft: 8 }}>{child.level}</Tag>}
            </div>

            <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col span={8}><Card size="small" style={{ textAlign: 'center', borderRadius: 8 }} bodyStyle={{ padding: '12px 8px' }}>
                <Statistic title="总课时" value={child.totalhours} valueStyle={{ fontSize: 20 }} />
              </Card></Col>
              <Col span={8}><Card size="small" style={{ textAlign: 'center', borderRadius: 8 }} bodyStyle={{ padding: '12px 8px' }}>
                <Statistic title="已用" value={child.usedhours} valueStyle={{ fontSize: 20 }} />
              </Card></Col>
              <Col span={8}><Card size="small" style={{ textAlign: 'center', borderRadius: 8, border: remaining < 5 ? '2px solid #F4A230' : undefined }} bodyStyle={{ padding: '12px 8px' }}>
                <Statistic title="剩余" value={remaining} valueStyle={{ fontSize: 20, color: remaining < 5 ? '#F4A230' : '#5CAADF' }} />
              </Card></Col>
            </Row>

            {remaining < 5 && <Alert message="课时余额不足" description={`剩余 ${remaining} 课时，请及时续费`} type="warning" showIcon style={{ marginBottom: 12 }} />}

            {recentCourses.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>最近课程</div>
                <List size="small" dataSource={recentCourses} renderItem={(c: any) => (
                  <List.Item extra={<Tag color={c.feedback ? 'green' : 'default'}>{c.feedback ? '有反馈' : '待反馈'}</Tag>}
                    onClick={() => navigate(`/courses/${c.id}`)} style={{ cursor: 'pointer' }}>
                    <List.Item.Meta title={`${c.date} ${c.start_time?.slice(0,5)}`} description={`教师: ${c.teacher?.name || '-'} | 课时: ${c.hours ?? 1}`} />
                  </List.Item>
                )} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
