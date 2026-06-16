import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../api/client';
import type { CurrentUser, LoginResponse } from '../types';

interface AuthState {
  user: CurrentUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
  fetchMe: () => Promise<void>;
  clearAll: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

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

      clearAll: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'sb-parent-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
