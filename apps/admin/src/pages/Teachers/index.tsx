/**
 * TeachersPage — A-TEACHER (ADMIN-02).
 *
 * 设计方案:
 * - 列表列: 教师(头像+姓名+手机号)、邮箱、状态Tag、操作
 * - 新建 → Modal → 显示初始密码 Alert
 * - 编辑 → Modal (复用表单)
 * - 删除 → Popconfirm
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Table,
  Tag,
  Space,
  Popconfirm,
  message,
  Avatar,
  Card,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import TeacherForm from '../../components/TeacherForm';
import {
  getTeacherList,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  resetTeacherPassword,
} from '../../services/teacher';
import type { Teacher } from '../../services/teacher';

const TeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [listLoading, setListLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [initialPassword, setInitialPassword] = useState<string | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ name: string; password: string } | null>(null);

  // ── Fetch ────────────────────────────────────────
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

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Create / Edit ────────────────────────────────
  const handleFormSubmit = async (values: { username: string; name: string; phone?: string; email?: string; bio?: string; hourly_rate?: number }) => {
    setFormLoading(true);
    try {
      if (editingTeacher) {
        await updateTeacher(editingTeacher.id, values);
        message.success('教师已更新');
      } else {
        const res = await createTeacher(values);
        message.success('教师创建成功');
        if (res?.initial_password) {
          setInitialPassword(res.initial_password);
        }
      }
      setFormOpen(false);
      setEditingTeacher(null);
      setPage(1);
      fetchList();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      const detail = axiosErr.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : '操作失败');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete ──────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await deleteTeacher(id);
      message.success('教师已删除');
      fetchList();
    } catch {
      message.error('删除失败');
    }
  };

  // ── Reset Password ──────────────────────────────
  const handleResetPassword = async (record: Teacher) => {
    try {
      const res = await resetTeacherPassword(record.id);
      setResetPasswordResult({ name: record.name, password: res.new_initial_password });
    } catch {
      message.error('重置密码失败');
    }
  };

  // ── Table columns ───────────────────────────────
  const columns: ColumnsType<Teacher> = [
    {
      title: '教师',
      key: 'name',
      render: (_: unknown, record: Teacher) => (
        <Space>
          <Avatar size={40} icon={<UserOutlined />} src={record.avatar_url || undefined}
            style={{ backgroundColor: '#5CAADF20', color: '#5CAADF' }}>
            {record.name?.[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{record.name}</div>
            <span style={{ fontSize: 12, color: '#999' }}>{record.phone}</span>
          </div>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      render: (v: string) => v || '—',
    },
    {
      title: '时薪',
      dataIndex: 'hourly_rate',
      key: 'hourly_rate',
      width: 100,
      render: (v: number | null) => v != null ? `¥${v}/h` : '—',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (v: boolean) => (
        <Tag color={v ? 'success' : 'error'}>{v ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: Teacher) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => { setEditingTeacher(record); setFormOpen(true); }}>
            编辑
          </Button>
          <Popconfirm title="确认重置此教师密码？将生成新的初始密码" onConfirm={() => handleResetPassword(record)} okText="重置" cancelText="取消">
            <Button type="link" size="small">重置密码</Button>
          </Popconfirm>
          <Popconfirm title="确认删除此教师？" onConfirm={() => handleDelete(record.id)} okText="删除" cancelText="取消">
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>教师管理</span>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTeacher(null); setFormOpen(true); }}>
          新建教师
        </Button>
      </div>

      {initialPassword && (
        <Alert
          type="success"
          closable
          onClose={() => setInitialPassword(null)}
          message="教师创建成功"
          description={
            <span>
              初始密码：<strong>{initialPassword}</strong>，请将此密码转交教师
            </span>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {resetPasswordResult && (
        <Alert
          type="success"
          closable
          onClose={() => setResetPasswordResult(null)}
          message={`${resetPasswordResult.name} 密码已重置`}
          description={
            <span>
              新初始密码：<strong style={{ fontFamily: 'monospace', fontSize: 16 }}>{resetPasswordResult.password}</strong>
              <br />
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>请将此密码转交教师</span>
            </span>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={teachers}
        loading={listLoading}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />

      <TeacherForm
        open={formOpen}
        teacher={editingTeacher}
        loading={formLoading}
        onSubmit={handleFormSubmit}
        onCancel={() => { setFormOpen(false); setEditingTeacher(null); }}
      />
    </Card>
  );
};

export default TeachersPage;
