/**
 * TeachersPage — A-TEACHERS (ADMIN-02).
 *
 * Features:
 * - Paginated teacher list (Ant Design Table)
 * - Create teacher → Modal form → show initial_password
 * - Edit teacher → Modal form (pre-filled)
 * - Delete teacher → Popconfirm → soft delete
 * - Reset password → Popconfirm → show new_initial_password
 *
 * Auth: relies on ADMIN-01 AuthGuard + Axios interceptor.
 * API: consumes API-04 endpoints via services/teacher.ts.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Table,
  Tag,
  Space,
  Popconfirm,
  message,
  Modal,
  Typography,
  Card,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import TeacherForm from '../../components/TeacherForm';
import {
  getTeacherList,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  restoreTeacher,
  resetTeacherPassword,
} from '../../services/teacher';
import type { Teacher } from '../../services/teacher';

const { Text, Paragraph } = Typography;

const TeachersPage: React.FC = () => {
  // ── List state ──────────────────────────────────
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [listLoading, setListLoading] = useState(false);

  // ── Form modal state ────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [initialPassword, setInitialPassword] = useState<string | null>(null);

  // ── Fetch list ──────────────────────────────────
  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await getTeacherList(page, pageSize);
      setTeachers(res.items);
      setTotal(res.total);
    } catch {
      message.error('获取教师列表失败');
    } finally {
      setListLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // ── Create / Edit submit ────────────────────────
  const handleFormSubmit = async (values: {
    username: string;
    phone: string;
    name: string;
  }) => {
    setFormLoading(true);
    try {
      if (editingTeacher) {
        // Edit mode
        await updateTeacher(editingTeacher.id, values);
        message.success('教师信息已更新');
        setFormOpen(false);
        setEditingTeacher(null);
        fetchList();
      } else {
        // Create mode
        const res = await createTeacher(values);
        setInitialPassword(res.initial_password);
        message.success('教师创建成功');
        // Keep modal open to show initial_password
        // User closes manually after noting the password
        fetchList();
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { code?: string; message?: string } }>;
      const detail = axiosErr.response?.data?.detail;
      if (axiosErr.response?.status === 409) {
        const code = detail?.code;
        if (code === 'TEACHER_USERNAME_DUPLICATE') {
          message.error('用户名已存在，请更换');
        } else if (code === 'TEACHER_PHONE_DUPLICATE') {
          message.error('手机号已存在，请更换');
        } else {
          message.error(detail?.message || '数据重复，请检查输入');
        }
      } else {
        message.error(detail?.message || '操作失败，请重试');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setEditingTeacher(null);
    setInitialPassword(null);
  };

  // ── Delete ──────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await deleteTeacher(id);
      message.success('教师已停用');
      fetchList();
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { message?: string } }>;
      message.error(axiosErr.response?.data?.detail?.message || '删除失败');
    }
  };

  // ── Restore ─────────────────────────────────────
  const handleRestore = async (id: string) => {
    try {
      const res = await restoreTeacher(id);
      Modal.success({
        title: '教师已恢复',
        width: 480,
        content: (
          <div>
            <Paragraph>教师已重新启用，密码已自动重置。</Paragraph>
            <Paragraph>新初始密码：</Paragraph>
            <Text
              strong
              copyable
              style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: 2 }}
            >
              {res.new_initial_password}
            </Text>
            <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
              请将新密码告知教师，首次登录后需修改密码
            </Paragraph>
          </div>
        ),
      });
      fetchList();
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { message?: string } }>;
      message.error(axiosErr.response?.data?.detail?.message || '恢复失败');
    }
  };

  // ── Reset password ──────────────────────────────
  const handleResetPassword = async (id: string) => {
    try {
      const res = await resetTeacherPassword(id);
      Modal.success({
        title: '密码重置成功',
        width: 480,
        content: (
          <div>
            <Paragraph>新初始密码：</Paragraph>
            <Text
              strong
              copyable
              style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: 2 }}
            >
              {res.new_initial_password}
            </Text>
            <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
              请将新密码告知教师，首次登录后需修改密码
            </Paragraph>
          </div>
        ),
      });
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { message?: string } }>;
      message.error(axiosErr.response?.data?.detail?.message || '重置密码失败');
    }
  };

  // ── Table columns ───────────────────────────────
  const columns: ColumnsType<Teacher> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 140,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (phone: string) => phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) =>
        isActive ? (
          <Tag color="green">启用</Tag>
        ) : (
          <Tag color="red">停用</Tag>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_: unknown, record: Teacher) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingTeacher(record);
              setInitialPassword(null);
              setFormOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定重置该教师的密码吗？"
            description="重置后原密码失效，需将新密码告知教师"
            onConfirm={() => handleResetPassword(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={!record.is_active}
          >
            <Button
              type="link"
              size="small"
              icon={<KeyOutlined />}
              disabled={!record.is_active}
            >
              重置密码
            </Button>
          </Popconfirm>
          {record.is_active ? (
            <Popconfirm
              title="确定停用该教师吗？"
              description="停用后教师将无法登录"
              onConfirm={() => handleDelete(record.id)}
              okText="确定停用"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                停用
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="确定恢复该教师吗？"
              description="恢复后教师可以正常登录"
              onConfirm={() => handleRestore(record.id)}
              okText="确定恢复"
              cancelText="取消"
            >
              <Button type="link" size="small" icon={<UndoOutlined />}>
                恢复
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          教师管理
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingTeacher(null);
            setInitialPassword(null);
            setFormOpen(true);
          }}
        >
          新建教师
        </Button>
      </div>

      <Table<Teacher>
        rowKey="id"
        columns={columns}
        dataSource={teachers}
        loading={listLoading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        scroll={{ x: 900 }}
      />

      <TeacherForm
        open={formOpen}
        teacher={editingTeacher}
        loading={formLoading}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
        initialPassword={initialPassword}
      />
    </Card>
  );
};

export default TeachersPage;
