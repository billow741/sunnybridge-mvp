/**
 * Auth token storage — localStorage CRUD.
 *
 * Per SPRINT-1 ADMIN-01: JWT stored in localStorage.
 * Key naming convention: sb_* (SunnyBridge prefix).
 *
 * Tokens:
 * - access_token: 2h validity (TECH-SPEC §5.1)
 * - refresh_token: 30d validity (TECH-SPEC §5.1)
 * - auth_role: "admin" | "parent" | "teacher"
 */

const KEYS = {
  accessToken: 'sb_access_token',
  refreshToken: 'sb_refresh_token',
  authRole: 'sb_auth_role',
} as const;

// ── Read ──────────────────────────────────────────

export function getAccessToken(): string | null {
  return localStorage.getItem(KEYS.accessToken);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(KEYS.refreshToken);
}

export function getAuthRole(): string | null {
  return localStorage.getItem(KEYS.authRole);
}

// ── Write ─────────────────────────────────────────

export interface LoginData {
  accessToken: string;
  refreshToken: string;
  role: string;
}

export function saveLoginData(data: LoginData): void {
  localStorage.setItem(KEYS.accessToken, data.accessToken);
  localStorage.setItem(KEYS.refreshToken, data.refreshToken);
  localStorage.setItem(KEYS.authRole, data.role);
}

export function saveAccessToken(token: string): void {
  localStorage.setItem(KEYS.accessToken, token);
}

export function saveRefreshToken(token: string): void {
  localStorage.setItem(KEYS.refreshToken, token);
}

// ── Check ─────────────────────────────────────────

export function isLoggedIn(): boolean {
  const token = getAccessToken();
  return token !== null && token.length > 0;
}

export function isAdmin(): boolean {
  return getAuthRole() === 'admin';
}

// ── Clear (logout) ────────────────────────────────

export function clearAuth(): void {
  localStorage.removeItem(KEYS.accessToken);
  localStorage.removeItem(KEYS.refreshToken);
  localStorage.removeItem(KEYS.authRole);
}
