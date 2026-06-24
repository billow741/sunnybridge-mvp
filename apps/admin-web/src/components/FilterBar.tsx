/**
 * FilterBar — 通用筛选工具栏组件
 *
 * 自动响应式：
 * - 桌面 (≥lg): 所有子元素一行 flex 布局
 * - 平板 (<lg): 允许换行，间距自适应
 * - 移动端 (<md): 全宽堆叠，查询/重置独占一行
 *
 * 用法：
 *   <FilterBar>
 *     <Input ... />
 *     <Select ... />
 *     <DatePicker ... />
 *   </FilterBar>
 */
import { ReactNode } from 'react';
import { Space } from 'antd';
import { useIsMobile } from '@/hooks/useBreakpoint';

interface FilterBarProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function FilterBar({ children, className, style }: FilterBarProps) {
  const isMobile = useIsMobile();

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
    </div>
  );
}
