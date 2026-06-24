/**
 * CourseForm — A-COURSE-FORM Modal (create / edit reuse).
 *
 * ADMIN-04 scope:
 * - Create: POST /courses → date + start_time + end_time + teacher_id + child_ids + meeting_link
 * - Edit: PUT /courses/:id → same fields + status
 *
 * Validation rules per API-06 CourseCreate/CourseUpdate schema:
 * - date: required
 * - start_time: required
 * - end_time: required, must be after start_time
 * - teacher_id: required
 * - child_ids: required, at least 1 student, no duplicates
 * - meeting_link: optional, URL format if provided
 * - status: only shown in edit mode, required when editing
 *
 * Teacher options: GET /teachers (is_active=true only)
 * Student options: GET /children (all)
 */

import React, { useEffect, useState } from 'react';
import { Modal, Form, DatePicker, TimePicker, Select, Input, InputNumber, Spin, message, Card, Space, Button } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { Course, CourseStatus } from '../../services/course';
import { getTeacherList } from '../../services/teacher';
import { getStudentList } from '../../services/student';
import type { Teacher } from '../../services/teacher';
import type { Student } from '../../services/student';

// ── Option types ─────────────────────────────────

interface TeacherOption {
  value: string;
  label: string;
}

interface StudentOption {
  value: string;
  label: string;
}

// ── Form values ──────────────────────────────────

export interface CourseFormValues {
  // 基本信息
  name: string;
  description?: string;
  course_type: string;
  status?: CourseStatus;
  hours?: number;
  // 排课信息
  teacher_id: string;
  child_id: string;
  start_date: Dayjs;
  end_date?: Dayjs;
  time_range: [Dayjs, Dayjs];
  meeting_link?: string;
}

// ── Status options ───────────────────────────────

