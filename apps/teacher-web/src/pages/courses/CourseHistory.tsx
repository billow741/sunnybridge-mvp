import { useState, useEffect } from 'react';
import { Table, DatePicker, Space } from 'antd';
import PageContainer from '../../components/PageContainer';
import CourseStatusTag from '../../components/CourseStatusTag';
import ErrorState from '../../components/ErrorState';
import apiClient from '../../api/client';
import type { CourseOut, PaginatedResponse } from '../../types';
import { formatTime, formatDate } from '../../utils/dayjs';
import { useNavigate } from 'react-router-dom';

export default function CourseHistory() {
  const [data, setData] = useState<PaginatedResponse<CourseOut>>({ items: [], total: 0, page: 1, page_size: 20 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const navigate = useNavigate();

  const fetchHistory = (p = 1) => {
    setLoading(true);
    setError(null);
    apiClient.get<PaginatedResponse<CourseOut>>('/courses/all', { params: { month, page: p, page_size: 20 } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail?.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHistory(); }, [month]);

  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date', render: (d: string) => formatDate(d) },
    { title: '时间', key: 'time', render: (_: unknown, r: CourseOut) => `${formatTime(r.start_time)} - ${formatTime(r.end_time)}` },
    { title: '学生', key: 'children', render: (_: unknown, r: CourseOut) => r.children.map((c) => c.name).join('、') || '—' },
    { title: '状态', key: 'status', render: (_: unknown, r: CourseOut) => <CourseStatusTag status={r.status} /> },
    { title: '操作', key: 'actions', render: (_: unknown, r: CourseOut) => <a onClick={() => navigate(`/courses/${r.id}`)}>查看详情</a> },
  ];

  return (
    <PageContainer title="历史课程" extra={
      <Space>
        <span>筛选月份：</span>
        <DatePicker picker="month" onChange={(_date: unknown, dateString: string | string[]) => { if (typeof dateString === 'string') setMonth(dateString); }} placeholder="选择月份" />
      </Space>
    }>
      {error ? <ErrorState message={error} onRetry={() => fetchHistory()} /> : (
        <Table
          dataSource={data.items}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ current: data.page, total: data.total, pageSize: data.page_size, onChange: fetchHistory, showSizeChanger: false }}
        />
      )}
    </PageContainer>
  );
}
