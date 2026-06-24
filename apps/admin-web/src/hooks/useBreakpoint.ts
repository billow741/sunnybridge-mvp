/**
 * useBreakpoint — Ant Design Grid breakpoint hook
 *
 * 返回当前断点 { xs, sm, md, lg, xl, xxl }。
 * 移动端关键路径适配用 screens.md 判断。
 */
import { Grid } from 'antd';

const { useBreakpoint: antUseBreakpoint } = Grid;

export type Breakpoints = Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl', boolean>>;

export function useBreakpoint(): Breakpoints {
  return antUseBreakpoint();
}

/** 是否为移动端 (<768px, xs only) */
export function useIsMobile(): boolean {
  const screens = antUseBreakpoint();
  return !!screens.xs && !screens.sm;
}

/** 是否为平板 (<992px, <lg) */
export function useIsTablet(): boolean {
  const screens = antUseBreakpoint();
  return !!screens.sm && !screens.lg;
}
