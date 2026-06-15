/**
 * Auth API functions — login / refresh / logout.
 *
 * Maps to backend endpoints:
 * - POST /api/v1/auth/admin/login   (API-03)
 * - POST /api/v1/auth/refresh       (API-03)
 * - POST /api/v1/auth/logout        (API-03)
 */

import client from './client';
import { saveLoginData, clearAuth, getRefreshToken, getAccessToken } from '../auth/storage';

// ── Types ─────────────────────────────────────────

export interface AdminLoginParams {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  role: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthErrorDetail {
  code: string;
  message: string;
  attempts_remaining?: number;
  locked_until?: string;
}

// ── Admin Login ───────────────────────────────────

export async function adminLogin(params: AdminLoginParams): Promise<AdminLoginResponse> {
  const res = await client.post<AdminLoginResponse>('/auth/admin/login', {
    username: params.username,
    password: params.password,
  });

  const data = res.data;

  // Persist tokens to localStorage
  saveLoginData({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    role: data.role,
  });

  return data;
}

// ── Refresh ───────────────────────────────────────

export async function refreshAuth(): Promise<RefreshResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const res = await client.post<RefreshResponse>('/auth/refresh', {
    refresh_token: refreshToken,
  });

  return res.data;
}

// ── Logout ────────────────────────────────────────

export async function logout(): Promise<void> {
  const token = getAccessToken();
  if (token) {
    try {
      await client.post('/auth/logout');
    } catch {
      // Even if logout API fails, clear local state anyway
    }
  }
  clearAuth();
}
