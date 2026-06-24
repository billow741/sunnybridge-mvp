/**
 * FilterBar — 通用筛选工具栏 + 保存/加载筛选模板
 *
 * 响应式布局 + 保存当前筛选 / 加载已保存筛选
 */
import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Space, Button, Dropdown, Modal, Input, message, Popconfirm } from 'antd';
import { SaveOutlined, FilterOutlined, DeleteOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { getSavedFilters, createSavedFilter, deleteSavedFilter, SavedFilter } from '@/services/saved_filters';

interface FilterBarProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** 当前页面标识, 如 'teachers', 'payments' */
  page: string;
  /** 当前筛选条件, 保存时用 */
  currentFilters: Record<string, any>;
  /** 加载筛选条件时的回调 */
  onApplyFilter?: (filters: Record<string, any>) => void;
}

export default function FilterBar({ children, className, style, page, currentFilters, onApplyFilter }: FilterBarProps) {
  const isMobile = useIsMobile();
  const [savedList, setSavedList] = useState<SavedFilter[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const loadSaved = useCallback(async () => {
    try {
      const list = await getSavedFilters(page);
      setSavedList(list);
    } catch { /* ignore */ }
  }, [page]);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  const handleSave = async () => {
    if (!saveName.trim()) { message.warning('请输入模板名称'); return; }
    try {
      await createSavedFilter({ name: saveName.trim(), page, filters: currentFilters });
      message.success('筛选已保存');
      setSaveModalOpen(false);
      setSaveName('');
      loadSaved();
    } catch {
      message.error('保存失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSavedFilter(id);
      message.success('已删除');
      loadSaved();
    } catch {
      message.error('删除失败');
    }
  };

  const savedMenuItems = savedList.length > 0
    ? savedList.map(f => ({
        key: String(f.id),
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 160 }}>
            <span onClick={() => onApplyFilter?.(f.filters)}>
              {f.is_default && <StarFilled style={{ color: '#F4A230', marginRight: 6 }} />}
              {f.name}
            </span>
            <Popconfirm title="删除此模板?" onConfirm={() => handleDelete(f.id)} okText="删除" cancelText="取消">
              <DeleteOutlined style={{ color: '#999', fontSize: 12 }} onClick={e => e.stopPropagation()} />
            </Popconfirm>
          </div>
        ),
      }))
    : [{ key: 'empty', label: <span style={{ color: '#999' }}>暂无已保存筛选</span>, disabled: true }];

  return (
    <div
      className={`sb-filter-bar ${className || ''}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: isMobile ? 8 : 12,
        padding: isMobile ? '8px 0' : '12px 0',
        borderBottom: '1px solid #f0f0f0',
        marginBottom: 16,
        ...style,
      }}
    >
      {children}

      {/* 保存/加载按钮组 */}
      <Space style={{ marginLeft: 'auto' }}>
        <Dropdown menu={{ items: savedMenuItems }} trigger={['click']}>
          <Button icon={<FilterOutlined />} size="small">
            已保存
          </Button>
        </Dropdown>
        <Button icon={<SaveOutlined />} size="small" onClick={() => setSaveModalOpen(true)}>
          保存筛选
        </Button>
      </Space>

      <Modal
        title="保存当前筛选"
        open={saveModalOpen}
        onOk={handleSave}
        onCancel={() => { setSaveModalOpen(false); setSaveName(''); }}
        okText="保存"
        destroyOnClose
      >
        <Input
          placeholder="输入模板名称"
          value={saveName}
          onChange={e => setSaveName(e.target.value)}
          onPressEnter={handleSave}
          autoFocus
        />
      </Modal>
    </div>
  );
}
