import React from 'react';
import type { CourseOut } from '../../types';
import StatusTag from './StatusTag';
import TimeRange from './TimeRange';

interface CourseCardProps {
  course: CourseOut;
  onClick?: () => void;
  action?: React.ReactNode;
}

const borderColorMap: Record<string, string> = {
  pending: '#ECC94B',
  completed: '#48BB78',
  cancelled: '#FC8181',
};

const CourseCard: React.FC<CourseCardProps> = ({ course, onClick, action }) => {
  const studentNames = course.children?.map(c => c.name).join(', ') || 'No students';

  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        borderRadius: 8,
        borderLeft: `4px solid ${borderColorMap[course.status] || '#E2E8F0'}`,
        padding: '14px 16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <TimeRange start={course.start_time} end={course.end_time} />
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{studentNames}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusTag status={course.status} />
          {action}
        </div>
      </div>
      {course.meeting_link && (
        <div style={{ fontSize: 12, color: '#5CAADF', marginTop: 6 }}>
          📎 Meeting link available
        </div>
      )}
    </div>
  );
};

export default CourseCard;
