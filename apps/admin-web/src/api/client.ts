import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

const client = axios.create({ baseURL: API_BASE, timeout: 15000 });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('sb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('sb_token');
      localStorage.removeItem('sb_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export function extractError(err: any, fallback = '操作失败'): string {
  const raw = err?.response?.data?.detail;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.map((e: any) => e.msg || String(e)).join('; ');
  if (raw?.message) return raw.message;
  if (raw?.msg) return raw.msg;
  if (err?.message && err.message !== 'Network Error') return err.message;
  return fallback;
}

export default client;
