/**
 * Axios instance with auth interceptors.
 *
 * - Request: inject Authorization Bearer token
 * - Response 401: attempt silent refresh, then retry original request
 * - Refresh failure: clear auth + redirect to /login
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, saveAccessToken, saveRefreshToken, clearAuth } from '../auth/storage';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach Bearer token ──────

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401 ─────

let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processPending(token: string | null, error: unknown = null) {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  pendingRequests = [];
}

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 403 Forbidden — role mismatch (non-admin accessing admin endpoint)
    // Clear auth and redirect; no point retrying.
    if (error.response?.status === 403) {
      clearAuth();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Only handle 401 on non-auth endpoints
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh for login/refresh endpoints themselves
    const url = originalRequest.url || '';
    if (url.includes('/auth/admin/login') || url.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuth();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return client(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const res = await axios.post(`${API_BASE}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const newAccessToken: string = res.data?.access_token;
      // NOTE: Backend refresh_access_token() currently does NOT rotate refresh_token.
      // It only returns { access_token, token_type, expires_in }.
      // If backend enables refresh token rotation in the future, it will return a
      // new refresh_token here — this guard ensures we only save it when present.
      const newRefreshToken: string | undefined = res.data?.refresh_token;

      if (newAccessToken) {
      saveAccessToken(newAccessToken);
      if (newRefreshToken) saveRefreshToken(newRefreshToken);
        processPending(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return client(originalRequest);
      }

      // No token returned — treat as failure
      clearAuth();
      window.location.href = '/login';
      return Promise.reject(error);
    } catch (refreshError) {
      clearAuth();
      processPending(null, refreshError);
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default client;
