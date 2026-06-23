/**
 * 全局实体详情 Drawer
 * 根据 entityType + entityId 从 API 拉取数据并展示
 * 支持实体: student, teacher, course, reading_material, payment
 */
import { useEffect, useState } from 'react';
import { Drawer, Spin, Descriptions, Tag, Button, Space, Typography, Avatar, Divider, Empty, message } from 'antd';
import {
  TeamOutlined, TrophyOutlined, BookOutlined, DollarOutlined, FilePdfOutlined,
  UserOutlined, EditOutlined, CheckCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import client, { extractError } from '@/api/client';
import { useEntityDrawerStore } from '@/store/entityDrawerStore';

const { Text, Title } = Typography;

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  student:          { label: '学员详情', icon: <TeamOutlined />, color: '#5CAADF' },
  teacher:          { label: '教师详情', icon: <TrophyOutlined />, color: '#52c41a' },
  course:           { label: '课程详情', icon: <BookOutlined />, color: '#F4A230' },
  reading_material: { label: '阅读材料详情', icon: <FilePdfOutlined />, color: '#722ed1' },
  payment:          { label: '收款详情', icon: <DollarOutlined />, color: '#5CAADF' },
};

const API_MAP: Record<string, string> = {
  student: '/children',
  teacher: '/teachers',
  course: '/courses',
  reading_material: '/reading/materials',
  payment: '/payments',
};

export default function EntityDrawer() {
  const { open, entityType, entityId, closeEntity } = useEntityDrawerStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !entityType || !entityId) { setData(null); return; }
    const basePath = API_MAP[entityType];
    if (!basePath) { setData(null); return; }
    setLoading(true);
    client.get(`${basePath}/${entityId}`)
      .then(res => setData(res.data))
      .catch(() => { message.error('加载失败'); setData(null); })
      .finally(() => setLoading(false));
  }, [open, entityType, entityId]);

  const cfg = entityType ? TYPE_CONFIG[entityType] : null;

  const renderContent = () => {
    if (!data) return <Empty description="无法加载" />;
    switch (entityType) {
      case 'student': return (
        <>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Avatar size={64} icon={<UserOutlined />} style={{ background: '#5CAADF' }} />
            <Title level={4} style={{ marginTop: 8, marginBottom: 4 }}>{data.name}</Title>
            <Space>
              <Tag color={data.is_active !== false ? 'green' : 'default'}>{data.is_active !== false ? '在读' : '停课'}</Tag>
            </Space>
          </div>
          <Descriptions column={1} size="small" labelStyle={{ color: '#999', width: 80 }}>
            {data.phone && <Descriptions.Item label="电话">{data.phone}</Descriptions.Item>}
            <Descriptions.Item label="总课时"><span style={{ fontVariantNumeric: 'tabular-nums' }}>{data.totalhours ?? 0}h</span></Descriptions.Item>
            <Descriptions.Item label="已用课时"><span style={{ fontVariantNumeric: 'tabular-nums' }}>{data.usedhours ?? 0}h</span></Descriptions.Item>
            <Descriptions.Item label="剩余课时"><span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: ((data.totalhours??0)-(data.usedhours??0))<=5?'#ff4d4f':'#52c41a' }}>{((data.totalhours ?? 0) - (data.usedhours ?? 0)).toFixed(1)}h</span></Descriptions.Item>
            {data.created_at && <Descriptions.Item label="创建时间">{dayjs(data.created_at).format('YYYY-MM-DD')}</Descriptions.Item>}
          </Descriptions>
        </>
      );
      case 'teacher': return (
        <>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Avatar size={64} icon={<UserOutlined />} style={{ background: '#52c41a' }} />
            <Title level={4} style={{ marginTop: 8, marginBottom: 4 }}>{data.name}</Title>
            <Tag color={data.is_active ? 'green' : 'default'}>{data.is_active ? '在职' : '离职'}</Tag>
          </div>
          <Descriptions column={1} size="small" labelStyle={{ color: '#999', width: 80 }}>
            <Descriptions.Item label="用户名"><Text code>{data.username}</Text></Descriptions.Item>
            {data.phone && <Descriptions.Item label="电话">{data.phone}</Descriptions.Item>}
            {data.hourly_rate != null && <Descriptions.Item label="时薪"><span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>¥{data.hourly_rate}/h</span></Descriptions.Item>}
          </Descriptions>
        </>
      );
      case 'course': return (
        <>
          <Title level={4} style={{ marginTop: 0 }}>{data.teacher?.name || '—'}</Title>
          <Descriptions column={1} size="small" labelStyle={{ color: '#999', width: 80 }}>
            <Descriptions.Item label="日期">{data.date}</Descriptions.Item>
            <Descriptions.Item label="时间">{data.start_time?.slice(0,5)} - {data.end_time?.slice(0,5)}</Descriptions.Item>
            <Descriptions.Item label="学员">{data.students?.[0]?.name || data.children?.[0]?.name || '—'}</Descriptions.Item>
            <Descriptions.Item label="课时"><span style={{ fontVariantNumeric: 'tabular-nums' }}>{data.hours ?? '—'}</span></Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={data.status === 'completed' ? 'green' : data.status === 'cancelled' ? 'red' : 'orange'}>
                {data.status === 'completed' ? '已完成' : data.status === 'cancelled' ? '已取消' : '待上课'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </>
      );
      case 'reading_material': return (
        <>
          {data.cover_url && (
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <img src={data.cover_url} style={{ maxHeight: 200, borderRadius: 8, objectFit: 'contain' }} />
            </div>
          )}
          <Title level={4} style={{ marginTop: 0 }}>{data.title}</Title>
          <Space style={{ marginBottom: 12 }}>
            <Tag>{data.level}</Tag>
            <Tag>{data.category}</Tag>
            <Tag color={data.is_active ? 'green' : 'default'}>{data.is_active ? '启用' : '停用'}</Tag>
          </Space>
          <Descriptions column={1} size="small" labelStyle={{ color: '#999', width: 80 }}>
            {data.page_count > 0 && <Descriptions.Item label="页数">{data.page_count}</Descriptions.Item>}
            <Descriptions.Item label="PDF">{data.pdf_url ? <a href={data.pdf_url} target="_blank">下载</a> : '未上传'}</Descriptions.Item>
          </Descriptions>
        </>
      );
      case 'payment': return (
        <>
          <Title level={4} style={{ marginTop: 0 }}>收款记录</Title>
          <Descriptions column={1} size="small" labelStyle={{ color: '#999', width: 80 }}>
            <Descriptions.Item label="金额"><span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>¥{data.amount ?? '—'}</span></Descriptions.Item>
            <Descriptions.Item label="课时"><span style={{ fontVariantNumeric: 'tabular-nums' }}>{data.hours_purchased ?? '—'}h</span></Descriptions.Item>
            <Descriptions.Item label="方式">{data.payment_method || '—'}</Descriptions.Item>
            <Descriptions.Item label="日期">{data.payment_date ? dayjs(data.payment_date).format('YYYY-MM-DD') : '—'}</Descriptions.Item>
          </Descriptions>
        </>
      );
      default: return <Empty description="不支持的实体类型" />;
    }
  };

  return (
    <Drawer
      title={cfg?.label || '详情'}
      open={open}
      onClose={closeEntity}
      width={420}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : renderContent()}
    </Drawer>
  );
}
