/**
 * CourseScheduleDrawer — 排课核心组件
 *
 * 通用排课 Drawer，支持：
 * - 新建课程（可预填学员/教师/日期/时间）
 * - 编辑课程（预填所有字段 + exclude_course_id 冲突检测）
 * - 实时冲突检测（教师时间重叠 + 学员时间重叠）
 * - 学员课时余额 + 风险提示
 * - 取消课程（改状态为 cancelled）
 *
 * 用法：
 * <CourseScheduleDrawer
 *   open={open}
 *   onClose={onClose}
 *   editingCourse={course | null}   // null=新建, 有值=编辑
 *   prefill={{ child_id, teacher_id, date, start_time, end_time }}
 *   onSuccess={() => { load(); }}
 * />
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Drawer, Form, Select, DatePicker, TimePicker, InputNumber,
  Input, Button, Space, Alert, Descriptions, Row, Col, Statistic,
  Tag, Divider, message, Tooltip, Popconfirm, Typography,
} from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, WarningOutlined,
  ExclamationCircleOutlined, CheckCircleOutlined, UserOutlined,
  SwapOutlined, CloseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';

const { Text } = Typography;

// ── 类型 ──────────────────────────────
interface Prefill {
  child_id?: string;
  teacher_id?: string;
  date?: string;       // YYYY-MM-DD
  start_time?: string; // HH:mm
  end_time?: string;   // HH:mm
}

interface CourseData {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  teacher_id?: string;
  status: string;
  hours?: number;
  meeting_link?: string;
  students?: { id: string; name: string }[];
}

interface ConflictItem {
  course_id: string;
  date: string;
  start_time: string;
  end_time: string;
  teacher_name?: string;
  child_name?: string;
  conflict_type: 'teacher_conflict' | 'student_conflict';
}

interface StudentHourInfo {
  id: string;
  name: string;
  remaining: number;
  hours_after: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  editingCourse: CourseData | null;
  prefill?: Prefill;
  onSuccess: () => void;
}

// ── 语义色 ────────────────────────────
const hoursColor = (h: number) =>
  h <= 0 ? '#ff4d4f' : h <= 2 ? '#F4A230' : h <= 5 ? '#e6a817' : '#52c41a';

export default function CourseScheduleDrawer({ open, onClose, editingCourse, prefill, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<{ id: string; name: string; hourly_rate?: number }[]>([]);
  const [studentOptions, setStudentOptions] = useState<{ id: string; name: string; remaining_hours?: number; totalhours?: number; usedhours?: number }[]>([]);

  // 冲突检测状态
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [studentHours, setStudentHours] = useState<StudentHourInfo[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEdit = !!editingCourse;
  const isCompleted = editingCourse?.status === 'completed';
  const isCancelled = editingCourse?.status === 'cancelled';

  // ── 加载选项 ────────────────────────
  const loadOptions = useCallback(async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        client.get('/teachers', { params: { page: 1, page_size: 100 } }),
        client.get('/children', { params: { page: 1, page_size: 100 } }),
      ]);
      setTeacherOptions((tRes.data.items || tRes.data || []).map((t: any) => ({
        id: t.id, name: t.name, hourly_rate: t.hourly_rate,
      })));
      setStudentOptions((sRes.data.items || sRes.data || []).map((s: any) => ({
        id: s.id, name: s.name,
        remaining_hours: s.remaining_hours ?? ((s.totalhours ?? 0) - (s.usedhours ?? 0)),
        totalhours: s.totalhours, usedhours: s.usedhours,
      })));
    } catch { /* 静默 */ }
  }, []);

  // ── Drawer打开时初始化 ──────────────
  useEffect(() => {
    if (!open) return;
    loadOptions();
    setConflicts([]);
    setStudentHours([]);
    if (editingCourse) {
      // 编辑模式：预填字段
      const childIds = editingCourse.students?.map(s => s.id) || [];
      form.setFieldsValue({
        teacher_id: editingCourse.teacher_id,
        child_ids: childIds,
        date: dayjs(editingCourse.date),
        start_time: dayjs(editingCourse.start_time, 'HH:mm'),
        end_time: dayjs(editingCourse.end_time, 'HH:mm'),
        hours: editingCourse.hours || 1,
        meeting_link: editingCourse.meeting_link,
      });
    } else {
      // 新建模式：用 prefill
      form.resetFields();
      const init: Record<string, any> = { hours: 1 };
      if (prefill?.teacher_id) init.teacher_id = prefill.teacher_id;
      if (prefill?.child_id) init.child_ids = [prefill.child_id];
      if (prefill?.date) init.date = dayjs(prefill.date);
      if (prefill?.start_time) init.start_time = dayjs(prefill.start_time, 'HH:mm');
      if (prefill?.end_time) init.end_time = dayjs(prefill.end_time, 'HH:mm');
      form.setFieldsValue(init);
    }
  }, [open, editingCourse, prefill, form, loadOptions]);

  // ── 冲突检测（防抖500ms）──────────
  const doCheckConflicts = useCallback(async () => {
    try {
      const values = form.getFieldsValue();
      const date = values.date?.format('YYYY-MM-DD');
      const startTime = values.start_time?.format('HH:mm');
      const endTime = values.end_time?.format('HH:mm');
      const teacherId = values.teacher_id;
      const childIds = values.child_ids || [];

      if (!date || !startTime || !endTime || (!teacherId && childIds.length === 0)) {
        setConflicts([]);
        setStudentHours([]);
        return;
      }

      setCheckingConflicts(true);
      const { data: res } = await client.post('/courses/check-conflicts', {
        date,
        start_time: startTime,
        end_time: endTime,
        teacher_id: teacherId || null,
        child_ids: childIds,
        exclude_course_id: editingCourse?.id || null,
      });
      setConflicts(res.conflicts || []);
      setStudentHours(res.student_hours || []);
    } catch {
      // 冲突检测失败不阻塞
    } finally {
      setCheckingConflicts(false);
    }
  }, [form, editingCourse]);

  // 表单值变化时触发防抖检测
  const onFormChange = useCallback(() => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(doCheckConflicts, 500);
  }, [doCheckConflicts]);

  // ── 提交（新建/编辑）───────────────
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        date: values.date?.format('YYYY-MM-DD'),
        start_time: values.start_time?.format('HH:mm'),
        end_time: values.end_time?.format('HH:mm'),
        teacher_id: values.teacher_id,
        child_ids: values.child_ids || [],
        hours: values.hours ?? 1,
        meeting_link: values.meeting_link || null,
        status: editingCourse?.status, // 编辑时保持原状态
      };

      if (editingCourse) {
        await client.put(`/courses/${editingCourse.id}`, payload);
        message.success('课程已更新');
      } else {
        await client.post('/courses', { ...payload, status: 'pending' });
        message.success('排课成功');
      }
      setSubmitting(false);
      onClose();
      onSuccess();
    } catch (err: any) {
      if (err?.errorFields) return; // AntD校验
      message.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── 取消课程 ──
  const handleCancel = async () => {
    if (!editingCourse) return;
    try {
      await client.put(`/courses/${editingCourse.id}`, { status: 'cancelled' });
      message.success('课程已取消');
      onClose();
      onSuccess();
    } catch (err) {
      message.error(extractError(err));
    }
  };

  // ── 冲突提示渲染 ──
  const renderConflicts = () => {
    if (conflicts.length === 0 && studentHours.length === 0) return null;

    const teacherConflicts = conflicts.filter(c => c.conflict_type === 'teacher_conflict');
    const studentConflicts = conflicts.filter(c => c.conflict_type === 'student_conflict');
    const lowHours = studentHours.filter(s => s.hours_after <= 2);

    return (
      <div style={{ marginTop: 12 }}>
        {/* 教师冲突 */}
        {teacherConflicts.length > 0 && (
          <Alert
            type="error"
            showIcon
            icon={<WarningOutlined />}
            message="教师时间冲突"
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {teacherConflicts.map((c, i) => (
                  <li key={i}>
                    {c.teacher_name} 已有课程 {c.start_time?.slice(0,5)}-{c.end_time?.slice(0,5)}
                  </li>
                ))}
              </ul>
            }
            style={{ marginBottom: 8 }}
          />
        )}

        {/* 学员冲突 */}
        {studentConflicts.length > 0 && (
          <Alert
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
            message="学员时间冲突"
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {studentConflicts.map((c, i) => (
                  <li key={i}>
                    {c.child_name} 已有课程 {c.start_time?.slice(0,5)}-{c.end_time?.slice(0,5)}
                  </li>
                ))}
              </ul>
            }
            style={{ marginBottom: 8 }}
          />
        )}

        {/* 学员课时余额 */}
        {studentHours.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #fffbe6 100%)',
            borderRadius: 10, padding: 14, border: '1px solid #e6f4ff', marginBottom: 8,
          }}>
            <Text strong style={{ fontSize: 13 }}>
              <ClockCircleOutlined style={{ color: '#5CAADF', marginRight: 4 }} />
              学员课时余额
            </Text>
            <Row gutter={8} style={{ marginTop: 8 }}>
              {studentHours.map(s => (
                <Col key={s.id} span={studentHours.length === 1 ? 24 : 12}>
                  <div style={{
                    background: '#fff', borderRadius: 8, padding: '8px 12px',
                    border: `1px solid ${s.hours_after <= 0 ? '#ffccc7' : s.hours_after <= 2 ? '#ffe58f' : '#e6f4ff'}`,
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{s.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: '#666' }}>剩余</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: hoursColor(s.remaining), fontVariantNumeric: 'tabular-nums' }}>
                        {s.remaining}h
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: '#666' }}>排课后</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: hoursColor(s.hours_after), fontVariantNumeric: 'tabular-nums' }}>
                        {s.hours_after}h
                      </span>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* 高风险提醒 */}
        {lowHours.length > 0 && (
          <Alert
            type="error"
            showIcon
            message={`⚠️ ${lowHours.map(s => s.name).join('、')} 排课后课时将${lowHours.some(s => s.hours_after <= 0) ? '变为负数' : '不足 2h'}，请留意续费`}
            style={{ marginBottom: 8 }}
          />
        )}

        {/* 无冲突提示 */}
        {conflicts.length === 0 && studentHours.length > 0 && lowHours.length === 0 && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="无时间冲突，课时充足"
            style={{ marginBottom: 8 }}
          />
        )}
      </div>
    );
  };

  // ── 计算hours建议 ──
  const calcSuggestedHours = () => {
    const st = form.getFieldValue('start_time');
    const et = form.getFieldValue('end_time');
    if (!st || !et) return;
    const sMin = st.hour() * 60 + st.minute();
    const eMin = et.hour() * 60 + et.minute();
    const hours = (eMin - sMin) / 60;
    if (hours > 0 && hours !== form.getFieldValue('hours')) {
      form.setFieldsValue({ hours: Math.round(hours * 10) / 10 });
    }
  };

  const drawerTitle = isEdit
    ? (isCompleted ? '查看课程' : isCancelled ? '已取消课程' : '编辑课程')
    : '排课';

  return (
    <Drawer
      title={
        <Space>
          <CalendarOutlined style={{ color: '#5CAADF' }} />
          <span>{drawerTitle}</span>
          {editingCourse && (
            <Tag color={editingCourse.status === 'pending' ? 'orange' : editingCourse.status === 'completed' ? 'green' : 'red'}>
              {editingCourse.status === 'pending' ? '待上课' : editingCourse.status === 'completed' ? '已完成' : '已取消'}
            </Tag>
          )}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={520}
      destroyOnClose
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {isEdit && !isCompleted && !isCancelled && (
              <Popconfirm title="确认取消此课程？取消不可恢复" onConfirm={handleCancel}>
                <Button danger icon={<CloseOutlined />}>取消课程</Button>
              </Popconfirm>
            )}
          </div>
          <Space>
            <Button onClick={onClose}>关闭</Button>
            {(!isCompleted && !isCancelled) && (
              <Button type="primary" loading={submitting} onClick={handleSubmit}
                icon={isEdit ? <SwapOutlined /> : <CalendarOutlined />}>
                {isEdit ? '保存修改' : '确认排课'}
              </Button>
            )}
          </Space>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={onFormChange}
        disabled={isCompleted || isCancelled}
      >
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="teacher_id" label="教师" rules={[{ required: true, message: '请选择教师' }]}>
              <Select
                placeholder="选择教师"
                showSearch
                optionFilterProp="label"
                options={teacherOptions.map(t => ({
                  value: t.id,
                  label: t.name,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="child_ids" label="学员" rules={[{ required: true, message: '请选择学员' }]}>
              <Select
                mode="multiple"
                placeholder="选择学员"
                showSearch
                optionFilterProp="label"
                maxTagCount={3}
                options={studentOptions.map(s => ({
                  value: s.id,
                  label: `${s.name}${s.remaining_hours != null ? ` (${s.remaining_hours}h)` : ''}`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="start_time" label="开始" rules={[{ required: true, message: '请选择' }]}>
              <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }}
                onSelect={calcSuggestedHours}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="end_time" label="结束" rules={[{ required: true, message: '请选择' }]}>
              <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }}
                onSelect={calcSuggestedHours}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="hours" label="课时" rules={[{ required: true, message: '请输入' }]}>
              <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} addonAfter="h" className="tabular" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="meeting_link" label="会议链接">
          <Input placeholder="如 Zoom / Google Meet 链接" />
        </Form.Item>
      </Form>

      {/* 冲突检测结果 — 实时更新 */}
      {renderConflicts()}

      {/* 已完成/已取消的只读提醒 */}
      {isCompleted && (
        <Alert type="info" showIcon message="已完成课程，仅可查看。编辑请使用其他途径。" style={{ marginTop: 12 }} />
      )}
      {isCancelled && (
        <Alert type="warning" showIcon message="课程已取消。如需恢复请新建排课。" style={{ marginTop: 12 }} />
      )}

      {/* 检测中状态 */}
      {checkingConflicts && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>检测冲突中…</Text>
        </div>
      )}
    </Drawer>
  );
}
