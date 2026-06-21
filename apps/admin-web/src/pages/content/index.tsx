/**
 * 内容管理页面 — 占位骨架
 */
import { Card, Empty, Button } from 'antd';
import { FileTextOutlined, UploadOutlined } from '@ant-design/icons';

export default function ContentPage() {
  return (
    <div>
      <h2>内容管理</h2>
      <Card style={{ marginTop: 16 }}>
        <Empty
          image={<div style={{ fontSize: 48, color: '#5CAADF' }}><FileTextOutlined /></div>}
          description="阅读材料、学习资源等内容管理模块，开发中..."
        />
        <div style={{ textAlign: 'center' }}>
          <Button type="primary" icon={<UploadOutlined />}>上传资源（功能预留）</Button>
        </div>
      </Card>
    </div>
  );
}
