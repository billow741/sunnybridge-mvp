import { useEffect, useState } from 'react';
import { Button, Modal, Form, Select, DatePicker, TimePicker, Input, InputNumber, message, Tag } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';

const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => `${String(i+8).padStart(2,'0')}:00`);
const STATUS_COLORS: Record<string, string> = { completed: '#52c41a', scheduled: '#722ed1', cancelled: '#ff4d4f' };

export default function Schedule() {
  const [startDay, setStartDay] = useState(dayjs().startOf('week').add(1,'day'));
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [form] = Form.useForm();

  const load = async () => {
    try {
      const [cRes, tRes, chRes] = await Promise.all([
        client.get('/courses/all', { params: { page: 1, page_size: 200 } }),
        client.get('/teachers', { params: { page: 1, page_size: 200 } }),
        client.get('/children', { params: { page: 1, page_size: 200 } }),
      ]);
      setCourses(cRes.data.items || []); setTeachers(tRes.data.items || []); setChildren(chRes.data.items || []);
    } catch (err) { message.error(extractError(err)); }
  };

  useEffect(() => { load(); }, []);

  const days = Array.from({ length: 14 }, (_, i) => startDay.add(i,'day'));
  const endDay = days[13];
  const coursesInRange = courses.filter(c => { const d = dayjs(c.date); return !d.isBefore(startDay) && !d.isAfter(endDay); });

  const onSlotClick = (date: string, time: string) => {
    setSlotDate(date); setSlotTime(time);
    form.setFieldsValue({ date: dayjs(date), start_time: dayjs(`2024-01-01 ${time}`), end_time: dayjs(`2024-01-01 ${String(parseInt(time)+1).padStart(2,'0')}:00`) });
    setModalOpen(true);
  };

  const onAdd = async (values: any) => {
    try {
      await client.post('/courses', { ...values, date: values.date?.format('YYYY-MM-DD'), start_time: values.start_time?.format('HH:mm'), end_time: values.end_time?.format('HH:mm') });
      message.success('排课成功'); setModalOpen(false); form.resetFields(); load();
    } catch (err) { message.error(extractError(err)); }
  };

  const onDelete = async (id: string) => {
    try { await client.delete(`/courses/${id}`); message.success('已删除'); load(); } catch (err) { message.error(extractError(err)); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<LeftOutlined />} onClick={() => setStartDay(d => d.subtract(7,'day'))} />
        <Button onClick={() => setStartDay(dayjs().startOf('week').add(1,'day'))}>今天</Button>
        <Button icon={<RightOutlined />} onClick={() => setStartDay(d => d.add(7,'day'))} />
        <span style={{ fontWeight: 600 }}>{startDay.format('MM/DD')} - {endDay.format('MM/DD')}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(14, 1fr)', minWidth: 900, gap: 1, background: '#e5e7eb', border: '1px solid #e5e7eb' }}>
          <div style={{ background: '#f8fafc', padding: 4, textAlign: 'center', fontWeight: 600, fontSize: 11 }}>时间</div>
          {days.map(d => <div key={d.format()} style={{ background: '#f8fafc', padding: 4, textAlign: 'center', fontWeight: 600, fontSize: 11 }}><div>{d.format('ddd')}</div><div>{d.format('MM/DD')}</div></div>)}
          {TIME_SLOTS.map(time => (
            <div key={time} style={{ display: 'contents' }}>
              <div style={{ background: '#f8fafc', padding: '4px 6px', textAlign: 'center', fontSize: 12, fontWeight: 500 }}>{time}</div>
              {days.map(d => {
                const dateStr = d.format('YYYY-MM-DD');
                const slotCourses = coursesInRange.filter(c => c.date === dateStr && c.start_time?.slice(0,5) === time);
                return (
                  <div key={`${dateStr}-${time}`} style={{ background: '#fff', minHeight: 40, padding: 2, cursor: 'pointer', fontSize: 11 }} onClick={() => !slotCourses.length && onSlotClick(dateStr, time)}>
                    {slotCourses.map(c => (
                      <div key={c.id} style={{ background: (c.feedback ? '#f6ffed' : '#f9f0ff'), borderLeft: `3px solid ${c.feedback ? '#52c41a' : '#722ed1'}`, padding: '2px 4px', marginBottom: 2, borderRadius: 2 }}>
                        <div style={{ fontWeight: 600 }}>{c.children?.map((ch: any) => ch.name).join(',')}</div>
                        <div>{c.teacher?.name}</div>
                        <a style={{ fontSize: 10, color: '#ff4d4f' }} onClick={e => { e.stopPropagation(); onDelete(c.id); }}>删除</a>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <Modal title={`排课 - ${slotDate} ${slotTime}`} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={560}>
        <Form form={form} layout="vertical" onFinish={onAdd}>
          <Form.Item name="date" label="日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <div style={{ display: 'flex', gap: 8 }}>
            <Form.Item name="start_time" label="开始" rules={[{ required: true }]} style={{ flex: 1 }}><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="end_time" label="结束" rules={[{ required: true }]} style={{ flex: 1 }}><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item>
          </div>
          <Form.Item name="teacher_id" label="教师" rules={[{ required: true }]}>
            <Select options={teachers.map(t => ({ value: t.id, label: t.name }))} />
          </Form.Item>
          <Form.Item name="child_ids" label="学生">
            <Select mode="multiple" options={children.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="hours" label="课时" initialValue={1}><InputNumber min={0.5} step={0.5} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
