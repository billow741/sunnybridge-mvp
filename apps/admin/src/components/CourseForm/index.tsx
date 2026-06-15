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
import { Modal, Form, DatePicker, TimePicker, Select, Input, Spin, message } from 'antd';
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
  date: Dayjs;
  start_time: Dayjs;
  end_time: Dayjs;
  teacher_id: string;
  child_ids: string[];
  meeting_link?: string;
  status?: CourseStatus;
}

// ── Status options ───────────────────────────────

const STATUS_OPTIONS: { value: CourseStatus; label: string }[] = [
  { value: 'pending', label: '待上课' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
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
    Promise.all([getTeacherList(1, 200), getStudentList(1, 200)])
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
      .catch(() => {
        message.error('加载教师/学生列表失败，请关闭弹窗重试');
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
          date: dayjs(course.date),
          start_time: dayjs(course.start_time, 'HH:mm:ss'),
          end_time: dayjs(course.end_time, 'HH:mm:ss'),
          teacher_id: course.teacher_id,
          child_ids: course.children.map((c) => c.id),
          meeting_link: course.meeting_link || undefined,
          status: course.status,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, course, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit({
        date: values.date.format('YYYY-MM-DD'),
        start_time: values.start_time.format('HH:mm'),
        end_time: values.end_time.format('HH:mm'),
        teacher_id: values.teacher_id,
        child_ids: values.child_ids,
        // BUG-005 fix: send null when meeting_link is empty, not empty string
        meeting_link: values.meeting_link || undefined,
        // BUG-002 fix: include status in edit mode
        status: isEdit ? values.status : undefined,
      });
    } catch {
      // validation failed — antd shows field errors
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑课程' : '新建课程'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okButtonProps={{ disabled: optionsLoadError }}
      okText={isEdit ? '保存' : '创建'}
      cancelText="取消"
      destroyOnClose
      width={560}
    >
      <Spin spinning={optionsLoading} tip="加载选项数据...">
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          {/* BUG-002: Status field only in edit mode */}
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

          <Form.Item
            name="date"
            label="课程日期"
            rules={[{ required: true, message: '请选择课程日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="选择日期"
            />
          </Form.Item>

          <Form.Item
            name="start_time"
            label="开始时间"
            rules={[{ required: true, message: '请选择开始时间' }]}
          >
            <TimePicker
              style={{ width: '100%' }}
              format="HH:mm"
              placeholder="选择开始时间"
            />
          </Form.Item>

          <Form.Item
            name="end_time"
            label="结束时间"
            dependencies={['start_time']}
            rules={[
              { required: true, message: '请选择结束时间' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const startTime = getFieldValue('start_time');
                  if (!startTime || !value || value.isAfter(startTime)) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('结束时间必须晚于开始时间'));
                },
              }),
            ]}
          >
            <TimePicker
              style={{ width: '100%' }}
              format="HH:mm"
              placeholder="选择结束时间"
            />
          </Form.Item>

          <Form.Item
            name="teacher_id"
            label="授课教师"
            rules={[{ required: true, message: '请选择授课教师' }]}
          >
            <Select
              placeholder="选择教师"
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
            name="child_ids"
            label="上课学生"
            rules={[
              { required: true, message: '请至少选择一名学生' },
              {
                type: 'array',
                min: 1,
                message: '请至少选择一名学生',
              },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="选择学生（支持多选）"
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
        </Form>
      </Spin>
    </Modal>
  );
};

export default CourseForm;
