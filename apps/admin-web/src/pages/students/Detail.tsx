import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Tabs, Table, Modal, Form, Input, InputNumber, Button, Select, message, Space, Statistic, Row, Col, Spin, Alert } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';

const ADJUST_REASONS = ['赠送课时', '系统调整', '补偿课时', '其他'];

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm] = Form.useForm();
  const [courses, setCourses] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await client.get(`/children/${id}`);
      setChild(data);
      const { data: cRes } = await client.get('/courses/all', { params: { page: 1, page_size: 100 } });
      const all = cRes.items || [];
      setCourses(all.filter((c: any) => c.children?.some((ch: any) => ch.id === id)));
    } catch (err) { message.error(extractError(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const adjustHours = async (values: any) => {
    try {
      const newTotal = child.totalhours + (values.amount || 0);
      if (newTotal < child.usedhours) { message.error('总课时不能小于已用课时'); return; }
      await client.put(`/children/${id}`, { totalhours: newTotal });
      message.success('课时调整成功');
      setAdjustOpen(false); adjustForm.resetFields(); load();
    } catch (err) { message.error(extractError(err)); }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!child) return <Alert type="error" message="未找到学生" />;

  const remaining = child.remaining_hours ?? (child.totalhours - child.usedhours);

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/students')} style={{ marginBottom: 16 }}>返回</Button>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}><Statistic title="总课时" value={child.totalhours} /></Col>
          <Col span={6}><Statistic title="已用" value={child.usedhours} /></Col>
          <Col span={6}><Statistic title="剩余" value={remaining} valueStyle={{ color: remaining < 5 ? '#cf1322' : '#5CAADF' }} /></Col>
          <Col span={6}><Button type="primary" onClick={() => setAdjustOpen(true)}>调整课时</Button></Col>
        </Row>
      </Card>

      {remaining < 5 && <Alert message="课时不足" description={`剩余 ${remaining} 课时，请及时续费`} type="warning" showIcon style={{ marginBottom: 16 }} />}

      <Descriptions bordered column={3} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="姓名">{child.name}</Descriptions.Item>
        <Descriptions.Item label="英文名">{child.english_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="家长电话">{child.parent_phone}</Descriptions.Item>
        <Descriptions.Item label="级别">{child.level || '-'}</Descriptions.Item>
        <Descriptions.Item label="出生日期">{child.birth_date || '-'}</Descriptions.Item>
      </Descriptions>

      <Card title="上课记录">
        <Table dataSource={courses} rowKey="id" size="small" pagination={{ pageSize: 10 }}
          columns={[
            { title: '日期', dataIndex: 'date' },
            { title: '时间', render: (_: any, r: any) => `${r.start_time?.slice(0,5)}-${r.end_time?.slice(0,5)}` },
            { title: '教师', dataIndex: ['teacher', 'name'] },
            { title: '课时', dataIndex: 'hours', render: (v: number) => v ?? 1 },
            { title: '反馈', render: (_: any, r: any) => r.feedback ? <Tag color="green">已提交</Tag> : <Tag>未提交</Tag> },
          ]}
        />
      </Card>

      <Modal title="调整课时" open={adjustOpen} onCancel={() => setAdjustOpen(false)} onOk={() => adjustForm.submit()} width={480}>
        <Form form={adjustForm} layout="vertical" onFinish={adjustHours}>
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[+1,+5,+10,-1,-5].map(n => (
              <Button key={n} type={n > 0 ? 'primary' : 'default'} icon={n > 0 ? <PlusOutlined /> : <MinusOutlined />}
                onClick={() => { const cur = adjustForm.getFieldValue('amount') || 0; adjustForm.setFieldsValue({ amount: cur + n }); }}>
                {n > 0 ? `+${n}` : n}
              </Button>
            ))}
          </div>
          <Form.Item name="amount" label="调整数量" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="原因" rules={[{ required: true }]}>
            <Select options={ADJUST_REASONS.map(r => ({ value: r, label: r }))} allowClear />
          </Form.Item>
          <div style={{ color: '#64748b', fontSize: 13 }}>
            调整前: {child.totalhours} 课时 → 调整后: {child.totalhours + (adjustForm.getFieldValue('amount') || 0)} 课时
          </div>
        </Form>
      </Modal>
    </div>
  );
}
