/**
 * 审批管理页面 — 3-D Approval Flow
 *
 * 功能：
 * - 待审批/已审批列表（Tabs）
 * - 通过/驳回操作（含备注）
 * - 关联结算记录摘要
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Table, Card, Tabs, Tag, Button, Space, Input, Modal, message,
  Descriptions, Tooltip, Badge,
} from 'antd';
import {
  AuditOutlined, CheckCircleOutlined, CloseCircleOutlined,
  SendOutlined, EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getApprovalList, approveApproval, rejectApproval } from '@/services/settlement';
import { extractError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

interface ApprovalItem {
  id: string;
  target_type: string;
  target_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: string;
  requested_by_name: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  comment?: string;
  created_at?: string;
  reviewed_at?: string;
  target_summary?: {
    teacher_name?: string;
    amount?: number;
    period_start?: string;
    period_end?: string;
  };
}

const { TextArea } = Input;

export default function Approvals() {
  const [data, setData] = useState<ApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tabKey, setTabKey] = useState('pending');
  const [page, setPage] = useState(1);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<ApprovalItem | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const { hasPermission } = useAuthStore();

  const canApprove = hasPermission('settlements:approve');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApprovalList({
        status: tabKey === 'all' ? undefined : tabKey,
        page,
        page_size: 20,
      });
      setData(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      message.error(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [tabKey, page]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (record: ApprovalItem) => {
    try {
      await approveApproval(record.id);
      message.success('审批通过');
      load();
    } catch (err) {
      message.error(extractError(err));
    }
  };

  const handleReject = async () => {
    if (!rejectingItem) return;
    try {
      await rejectApproval(rejectingItem.id, rejectComment || undefined);
      message.success('已驳回');
      setRejectModalOpen(false);
      setRejectComment('');
      setRejectingItem(null);
      load();
    } catch (err) {
      message.error(extractError(err));
    }
  };

  const columns = [
    {
      title: '类型', dataIndex: 'target_type', width: 80,
      render: (t: string) => t === 'settlement' ? '结算' : t,
    },
    {
      title: '摘要', width: 240,
      render: (_: any, r: ApprovalItem) => {
        if (r.target_summary) {
          const s = r.target_summary;
          return (
            <span>
              {s.teacher_name} · {dayjs(s.period_start).format('MM/DD')}—{dayjs(s.period_end).format('MM/DD')}
              <strong style={{ marginLeft: 8, color: '#F4A230' }}>₱{(s.amount || 0).toLocaleString()}</strong>
            </span>
          );
        }
        return r.target_id.slice(0, 8);
      },
    },
    {
      title: '提交人', dataIndex: 'requested_by_name', width: 100,
    },
    {
      title: '提交时间', dataIndex: 'created_at', width: 140,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (s: string) => {
        const map: Record<string, { color: string; label: string }> = {
          pending: { color: 'processing', label: '待审批' },
          approved: { color: 'success', label: '已通过' },
          rejected: { color: 'error', label: '已驳回' },
        };
        const cfg = map[s] || map.pending;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '审批人', dataIndex: 'reviewed_by_name', width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '审批时间', dataIndex: 'reviewed_at', width: 140,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '备注', dataIndex: 'comment', width: 150, ellipsis: true,
    },
    {
      title: '操作', width: 160,
      render: (_: any, r: ApprovalItem) => (
        <Space size={4}>
          {canApprove && r.status === 'pending' && (
            <>
              <Button type="primary" size="small" icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(r)}>
                通过
              </Button>
              <Button danger size="small" icon={<CloseCircleOutlined />}
                onClick={() => { setRejectingItem(r); setRejectComment(''); setRejectModalOpen(true); }}>
                驳回
              </Button>
            </>
          )}
          {!canApprove && r.status === 'pending' && (
            <Tooltip title="无审批权限">
              <Tag>无权限</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card
        className="sb-card"
        title={<span><AuditOutlined style={{ marginRight: 6 }} />审批管理</span>}
      >
        <Tabs
          activeKey={tabKey}
          onChange={(key) => { setTabKey(key); setPage(1); }}
          items={[
            { key: 'pending', label: <Badge count={tabKey === 'pending' ? total : 0} size="small" offset={[6, -2]}>待审批</Badge> },
            { key: 'approved', label: '已通过' },
            { key: 'rejected', label: '已驳回' },
            { key: 'all', label: '全部' },
          ]}
        />
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: (p) => setPage(p),
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>

      {/* 驳回备注 Modal */}
      <Modal
        title="驳回审批"
        open={rejectModalOpen}
        onOk={handleReject}
        onCancel={() => { setRejectModalOpen(false); setRejectingItem(null); }}
        okText="确认驳回"
        okButtonProps={{ danger: true }}
        width={420}
      >
        {rejectingItem && (
          <div>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="类型">{rejectingItem.target_type === 'settlement' ? '结算' : rejectingItem.target_type}</Descriptions.Item>
              <Descriptions.Item label="提交人">{rejectingItem.requested_by_name}</Descriptions.Item>
            </Descriptions>
            <TextArea
              rows={3}
              placeholder="驳回原因（可选）"
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
