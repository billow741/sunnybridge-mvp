import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Tabs, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getSettings, upsertSetting, deleteSetting, Setting } from '@/services/settings';

const { TextArea } = Input;

const CATEGORIES = [
  { key: 'hour_nodes', label: '课时节点' },
  { key: 'notification', label: '通知模板' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('hour_nodes');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form] = Form.useForm();

  const loadSettings = async (category: string) => {
    setLoading(true);
    try {
      const data = await getSettings(category);
      setSettings(data);
    } catch (error) {
      message.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings(activeTab);
  }, [activeTab]);

  const handleAdd = () => {
    setEditingKey(null);
    form.resetFields();
    form.setFieldsValue({ category: activeTab });
    setIsModalOpen(true);
  };

  const handleEdit = (record: Setting) => {
    setEditingKey(record.key);
    form.setFieldsValue({
      key: record.key,
      value: record.value,
      category: record.category,
      description: record.description,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (key: string) => {
    try {
      await deleteSetting(key);
      message.success('删除成功');
      loadSettings(activeTab);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSave = async (values: any) => {
    try {
      const key = editingKey || values.key;
      await upsertSetting(key, {
        value: values.value,
        category: values.category,
        description: values.description,
      });
      message.success('保存成功');
      setIsModalOpen(false);
      loadSettings(activeTab);
    } catch (error) {
      message.error('保存失败');
    }
  };

  const columns = [
    {
      title: '键 (Key)',
      dataIndex: 'key',
      key: 'key',
      width: 200,
    },
    {
      title: '值 (Value)',
      dataIndex: 'value',
      key: 'value',
      ellipsis: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (text: string) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Setting) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确认删除?"
            onConfirm={() => handleDelete(record.key)}
            okText="删除"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 16 }}>系统设置</h2>
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          tabBarExtraContent={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增设置
            </Button>
          }
          items={CATEGORIES.map((cat) => ({
            key: cat.key,
            label: cat.label,
            children: (
              <Table
                columns={columns}
                dataSource={settings}
                rowKey="key"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            ),
          }))}
        />
      </Card>

      <Modal
        title={editingKey ? '编辑设置' : '新增设置'}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            label="键 (Key)"
            name="key"
            rules={[{ required: true, message: '请输入键名' }]}
          >
            <Input disabled={!!editingKey} placeholder="例如: hour_package_10" />
          </Form.Item>
          <Form.Item
            label="值 (Value)"
            name="value"
            rules={[{ required: true, message: '请输入值' }]}
          >
            <TextArea rows={3} placeholder="设置的值" />
          </Form.Item>
          <Form.Item label="分类" name="category" initialValue={activeTab}>
            <Input disabled />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <TextArea rows={2} placeholder="可选描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
