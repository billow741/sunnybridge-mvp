/**
 * StudentsPage — A-STUDENTS (ADMIN-03).
 *
 * Features:
 * - Paginated student list (Ant Design Table)
 * - Create student → Modal form → parent_phone auto-find/create parent
 * - Edit student → Modal form (pre-filled)
 * - Delete student → Popconfirm → confirm
 *
 * Auth: relies on ADMIN-01 AuthGuard + Axios interceptor.
 * API: consumes API-05 endpoints via services/student.ts.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Table,
  Tag,
  Space,
  Popconfirm,
  message,
  Typography,
  Card,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import StudentForm from '../../components/StudentForm';
import {
  getStudentList,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../../services/student';
import type { Student, StudentUpdateParams, Level } from '../../services/student';

const LEVEL_COLORS: Record<string, string> = {
  L1: 'green',
  L2: 'cyan',
  L3: 'blue',
  L4: 'purple',
  L5: 'orange',
  L6: 'red',
};

const StudentsPage: React.FC = () => {
  // ── List state ──────────────────────────────────
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [listLoading, setListLoading] = useState(false);

  // ── Form modal state ────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // ── Fetch list ──────────────────────────────────
  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await getStudentList(page, pageSize);
      setStudents(res.items);
      setTotal(res.total);
    } catch {
      message.error('获取学生列表失败');
    } finally {
      setListLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // ── Create / Edit submit ────────────────────────
  const handleFormSubmit = async (values: {
    name: string;
    parent_phone: string;
    english_name?: string;
    birth_date?: string;
    level?: Level;
  }) => {
    setFormLoading(true);
    try {
      if (editingStudent) {
        // BUG-001 fix: Edit mode — only send changed fields (diff)
        const originalPhone = editingStudent.parent?.phone || '';
        const changed: StudentUpdateParams = {};
        if (values.name !== editingStudent.name) changed.name = values.name;
        if ((values.english_name || undefined) !== (editingStudent.english_name || undefined)) {
          changed.english_name = values.english_name;
        }
        if ((values.birth_date || undefined) !== (editingStudent.birth_date || undefined)) {
          changed.birth_date = values.birth_date;
        }
        if ((values.level || undefined) !== (editingStudent.level || undefined)) {
          changed.level = values.level;
        }
        if (values.parent_phone !== originalPhone) {
          changed.parent_phone = values.parent_phone;
        }

        if (Object.keys(changed).length === 0) {
          message.info('没有修改');
          setFormOpen(false);
          setEditingStudent(null);
          return;
        }

        await updateStudent(editingStudent.id, changed);
        message.success('学生信息已更新');
        setFormOpen(false);
        setEditingStudent(null);
        fetchList();
      } else {
        // Create mode
        await createStudent(values);
        message.success('学生创建成功');
        setFormOpen(false);
        // BUG-002 fix: jump back to page 1 so admin sees the new record
        setPage(1);
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { code?: string; message?: string } }>;
      const detail = axiosErr.response?.data?.detail;
      if (axiosErr.response?.status === 409) {
        const code = detail?.code;
        if (code === 'CHILD_PARENT_DUPLICATE' || code === 'PARENT_ALREADY_HAS_CHILD') {
          message.error('该家长已关联一个学生，一个家长只能有一个孩子');
        } else if (code === 'INVALID_PARENT_ROLE') {
          message.error(detail?.message || '该手机号无法作为家长关联');
        } else {
          message.error(detail?.message || '数据冲突，请检查输入');
        }
      } else if (axiosErr.response?.status === 422) {
        message.error(detail?.message || '数据格式错误，请检查输入');
      } else {
        message.error(detail?.message || '操作失败，请重试');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setEditingStudent(null);
  };

  // ── Delete ──────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await deleteStudent(id);
      message.success('学生已删除');
      fetchList();
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { message?: string } }>;
      message.error(axiosErr.response?.data?.detail?.message || '删除失败');
    }
  };

  // ── Table columns ───────────────────────────────
  const columns: ColumnsType<Student> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '英文名',
      dataIndex: 'english_name',
      key: 'english_name',
      width: 100,
      render: (v: string | null) => v || '—',
    },
    {
      title: '出生日期',
      dataIndex: 'birth_date',
      key: 'birth_date',
      width: 120,
      render: (v: string | null) => (v ? new Date(v).toLocaleDateString('zh-CN') : '—'),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 70,
      render: (level: Level | null) => (
        <Tag color={level ? LEVEL_COLORS[level] || 'default' : 'default'}>
          {level || '—'}
        </Tag>
      ),
    },
    {
      title: '家长手机号',
      key: 'parent_phone',
      width: 140,
      render: (_: unknown, record: Student) => {
        const phone = record.parent?.phone;
        if (!phone) return '—';
        return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: Student) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingStudent(record);
              setFormOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="永久删除该学生？"
            description="此操作不可撤销，学生数据将从数据库中彻底删除"
            onConfirm={() => handleDelete(record.id)}
            okText="确定删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          学生管理
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingStudent(null);
            setFormOpen(true);
          }}
        >
          新建学生
        </Button>
      </div>

      <Table<Student>
        rowKey="id"
        columns={columns}
        dataSource={students}
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

      <StudentForm
        open={formOpen}
        student={editingStudent}
        loading={formLoading}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
      />
    </Card>
  );
};

export default StudentsPage;
