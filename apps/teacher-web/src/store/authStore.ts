import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../api/client';
import type { CurrentUser, LoginResponse } from '../types';

interface AuthState {
  user: CurrentUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  mustChangePassword: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<LoginResponse>;
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
      mustChangePassword: false,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        const res = await apiClient.post<LoginResponse>('/auth/teacher/login', {
          username,
          password,
        });
        const data = res.data;
        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          mustChangePassword: data.must_change_password ?? false,
          isAuthenticated: true,
        });
        return data;
      },

      logout: async () => {
        try {
          await apiClient.post('/auth/logout');
        } catch {}
        get().clearAll();
      },

      setTokens: (access: string, refresh: string) => {
        set({ accessToken: access, refreshToken: refresh });
      },

      fetchMe: async () => {
        try {
          const res = await apiClient.get<CurrentUser>('/auth/me');
          set({ user: res.data });
        } catch {
          get().clearAll();
        }
      },

      clearAll: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          mustChangePassword: false,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'sb-teacher-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        mustChangePassword: state.mustChangePassword,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
