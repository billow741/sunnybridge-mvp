import { create } from 'zustand';
import client from '@/api/client';

interface AuthState {
  token: string | null;
  user: {
    username: string;
    role: string;
    role_name?: string;
    permissions?: string[];
  } | null;
  setAuth: (token: string, user: AuthState['user']) => void;
  logout: () => void;
  /** 3-C: 检查当前用户是否有指定权限码 */
  hasPermission: (code: string) => boolean;
  /** 3-C: 检查当前用户是否匹配角色名 */
  hasRole: (roleName: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('sb_token'),
  user: JSON.parse(localStorage.getItem('sb_user') || 'null'),

  setAuth: (token, user) => {
    localStorage.setItem('sb_token', token);
    localStorage.setItem('sb_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('sb_token');
    localStorage.removeItem('sb_user');
    set({ token: null, user: null });
    client.defaults.headers.common['Authorization'] = '';
  },

  hasPermission: (code: string) => {
    const { user } = get();
    if (!user?.permissions) return false;
    return user.permissions.includes(code);
  },

  hasRole: (roleName: string) => {
    const { user } = get();
    return user?.role_name === roleName || user?.role === roleName;
  },
}));
