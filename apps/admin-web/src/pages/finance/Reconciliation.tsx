/**
 * 财务对账页面（P0-C）
 * 按月汇总：收款(CNY) vs 结算(PHP)，两币种独立显示，不混算差额
 * 数据源：GET /api/v1/finance/reconciliation?months=6
 */
import { useEffect, useState } from 'react';
import { Table, Card, Row, Col, Statistic, Spin, Select, Typography, Divider } from 'antd';
import {
  ArrowUpOutlined, AuditOutlined, PayCircleOutlined, TransactionOutlined,
} from '@ant-design/icons';
import client, { extractError } from '@/api/client';
import { message } from 'antd';

const { Text } = Typography;

interface MonthRec {
  month: string;
  payment_count: number;
  payment_total: number;
  hours_purchased: number;
  settlement_count: number;
  settlement_total: number;
  settlement_hours: number;
}

interface ReconciliationData {
  months: MonthRec[];
  grand_payment: number;
  grand_settlement: number;
}

export default function Reconciliation() {
  const [data, setData] = useState<ReconciliationData>({
    months: [], grand_payment: 0, grand_settlement: 0,
  });
  const [loading, setLoading] = useState(false);
  const [months, setMonths] = useState(6);

  const load = async (m: number = months) => {
    setLoading(true);
    try {
      const { data: res } = await client.get('/finance/reconciliation', { params: { months: m } });
      setData(res);
    } catch (err) {
      message.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const columns = [
    {
      title: '月份', dataIndex: 'month', width: 100,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: '收款笔数', dataIndex: 'payment_count', width: 90, align: 'center' as const,
    },
    {
      title: '收款金额(CNY)', dataIndex: 'payment_total', width: 130, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#52c41a', fontWeight: 600 }}>¥{v.toLocaleString()}</Text>,
    },
    {
      title: '购入课时', dataIndex: 'hours_purchased', width: 90, align: 'center' as const,
      render: (v: number) => v > 0 ? `${v}h` : '—',
    },
    {
      title: '结算笔数', dataIndex: 'settlement_count', width: 90, align: 'center' as const,
    },
    {
      title: '结算金额(PHP)', dataIndex: 'settlement_total', width: 130, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#F4A230', fontWeight: 600 }}>₱{v.toLocaleString()}</Text>,
    },
    {
      title: '结算课时', dataIndex: 'settlement_hours', width: 90, align: 'center' as const,
      render: (v: number) => v > 0 ? `${v}h` : '—',
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card className="sb-card">
            <Statistic title="累计收款 (CNY)" value={data.grand_payment} prefix="¥"
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
              prefix={<PayCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />} />
          </Card>
        </Col>
        <Col span={12}>
          <Card className="sb-card">
            <Statistic title="累计结算 (PHP)" value={data.grand_settlement} prefix="₱"
              valueStyle={{ color: '#F4A230', fontWeight: 700 }}
              prefix={<TransactionOutlined style={{ color: '#F4A230', marginRight: 4 }} />} />
          </Card>
        </Col>
      </Row>

      <Card className="sb-card"
        title={<span><AuditOutlined style={{ marginRight: 6 }} />月度对账</span>}
        extra={
          <Select value={months} onChange={(v) => { setMonths(v); load(v); }}
            style={{ width: 120 }}
            options={[
              { value: 3, label: '近 3 月' },
              { value: 6, label: '近 6 月' },
              { value: 12, label: '近 12 月' },
            ]}
          />
        }
      >
        <Spin spinning={loading}>
          <Table dataSource={data.months} columns={columns} rowKey="month" size="small" pagination={false}
            summary={() => (
              <Table.Summary.Row style={{ background: '#fafafa' }}>
                <Table.Summary.Cell index={0}><Text strong>合计</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="center">
                  <Text strong>{data.months.reduce((s, r) => s + r.payment_count, 0)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong style={{ color: '#52c41a' }}>¥{data.grand_payment.toLocaleString()}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="center">
                  <Text strong>{data.months.reduce((s, r) => s + r.hours_purchased, 0)}h</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="center">
                  <Text strong>{data.months.reduce((s, r) => s + r.settlement_count, 0)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Text strong style={{ color: '#F4A230' }}>₱{data.grand_settlement.toLocaleString()}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="center">
                  <Text strong>{data.months.reduce((s, r) => s + r.settlement_hours, 0)}h</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </Spin>
      </Card>
    </div>
  );
}
