const TOKEN_COOKIE = 'iams_token';

/** Non-httpOnly cookie so the client fetch layer and the proxy's presence check can both read
 *  it. Phase 1 tradeoff — see README for the httpOnly-cookie hardening step planned pre-production. */
export function setToken(token: string) {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24; // 1 day
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function clearToken() {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}

export const TOKEN_COOKIE_NAME = TOKEN_COOKIE;