const STATUS_OPTIONS: { value: CourseStatus; label: string }[] = [
  { value: 'pending', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const COURSE_TYPE_OPTIONS = [
  { value: 'reading', label: '阅读课' },
];

// ── Props ────────────────────────────────────────

interface CourseFormProps {
  open: boolean;
  course: Course | null; // null = create mode, non-null = edit mode
  loading: boolean;
  onSubmit: (values: {
    date: string;
    start_time: string;
    end_time: string;
    teacher_id: string;
    child_ids: string[];
    meeting_link?: string;
    status?: CourseStatus;
    hours?: number;
  }) => void;
  onCancel: () => void;
}

const CourseForm: React.FC<CourseFormProps> = ({
  open,
  course,
  loading,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm<CourseFormValues>();
  const isEdit = course !== null;

  // Options state
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsLoadError, setOptionsLoadError] = useState(false);

  // Load teacher + student options when modal opens
  useEffect(() => {
    if (!open) return;

    setOptionsLoadError(false);
    setOptionsLoading(true);
    Promise.all([getTeacherList(1, 100), getStudentList(1, 100)])
      .then(([teacherRes, studentRes]) => {
        // Filter only active teachers
        const activeTeachers = teacherRes.items.filter((t: Teacher) => t.is_active);
        setTeacherOptions(
          activeTeachers.map((t) => ({
            value: t.id,
            label: `${t.name} (${t.username})`,
          })),
        );
        setStudentOptions(
          studentRes.items.map((s: Student) => ({
            value: s.id,
            label: s.name,
          })),
        );
      })
      .catch((err) => {
        console.error('加载教师/学生列表失败:', err?.response?.data || err);
        const detail = err?.response?.data?.detail?.[0]?.msg || err.message || '未知错误';
        message.error(`加载教师/学生列表失败: ${detail}`);
        setOptionsLoadError(true);
      })
      .finally(() => {
        setOptionsLoading(false);
      });
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (course) {
        form.setFieldsValue({
          // 基本信息
          name: `阅读课 - ${dayjs(course.date).format('YYYY-MM-DD')}`,
          description: '',
          course_type: 'reading',
          status: course.status,
          hours: course.hours ?? 1,
          // 排课信息
          teacher_id: course.teacher_id,
          child_id: course.students[0]?.id || '',
          start_date: dayjs(course.date),
          end_date: undefined,
          time_range: [
            dayjs(course.start_time, 'HH:mm:ss'),
            dayjs(course.end_time, 'HH:mm:ss'),
          ],
          meeting_link: course.meeting_link || undefined,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          course_type: 'reading',
        });
      }
    }
  }, [open, course, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit({
        date: values.start_date.format('YYYY-MM-DD'),
        start_time: values.time_range[0].format('HH:mm'),
        end_time: values.time_range[1].format('HH:mm'),
        teacher_id: values.teacher_id,
        child_ids: [values.child_id],
        meeting_link: values.meeting_link || undefined,
        status: isEdit ? values.status : undefined,
        hours: values.hours,
      });
    } catch {
      // validation failed — antd shows field errors
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑课程' : '新建课程'}
      open={open}
      onCancel={onCancel}
      width={560}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button onClick={onCancel}>取消</Button>
          <Button
            type="primary"
            loading={loading}
            disabled={optionsLoadError}
            onClick={handleOk}
          >
            保存
          </Button>
        </div>
      }
      destroyOnClose
    >
      <Spin spinning={optionsLoading} tip="加载选项数据...">
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
          style={{ marginTop: 8 }}
        >
          {/* ── 基本信息 ─────────────────────────────── */}
          <Card
            title="基本信息"
            size="small"
            style={{ marginBottom: 16 }}
            bodyStyle={{ padding: 16 }}
          >
            <Form.Item
              name="name"
              label="课程名称"
              rules={[{ required: true, message: '请输入课程名称' }]}
            >
              <Input placeholder="请输入课程名称" />
            </Form.Item>

            <Form.Item
              name="description"
              label="课程描述"
            >
              <Input.TextArea rows={3} placeholder="请输入课程描述" />
            </Form.Item>

            <Form.Item
              name="course_type"
              label="课程类型"
              rules={[{ required: true, message: '请选择课程类型' }]}
            >
              <Select placeholder="选择课程类型">
                {COURSE_TYPE_OPTIONS.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {/* Status field only in edit mode */}
            {isEdit && (
              <Form.Item
                name="status"
                label="课程状态"
                rules={[{ required: true, message: '请选择课程状态' }]}
              >
                <Select placeholder="选择状态">
                  {STATUS_OPTIONS.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}
          </Card>

          {/* ── 排课信息 ─────────────────────────────── */}
          <Card
            title="排课信息"
            size="small"
            style={{ marginBottom: 16 }}
            bodyStyle={{ padding: 16 }}
          >
            <Form.Item
              name="teacher_id"
              label="授课教师"
              rules={[{ required: true, message: '请选择授课教师' }]}
            >
              <Select
                placeholder="搜索教师..."
                showSearch
                optionFilterProp="label"
                loading={optionsLoading}
                notFoundContent={optionsLoadError ? '加载失败，请关闭重试' : '暂无教师'}
              >
                {teacherOptions.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value} label={opt.label}>
                    {opt.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="child_id"
              label="上课学生"
              rules={[{ required: true, message: '请选择学生' }]}
            >
              <Select
                placeholder="选择学生（1v1）"
                showSearch
                optionFilterProp="label"
                loading={optionsLoading}
                notFoundContent={optionsLoadError ? '加载失败，请关闭重试' : '暂无学生'}
              >
                {studentOptions.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value} label={opt.label}>
                    {opt.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Space direction="vertical" style={{ display: 'flex' }}>
              <Form.Item
                name="start_date"
                label="开始日期"
                rules={[{ required: true, message: '请选择开始日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="选择开始日期"
                />
              </Form.Item>

              <Form.Item
                name="end_date"
                label="结束日期"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="选择结束日期"
                />
              </Form.Item>
            </Space>

            <Form.Item
              name="time_range"
              label="上课时间"
              rules={[{ required: true, message: '请选择上课时间' }]}
            >
              <TimePicker.RangePicker
                style={{ width: '100%' }}
                format="HH:mm"
                placeholder={['开始时间', '结束时间']}
              />
            </Form.Item>
          </Card>

          {/* 保留 meeting_link 在排课信息末尾 */}
          <Form.Item
            name="meeting_link"
            label="腾讯会议链接"
            rules={[
              {
                pattern: /^https?:\/\/.+|^wemeet:\/\/.+/i,
                message: '请输入有效的链接（https:// 或 wemeet://）',
              },
            ]}
          >
            <Input placeholder="如: https://meeting.tencent.com/..." allowClear />
          </Form.Item>

          <Form.Item label="消耗课时" name="hours" tooltip="本次课程消耗的课时数，默认1">
            <InputNumber min={0} step={0.5} precision={1} style={{ width: '100%' }} placeholder="默认1课时" />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default CourseForm;
