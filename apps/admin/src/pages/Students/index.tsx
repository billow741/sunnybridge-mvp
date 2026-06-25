/**
 * StudentsPage — A-STUDENT (ADMIN-03).
 *
 * 设计方案:
 * - 列表列: 学生(头像+姓名+手机号)、年级、家长电话、状态Tag、操作
 * - 新建/编辑 → StudentForm Modal
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
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import StudentForm from '../../components/StudentForm';
import {
  getStudentList,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../../services/student';
import type { Student, Level } from '../../services/student';

const LEVEL_GRADE_MAP: Record<string, string> = {
  starter: "入门", A1: "基础", A2: "进阶",
  B1: "中级", B2: "高级", C1: "精通", C2: "精通+",
};

const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [listLoading, setListLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // ── Fetch ────────────────────────────────────────
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

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Create / Edit ────────────────────────────────
  const handleFormSubmit = async (values: { name: string; parent_phone: string; english_name?: string; birth_date?: string; level?: Level; totalhours?: number; usedhours?: number }) => {
    setFormLoading(true);
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, values);
        message.success('学生已更新');
      } else {
        await createStudent(values);
        message.success('学生创建成功');
      }
      setFormOpen(false);
      setEditingStudent(null);
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
      await deleteStudent(id);
      message.success('学生已删除');
      fetchList();
    } catch {
      message.error('删除失败');
    }
  };

  // ── Table columns ───────────────────────────────
  const columns: ColumnsType<Student> = [
    {
      title: '学生',
      key: 'name',
      render: (_: unknown, record: Student) => (
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
      title: '年级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => LEVEL_GRADE_MAP[level] || level || '—',
    },
    {
      title: '课时余额',
      key: 'hours',
      width: 120,
      render: (_: unknown, record: Student) => {
        const remaining = record.remaining_hours ?? 0;
        const totalHours = record.totalhours ?? 0;
        const usedHours = record.usedhours ?? 0;
        
        let color = 'green';
        if (remaining <= 5) {
          color = 'red';
        } else if (remaining <= 10) {
          color = 'orange';
        }
        
        const tooltipText = `总课时: ${totalHours}, 已用: ${usedHours}, 余额: ${remaining}`;
        
        return (
          <Tooltip title={tooltipText}>
            <Tag color={color}>{remaining}/{totalHours}</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '家长电话',
      dataIndex: 'parent_phone',
      key: 'parent_phone',
      width: 130,
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
      render: (_: unknown, record: Student) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => { setEditingStudent(record); setFormOpen(true); }}>
            编辑
          </Button>
          <Popconfirm title="确认删除此学生？" onConfirm={() => handleDelete(record.id)} okText="删除" cancelText="取消">
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>学生管理</span>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingStudent(null); setFormOpen(true); }}>
          新建学生
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={students}
        loading={listLoading}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />

      <StudentForm
        open={formOpen}
        student={editingStudent}
        loading={formLoading}
        onSubmit={handleFormSubmit}
        onCancel={() => { setFormOpen(false); setEditingStudent(null); }}
      />
    </Card>
  );
};

export default StudentsPage;
