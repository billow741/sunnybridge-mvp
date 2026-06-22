import { create } from 'zustand';

interface DashboardStore {
  courseSearchQuery: string;
  courseStatusFilter: 'all' | 'done' | 'pending';
  setCourseSearchQuery: (q: string) => void;
  setCourseStatusFilter: (f: 'all' | 'done' | 'pending') => void;
  clearFilters: () => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  courseSearchQuery: '',
  courseStatusFilter: 'all',
  setCourseSearchQuery: (q) => set({ courseSearchQuery: q }),
  setCourseStatusFilter: (f) => set({ courseStatusFilter: f }),
  clearFilters: () => set({ courseSearchQuery: '', courseStatusFilter: 'all' }),
}));
