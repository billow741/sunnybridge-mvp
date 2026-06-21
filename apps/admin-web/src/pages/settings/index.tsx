/**
 * 设置页面 — 占位骨架
 */
import { Card, Empty, Button, Form, Input, Switch, Divider } from 'antd';
import { SettingOutlined, SaveOutlined } from '@ant-design/icons';

export default function SettingsPage() {
  const [form] = Form.useForm();
  return (
    <div>
      <h2>系统设置</h2>
      <Card style={{ marginTop: 16 }}>
        <Empty
          image={<div style={{ fontSize: 48, color: '#5CAADF' }}><SettingOutlined /></div>}
          description="系统全局配置（预留）"
        />
        <Form form={form} layout="vertical" style={{ maxWidth: 600, margin: '0 auto' }}>
          <Form.Item label="机构名称" name="org_name" initialValue="SunnyBridge"><Input /></Form.Item>
          <Form.Item label="联系电话" name="phone"><Input /></Form.Item>
          <Form.Item label="邮箱" name="email"><Input /></Form.Item>
          <Form.Item label="开启短信通知" name="sms_enabled" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item label="开启邮件通知" name="email_enabled" valuePropName="checked"><Switch defaultChecked /></Form.Item>
          <Divider />
          <Button type="primary" icon={<SaveOutlined />}>保存设置</Button>
        </Form>
      </Card>
    </div>
  );
}
