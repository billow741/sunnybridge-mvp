import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Tabs, message, Popconfirm, Space, Tag, Checkbox, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getSettings, upsertSetting, deleteSetting, Setting } from '@/services/settings';
import client from '@/api/client';
import RequirePermission from '@/components/RequirePermission';

const { TextArea } = Input;

const CATEGORIES = [
  { key: 'hour_nodes', label: '课时节点' },
  { key: 'notification', label: '通知模板' },
  { key: 'roles', label: '角色权限' },
];

// 权限模块中文映射
const MODULE_LABELS: Record<string, string> = {
  dashboard: '工作台', students: '学员', courses: '课程', teachers: '教师',
  finance: '财务', payments: '收款', settlements: '结算', refunds: '退款',
  hours: '课时', settings: '系统设置', roles: '角色管理', resources: '资源',
  export: '导出', search: '搜索',
};

const ACTION_LABELS: Record<string, string> = {
  read: '查看', write: '编辑', delete: '删除', approve: '审批',
};

interface RoleItem {
  name: string;
  label: string;
  permissions: string[];
}

interface PermissionItem {
  code: string;
  label: string;
  module: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('hour_nodes');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form] = Form.useForm();

  // 角色权限 Tab 状态
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [checkedPerms, setCheckedPerms] = useState<string[]>([]);

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

  const loadRoles = async () => {
    setRolesLoading(true);
    try {
      const [{ data: rolesData }, { data: permsData }] = await Promise.all([
        client.get('/roles'),
        client.get('/roles/permissions'),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);
    } catch (error) {
      message.error('加载角色权限失败');
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'roles') {
      loadRoles();
    } else {
      loadSettings(activeTab);
    }
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

  // 角色权限编辑
  const handleEditRole = (role: RoleItem) => {
    setEditingRole(role);
    setCheckedPerms([...role.permissions]);
    setEditRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!editingRole) return;
    try {
      await client.put(`/roles/${editingRole.name}/permissions`, {
        permission_codes: checkedPerms,
      });
      message.success('权限更新成功');
      setEditRoleModalOpen(false);
      loadRoles();
    } catch (error) {
      message.error('权限更新失败');
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

  // 角色权限表格列
  const roleColumns = [
    {
      title: '角色',
      dataIndex: 'label',
      key: 'label',
      width: 140,
      render: (text: string, record: RoleItem) => (
        <span>
          {text}
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{record.name}</div>
        </span>
      ),
    },
    {
      title: '权限数',
      key: 'count',
      width: 80,
      render: (_: any, record: RoleItem) => <Tag color="blue">{record.permissions.length}</Tag>,
    },
    {
      title: '权限概览',
      key: 'overview',
      render: (_: any, record: RoleItem) => {
        // 按模块分组
        const byModule: Record<string, string[]> = {};
        record.permissions.forEach(p => {
          const [mod] = p.split(':');
          if (!byModule[mod]) byModule[mod] = [];
          byModule[mod].push(p);
        });
        return (
          <Space wrap size={4}>
            {Object.entries(byModule).map(([mod, perms]) => (
              <Tag key={mod} style={{ margin: 0 }}>
                {MODULE_LABELS[mod] || mod}: {perms.map(p => {
                  const [, action] = p.split(':');
                  return ACTION_LABELS[action] || action;
                }).join('/')}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: RoleItem) => (
        <RequirePermission code="roles:write" fallback={<span style={{ color: '#d9d9d9' }}>无权限</span>}>
          <Button type="link" size="small" onClick={() => handleEditRole(record)}>编辑权限</Button>
        </RequirePermission>
      ),
    },
  ];

  // 权限编辑 Modal — 按模块分组复选
  const permissionsByModule = permissions.reduce<Record<string, PermissionItem[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 16 }}>系统设置</h2>
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          tabBarExtraContent={
            activeTab !== 'roles' ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增设置
              </Button>
            ) : undefined
          }
          items={CATEGORIES.map((cat) => ({
            key: cat.key,
            label: cat.label,
            children: cat.key === 'roles' ? (
              <Table
                columns={roleColumns}
                dataSource={roles}
                rowKey="name"
                loading={rolesLoading}
                pagination={false}
              />
            ) : (
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

      {/* 角色权限编辑 Modal */}
      <Modal
        title={`编辑权限 — ${editingRole?.label || ''}`}
        open={editRoleModalOpen}
        onOk={handleSaveRole}
        onCancel={() => setEditRoleModalOpen(false)}
        width={640}
        okText="保存"
        destroyOnClose
      >
        <div style={{ maxHeight: 480, overflow: 'auto' }}>
          {Object.entries(permissionsByModule).map(([mod, perms]) => (
            <div key={mod} style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>{MODULE_LABELS[mod] || mod}</h4>
              <Checkbox.Group
                value={checkedPerms}
                onChange={(vals) => setCheckedPerms(vals as string[])}
              >
                <Space wrap>
                  {perms.map(p => {
                    const [, action] = p.code.split(':');
                    return (
                      <Checkbox key={p.code} value={p.code}>
                        {ACTION_LABELS[action] || action}
                      </Checkbox>
                    );
                  })}
                </Space>
              </Checkbox.Group>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
