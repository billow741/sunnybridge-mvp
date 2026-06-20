import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: Record<string, any> | null;
  setAuth: (token: string, user: Record<string, any>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('sb_token'),
  user: JSON.parse(localStorage.getItem('sb_user') || 'null'),
  setAuth: (token, user) => {
    localStorage.setItem('sb_token', token);
    localStorage.setItem('sb_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('sb_token'); localStorage.removeItem('sb_user');
    set({ token: null, user: null });
  },
}));
