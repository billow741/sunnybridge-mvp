/**
 * RequirePermission — 3-C 权限守卫组件。
 *
 * 用法:
 *   <RequirePermission code="students:write">
 *     <Button>编辑学员</Button>
 *   </RequirePermission>
 *
 *   <RequirePermission code="finance:read" fallback={null}>
 *     <FinanceDashboard />
 *   </RequirePermission>
 */
import { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

interface Props {
  /** 权限码，如 "students:write" */
  code: string;
  /** 权限不足时的替代渲染，默认 null（隐藏） */
  fallback?: ReactNode;
  children: ReactNode;
}

export default function RequirePermission({ code, fallback = null, children }: Props) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return hasPermission(code) ? <>{children}</> : <>{fallback}</>;
}
