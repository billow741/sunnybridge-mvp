import { useState, useEffect } from 'react';
import {
  Card,
  DatePicker,
  Table,
  Spin,
  Typography,
  Statistic,
  Empty,
  Row,
  Col,
  Space,
} from 'antd';
import { DollarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import client from '@/api/client';

const { Title } = Typography;

interface Payment {
  id: string;
  date: string;
  amount: number;
  purchased_hours: number;
  payment_method: string;
  receipt_number: string;
}

interface PaymentStats {
  total_amount: number;
  count: number;
  total_hours?: number;
}

interface PaymentResponse {
  items: Payment[];
  total: number;
  stats: PaymentStats;
}

export default function PaymentHistory() {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: '1', page_size: '20' };
      if (dateRange?.[0]) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
      }
      if (dateRange?.[1]) {
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      const res = await client.get<PaymentResponse>('/payments/mine', { params });
      setPayments(res.data?.items || []);
      setStats(res.data?.stats || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleFilter = () => {
    fetchPayments();
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '金额 (¥)',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '购买学时',
      dataIndex: 'purchased_hours',
      key: 'purchased_hours',
    },
    {
      title: '支付方式',
      dataIndex: 'payment_method',
      key: 'payment_method',
    },
    {
      title: '收据号',
      dataIndex: 'receipt_number',
      key: 'receipt_number',
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 顶部标题 + 日期筛选 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          缴费记录
        </Title>
        <Space>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
            placeholder={['开始日期', '结束日期']}
          />
          <Space>
            <button
              type="button"
              onClick={handleFilter}
              style={{
                backgroundColor: '#F4A230',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '4px 16px',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              筛选
            </button>
          </Space>
        </Space>
      </div>

      {/* 统计区 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card bordered={false} style={{ backgroundColor: '#FFF8F0' }}>
            <Statistic
              title={<span style={{ color: '#666' }}>已付款总额</span>}
              value={stats?.total_amount || 0}
              prefix="¥"
              valueStyle={{ color: '#F4A230', fontSize: 32, fontWeight: 'bold' }}
              suffix="元"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card bordered={false} style={{ backgroundColor: '#FFF8F0' }}>
            <Statistic
              title={<span style={{ color: '#666' }}>已购买学时</span>}
              value={stats?.total_hours || stats?.count || 0}
              valueStyle={{ color: '#F4A230', fontSize: 32, fontWeight: 'bold' }}
              suffix="小时"
            />
          </Card>
        </Col>
      </Row>

      {/* 表格 */}
      <Spin spinning={loading}>
        {payments.length === 0 ? (
          <Empty description="暂无缴费记录" />
        ) : (
          <Card bordered={false}>
            <Table
              dataSource={payments}
              columns={columns}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
            />
          </Card>
        )}
      </Spin>
    </div>
  );
}
