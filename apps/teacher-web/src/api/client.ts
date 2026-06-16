import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.sunnybridge.qzz.io/api/v1',
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) throw new Error('No refresh token');
        const res = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { refresh_token: refreshToken }
        );
        const newAccessToken: string = res.data.access_token;
        useAuthStore.getState().setTokens(newAccessToken, refreshToken);
        failedQueue.forEach(({ resolve }) => resolve(newAccessToken));
        failedQueue = [];
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        failedQueue.forEach(({ reject }) => reject(refreshError));
        failedQueue = [];
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
