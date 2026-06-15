/**
 * CoursesPage — A-COURSES (ADMIN-04).
 *
 * Features:
 * - Paginated course list (Ant Design Table)
 * - Create course → Modal form (teacher/student dropdowns)
 * - Edit course → Modal form (pre-filled)
 * - Delete course → Popconfirm → cascade delete
 *
 * Auth: relies on ADMIN-01 AuthGuard + Axios interceptor.
 * API: consumes API-06 endpoints via services/course.ts.
 * Teacher/student options: reuses ADMIN-02/03 list APIs.
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
  Tooltip,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import CourseForm from '../../components/CourseForm';
import {
  getCourseList,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../../services/course';
import type { Course, CourseStatus } from '../../services/course';

// ── Status color map ─────────────────────────────

const STATUS_CONFIG: Record<CourseStatus, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待上课' },
  completed: { color: 'green', label: '已完成' },
  cancelled: { color: 'red', label: '已取消' },
};

const CoursesPage: React.FC = () => {
  // ── List state ──────────────────────────────────
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [monthFilter, setMonthFilter] = useState<Dayjs | null>(null);
  const [listLoading, setListLoading] = useState(false);

  // ── Form modal state ────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // ── Fetch list ──────────────────────────────────
  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const month = monthFilter ? monthFilter.format('YYYY-MM') : undefined;
      const res = await getCourseList(page, pageSize, month);
      setCourses(res.items);
      setTotal(res.total);
    } catch {
      message.error('获取课程列表失败');
    } finally {
      setListLoading(false);
    }
  }, [page, pageSize, monthFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // ── Create / Edit submit ────────────────────────
  const handleFormSubmit = async (values: {
    date: string;
    start_time: string;
    end_time: string;
    teacher_id: string;
    child_ids: string[];
    meeting_link?: string;
    status?: CourseStatus;
  }) => {
    setFormLoading(true);
    try {
      if (editingCourse) {
        // Edit mode — only send changed fields (diff) to avoid unnecessary child_ids replacement
        const changed: { date?: string; start_time?: string; end_time?: string; teacher_id?: string; child_ids?: string[]; meeting_link?: string | null; status?: CourseStatus } = {};

        const origDate = editingCourse.date;
        const origStartTime = editingCourse.start_time.substring(0, 5);
        const origEndTime = editingCourse.end_time.substring(0, 5);
        const origTeacherId = editingCourse.teacher_id;
        const origChildIds = editingCourse.children.map((c) => c.id).sort().join(',');
        const origMeetingLink = editingCourse.meeting_link || '';
        const origStatus = editingCourse.status;

        if (values.date !== origDate) changed.date = values.date;
        if (values.start_time !== origStartTime) changed.start_time = values.start_time;
        if (values.end_time !== origEndTime) changed.end_time = values.end_time;
        if (values.teacher_id !== origTeacherId) changed.teacher_id = values.teacher_id;
        if ([...values.child_ids].sort().join(',') !== origChildIds) changed.child_ids = values.child_ids;
        // BUG-005 fix: send null when meeting_link is cleared, not empty string
        if ((values.meeting_link || '') !== origMeetingLink) changed.meeting_link = values.meeting_link || null;
        // BUG-002 fix: include status in diff
        if (values.status && values.status !== origStatus) changed.status = values.status;

        if (Object.keys(changed).length === 0) {
          message.info('没有修改');
          setFormOpen(false);
          setEditingCourse(null);
          return;
        }

        await updateCourse(editingCourse.id, changed);
        message.success('课程已更新');
        setFormOpen(false);
        setEditingCourse(null);
        fetchList();
      } else {
        // Create mode
        await createCourse(values);
        message.success('课程创建成功');
        setFormOpen(false);
        setPage(1); // jump back to page 1 to see new record
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { code?: string; message?: string } }>;
      const detail = axiosErr.response?.data?.detail;
      if (axiosErr.response?.status === 404) {
        const code = detail?.code;
        if (code === 'TEACHER_NOT_FOUND') {
          message.error('所选教师不存在，请刷新后重试');
        } else if (code === 'CHILD_NOT_FOUND') {
          message.error('所选学生不存在，请刷新后重试');
        } else {
          message.error(detail?.message || '资源不存在');
        }
      } else if (axiosErr.response?.status === 422) {
        // Backend CourseCreate validator: start_time >= end_time
        message.error(detail?.message || '数据格式错误，请检查时间是否合法');
      } else {
        message.error(detail?.message || '操作失败，请重试');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setEditingCourse(null);
  };

  // ── Delete ──────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await deleteCourse(id);
      message.success('课程已删除');
      fetchList();
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { message?: string } }>;
      message.error(axiosErr.response?.data?.detail?.message || '删除失败');
    }
  };

  // ── Table columns ───────────────────────────────
  const columns: ColumnsType<Course> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 90,
      render: (v: string) => v.substring(0, 5), // HH:mm
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      width: 90,
      render: (v: string) => v.substring(0, 5), // HH:mm
    },
    {
      title: '授课教师',
      key: 'teacher',
      width: 120,
      render: (_: unknown, record: Course) => record.teacher?.name || '—',
    },
    {
      title: '上课学生',
      key: 'children',
      width: 160,
      render: (_: unknown, record: Course) => {
        if (!record.children || record.children.length === 0) return '—';
        const names = record.children.map((c) => c.name).join('、');
        // If too long, show count with tooltip
        if (names.length > 15) {
          return (
            <Tooltip title={names}>
              {record.children.length} 名学生
            </Tooltip>
          );
        }
        return names;
      },
    },
    {
      title: '会议链接',
      dataIndex: 'meeting_link',
      key: 'meeting_link',
      width: 80,
      render: (v: string | null) =>
        v ? (
          <Tooltip title={v}>
            <a href={v} target="_blank" rel="noopener noreferrer">
              <LinkOutlined /> 链接
            </a>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: CourseStatus) => {
        const cfg = STATUS_CONFIG[status] || { color: 'default', label: status };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: Course) => {
        const isEditable = record.status === 'pending';
        return (
          <Space size="small">
            <Tooltip title={!isEditable ? '已完成或已取消的课程不可编辑' : undefined}>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                disabled={!isEditable}
                onClick={() => {
                  setEditingCourse(record);
                  setFormOpen(true);
                }}
              >
                编辑
              </Button>
            </Tooltip>
            <Popconfirm
              title="确定删除该课程？"
              description="此操作不可撤销，课程及关联的学生选课和反馈数据将被彻底删除"
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
        );
      },
    },
  ];

  // ── Render ──────────────────────────────────────
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            课程管理
          </Typography.Title>
          <DatePicker
            picker="month"
            placeholder="筛选月份"
            value={monthFilter}
            onChange={(val) => {
              setMonthFilter(val);
              setPage(1);
            }}
            allowClear
            style={{ width: 160 }}
          />
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingCourse(null);
            setFormOpen(true);
          }}
        >
          新建课程
        </Button>
      </div>

      <Table<Course>
        rowKey="id"
        columns={columns}
        dataSource={courses}
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
        scroll={{ x: 1200 }}
      />

      <CourseForm
        open={formOpen}
        course={editingCourse}
        loading={formLoading}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
      />
    </Card>
  );
};

export default CoursesPage;
