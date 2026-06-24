/**
 * CoursesPage — A-COURSE (ADMIN-04).
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
  Card,
  DatePicker,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
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

interface StatusConfig {
  color: 'gold' | 'blue' | 'green' | 'red' | string;
  label: string;
}

const STATUS_CONFIG: Record<CourseStatus, StatusConfig> = {
  pending: { color: 'blue', label: '进行中' },
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
    hours?: number;
  }) => {
    setFormLoading(true);
    try {
      if (editingCourse) {
        // Edit mode — only send changed fields (diff) to avoid unnecessary child_ids replacement
        const changed: { date?: string; start_time?: string; end_time?: string; teacher_id?: string; child_ids?: string[]; meeting_link?: string | null; status?: CourseStatus; hours?: number } = {};

        const origDate = editingCourse.date;
        const origStartTime = editingCourse.start_time.substring(0, 5);
        const origEndTime = editingCourse.end_time.substring(0, 5);
        const origTeacherId = editingCourse.teacher_id;
        const origChildIds = editingCourse.students.map((c) => c.id).sort().join(',');
        const origMeetingLink = editingCourse.meeting_link || '';
        const origStatus = editingCourse.status;

        if (values.date !== origDate) changed.date = values.date;
        if (values.start_time !== origStartTime) changed.start_time = values.start_time;
        if (values.end_time !== origEndTime) changed.end_time = values.end_time;
        if (values.teacher_id !== origTeacherId) changed.teacher_id = values.teacher_id;
        if ([...values.child_ids].sort().join(',') !== origChildIds) changed.child_ids = values.child_ids;
        if ((values.meeting_link || '') !== origMeetingLink) changed.meeting_link = values.meeting_link || null;
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
      title: '课程名称',
      key: 'name',
      width: 240,
      render: (_: unknown, record: Course) => (
        <div>
          <span style={{ fontWeight: 'bold', display: 'block' }}>
            {dayjs(record.date).format('YYYY-MM-DD')} 阅读课
          </span>
          <span style={{ fontSize: 12, color: '#999' }}>
            阅读课
          </span>
        </div>
      ),
    },
    {
      title: '教师',
      key: 'teacher',
      width: 120,
      render: (_: unknown, record: Course) => {
        const teacher = record.teacher;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar
              size={32}
              src={undefined}
              style={{ backgroundColor: '#5AA0DC', flexShrink: 0 }}
            >
              {teacher?.name?.[0] || '?'}
            </Avatar>
            <span>{teacher?.name || '—'}</span>
          </div>
        );
      },
    },
    {
      title: '学生',
      key: 'students',
      width: 120,
      render: (_: unknown, record: Course) => {
        const student = record.students?.[0];
        if (!student) return <span>—</span>;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar
              size={32}
              src={undefined}
              style={{ backgroundColor: '#52C41A', flexShrink: 0 }}
            >
              {student.name?.[0] || '?'}
            </Avatar>
            <span>{student.name}</span>
          </div>
        );
      },
    },
    {
      title: '上课时间',
      key: 'schedule',
      width: 160,
      render: (_: unknown, record: Course) => {
        const start = record.start_time.substring(0, 5);
        const end = record.end_time.substring(0, 5);
        return (
        <span>
            {dayjs(record.date).format('YYYY-MM-DD')} {start}-{end}
        </span>
        );
      },
    },
    {
      title: '课程状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: CourseStatus) => {
        const cfg = STATUS_CONFIG[status] || { color: 'default', label: status };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '课时',
      dataIndex: 'hours',
      key: 'hours',
      width: 80,
      align: 'center',
      render: (v: number) => v != null ? `${v}h` : '1h',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: Course) => {
        const isEditable = record.status === 'pending';
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              disabled={!isEditable}
              onClick={() => {
                setEditingCourse(record);
                setFormOpen(true);
              }}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定删除该课程？"
              description="此操作不可撤销，课程及关联的学生选课和反馈数据将被彻底删除"
              onConfirm={() => handleDelete(record.id)}
              okText="确定删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger>
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
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
        scroll={{ x: 800 }}
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
