/**
 * 全局实体详情 Drawer Store
 * 任何组件都可以 openEntity(type, id) 打开对应实体详情 Drawer
 */
import { create } from 'zustand';

interface EntityDrawerState {
  open: boolean;
  entityType: string | null;   // 'student' | 'teacher' | 'course' | 'reading_material' | 'payment'
  entityId: string | null;
  openEntity: (type: string, id: string) => void;
  closeEntity: () => void;
}

export const useEntityDrawerStore = create<EntityDrawerState>(set => ({
  open: false,
  entityType: null,
  entityId: null,
  openEntity: (type, id) => set({ open: true, entityType: type, entityId: id }),
  closeEntity: () => set({ open: false, entityType: null, entityId: null }),
}));
