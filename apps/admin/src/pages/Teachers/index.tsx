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
  const handleFormSubmit = async (values: { name: string; phone: string; email?: string; bio?: string }) => {
    setFormLoading(true);
    try {
      if (editingTeacher) {
        await updateTeacher(editingTeacher.id, values);
        message.success('教师已更新');
      } else {
        const createParams: { username: string; phone: string; name: string } = { ...values, username: values.phone };
        const res = await createTeacher(createParams);
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

  // ── Table columns ───────────────────────────────
  const columns: ColumnsType<Teacher> = [
    {
      title: '教师',
      key: 'name',
      render: (_: unknown, record: Teacher) => (
        <Space>
          <Avatar size={40} icon={<UserOutlined />} src={record.avatar_url || undefined}
            style={{ backgroundColor: '#5AA0DC20', color: '#5AA0DC' }}>
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
