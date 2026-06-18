import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../api/client';
import type { CurrentUser, LoginResponse, ChildBrief } from '../types';

interface AuthState {
  user: CurrentUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  children: ChildBrief[];
  currentChildId: string | null;
  login: (phone: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
  fetchMe: () => Promise<void>;
  fetchChildren: () => Promise<void>;
  setCurrentChild: (id: string) => void;
  clearAll: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      children: [],
      currentChildId: null,

      login: async (phone: string, password: string) => {
        const res = await apiClient.post<LoginResponse>('/auth/parent/login', { phone, password });
        const data = res.data;
        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          isAuthenticated: true,
        });
        return data;
      },

      logout: async () => {
        try { await apiClient.post('/auth/logout'); } catch {}
        get().clearAll();
      },

      setTokens: (access: string, refresh: string) => {
        set({ accessToken: access, refreshToken: refresh });
      },

      fetchMe: async () => {
        try {
          const res = await apiClient.get<CurrentUser>('/auth/me');
          set({ user: res.data });
        } catch { get().clearAll(); }
      },

      fetchChildren: async () => {
        try {
          const res = await apiClient.get<ChildBrief[]>('/children', { params: { page_size: 100 } });
          const kids = res.data;
          set(state => ({
            children: Array.isArray(kids) ? kids : (kids as any).items || [],
            currentChildId: state.currentChildId || (Array.isArray(kids) && kids.length > 0 ? kids[0].id : null),
          }));
        } catch {}
      },

      setCurrentChild: (id: string) => {
        set({ currentChildId: id });
      },

      clearAll: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, children: [], currentChildId: null });
      },
    }),
    {
      name: 'sb-parent-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        currentChildId: state.currentChildId,
      }),
    }
  )
);
