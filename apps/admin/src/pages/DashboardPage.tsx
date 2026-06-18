/**
 * DashboardPage — 首页概览
 * 显示4个核心统计卡 + 最近课程
 */

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Table, Tag, Spin } from 'antd';
import {
  BookOutlined,
  TeamOutlined,
  UserOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getCourseList, type Course, type CourseStatus } from '../services/course';
import { getTeacherList } from '../services/teacher';
import { getStudentList } from '../services/student';
import { getMaterialList } from '../services/reading';

const { Title } = Typography;

const STATUS_CONFIG: Record<CourseStatus, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待上课' },
  completed: { color: 'green', label: '已完成' },
  cancelled: { color: 'red', label: '已取消' },
};

const BRAND_BLUE = '#5AA0DC';

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({ courses: 0, teachers: 0, students: 0, readings: 0 });
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCourseList(1, 5),
      getTeacherList(1, 1),
      getStudentList(1, 1),
      getMaterialList({ page: 1, page_size: 1 }),
    ])
      .then(([courseRes, teacherRes, studentRes, readingRes]) => {
        setStats({
          courses: courseRes.total,
          teachers: teacherRes.total,
          students: studentRes.total,
          readings: readingRes.total,
        });
        setRecentCourses(courseRes.items);
      })
      .catch(() => {
        // 静默失败，统计卡显示 0
      })
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      title: '日期', dataIndex: 'date', key: 'date', width: 100,
      render: (v: string) => dayjs(v).format('MM-DD'),
    },
    {
      title: '时间', key: 'time', width: 120,
      render: (_: unknown, r: Course) => `${r.start_time.substring(0,5)} - ${r.end_time.substring(0,5)}`,
    },
    {
      title: '教师', key: 'teacher', width: 100,
      render: (_: unknown, r: Course) => r.teacher?.name || '—',
    },
    {
      title: '学生', key: 'children', width: 100,
      render: (_: unknown, r: Course) => r.children[0]?.name || '—',
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (s: CourseStatus) => {
        const cfg = STATUS_CONFIG[s] || { color: 'default', label: s };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={12} md={6}>
            <Card hoverable>
              <Statistic
                title="课程总数" value={stats.courses}
                prefix={<BookOutlined style={{ color: BRAND_BLUE }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card hoverable>
              <Statistic
                title="教师总数" value={stats.teachers}
                prefix={<TeamOutlined style={{ color: BRAND_BLUE }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card hoverable>
              <Statistic
                title="学生总数" value={stats.students}
                prefix={<UserOutlined style={{ color: BRAND_BLUE }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card hoverable>
              <Statistic
                title="阅读材料" value={stats.readings}
                prefix={<ReadOutlined style={{ color: BRAND_BLUE }} />}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <Title level={5} style={{ marginBottom: 16 }}>最近课程</Title>
          <Table<Course>
            rowKey="id" columns={columns} dataSource={recentCourses}
            pagination={false} size="small"
          />
        </Card>
      </div>
    </Spin>
  );
};

export { DashboardPage };
export const PlaceholderPage: React.FC<{ title: string; routeName?: string }> = ({ title }) => (
  <Card>
    <div style={{ textAlign: 'center', padding: '64px 0' }}>
      <Title level={4} style={{ color: '#666' }}>{title}</Title>
    </div>
  </Card>
);
