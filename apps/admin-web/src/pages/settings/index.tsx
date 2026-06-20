import { useEffect, useState } from 'react';
import { Card, Statistic, Row, Col, Button, Modal, message, Descriptions, Space } from 'antd';
import { ExportOutlined, ImportOutlined, DeleteOutlined } from '@ant-design/icons';
import client, { extractError } from '@/api/client';

export default function Settings() {
  const [counts, setCounts] = useState({ children: 0, teachers: 0, courses: 0 });

  useEffect(() => {
    Promise.all([
      client.get('/children', { params: { page: 1, page_size: 1 } }),
      client.get('/teachers', { params: { page: 1, page_size: 1 } }),
      client.get('/courses/all', { params: { page: 1, page_size: 1 } }),
    ]).then(([ch, te, co]) => {
      setCounts({ children: ch.data.total || 0, teachers: te.data.total || 0, courses: co.data.total || 0 });
    }).catch(() => {});
  }, []);

  const handleExport = async () => {
    try {
      const [ch, te, co] = await Promise.all([
        client.get('/children', { params: { page: 1, page_size: 9999 } }),
        client.get('/teachers', { params: { page: 1, page_size: 9999 } }),
        client.get('/courses/all', { params: { page: 1, page_size: 9999 } }),
      ]);
      const data = { children: ch.data.items, teachers: te.data.items, courses: co.data.items, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `sunnybridge-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (err) { message.error(extractError(err)); }
  };

  const handleClear = () => {
    Modal.confirm({ title: '⚠️ 清空所有数据', content: '此操作不可恢复！', okType: 'danger', onOk: async () => { message.warning('清空功能已锁定'); } });
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}><Card><Statistic title="学生数" value={counts.children} /></Card></Col>
        <Col span={8}><Card><Statistic title="教师数" value={counts.teachers} /></Card></Col>
        <Col span={8}><Card><Statistic title="课程数" value={counts.courses} /></Card></Col>
      </Row>
      <Card title="数据管理" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button icon={<ExportOutlined />} onClick={handleExport}>导出数据 (JSON)</Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleClear}>清空数据</Button>
        </Space>
      </Card>
      <Card title="关于">
        <Descriptions column={1}>
          <Descriptions.Item label="版本">1.0.0</Descriptions.Item>
          <Descriptions.Item label="技术栈">React 18 + Ant Design 5 + Vite</Descriptions.Item>
          <Descriptions.Item label="后端">FastAPI + Supabase</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
