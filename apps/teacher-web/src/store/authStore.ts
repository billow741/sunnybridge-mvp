import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: Record<string, any> | null;
  mustChangePassword: boolean;
  setAuth: (token: string, user: Record<string, any>, mustChange?: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('sb_token'),
  user: JSON.parse(localStorage.getItem('sb_user') || 'null'),
  mustChangePassword: localStorage.getItem('sb_must_change') === 'true',
  setAuth: (token, user, mustChange) => {
    localStorage.setItem('sb_token', token);
    localStorage.setItem('sb_user', JSON.stringify(user));
    if (mustChange !== undefined) localStorage.setItem('sb_must_change', String(mustChange));
    set({ token, user, mustChangePassword: mustChange || false });
  },
  logout: () => {
    localStorage.removeItem('sb_token'); localStorage.removeItem('sb_user'); localStorage.removeItem('sb_must_change');
    set({ token: null, user: null, mustChangePassword: false });
  },
}));
