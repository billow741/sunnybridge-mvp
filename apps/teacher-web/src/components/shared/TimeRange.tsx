import React from 'react';

interface TimeRangeProps {
  start: string;
  end: string;
}

const TimeRange: React.FC<TimeRangeProps> = ({ start, end }) => (
  <span style={{ fontWeight: 700, fontSize: 15, color: '#1A2B4A' }}>
    {start} – {end}
  </span>
);

export default TimeRange;
