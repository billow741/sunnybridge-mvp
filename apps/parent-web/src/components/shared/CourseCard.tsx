import React from 'react';
import { Card, Avatar } from 'antd';
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { CourseOut } from '../../types';
import StatusTag from './StatusTag';

interface CourseCardProps {
  course: CourseOut;
  onClick: (id: string) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onClick }) => {
  const teacherName = course.teacher?.name || '—';
  const childrenNames = course.children?.map(c => c.english_name || c.name).join('、') || '—';

  return (
    <Card
      hoverable
      onClick={() => onClick(course.id)}
      style={{ borderRadius: 14, marginBottom: 12 }}
      bodyStyle={{ padding: 14 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarOutlined style={{ color: '#F4A230' }} />
          <span style={{ fontWeight: 600, color: '#2D3748' }}>{course.date}</span>
        </div>
        <StatusTag status={course.status} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#718096', fontSize: 14, marginBottom: 6 }}>
        <ClockCircleOutlined />
        <span>{course.start_time} - {course.end_time}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#718096' }}>
        <Avatar size={20} style={{ background: '#5CAADF', color: '#fff', fontSize: 10 }}>
          {teacherName[0]}
        </Avatar>
        <span>{teacherName} 老师</span>
        <span style={{ marginLeft: 'auto', color: '#A0AEC0' }}>{childrenNames}</span>
      </div>
    </Card>
  );
};

export default CourseCard;
