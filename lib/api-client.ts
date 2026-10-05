import { getToken, clearToken } from './auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const method = options.method ?? 'GET';
  // Belt-and-suspenders against Hostinger's edge CDN, which has been observed caching a GET
  // response under its own default policy even when the origin later starts sending
  // Cache-Control: no-store — that header only changes what the CDN does on its NEXT cold fetch
  // for a given URL, it can't invalidate a copy already sitting at the edge from before the fix
  // shipped (confirmed: a disabled user kept appearing in a list while a brand-new one never did
  // — a frozen snapshot, not a logic bug). A cache-busting param makes every GET a URL the CDN
  // has never seen, guaranteeing a miss; `cache: 'no-store'` covers the browser's own HTTP cache.
  const query = method === 'GET' ? { ...options.query, _: Date.now() } : options.query;

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  if (response.status === 401 && token) {
    clearToken();
    // Hard navigation is intentional here (not a Link/router transition): a 401 on an
    // authenticated request means the session is dead, so we want a full reload that discards
    // all in-memory component state. When there's no token (e.g. a login attempt itself), a 401
    // just means invalid credentials — fall through so the caller gets the real server message.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError(401, 'Session expired');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, payload.message ?? 'Request failed');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  uploadUrl: (path: string) => buildUrl(path),
  baseUrl: API_URL,
};

export async function uploadFile<T>(path: string, file: File, fields: Record<string, string> = {}): Promise<T> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  for (const [key, value] of Object.entries(fields)) formData.append(key, value);

  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, payload.message ?? 'Upload failed');
  }

  return response.json() as Promise<T>;
}

export function fileUrl(relativePath: string): string {
  const origin = API_URL.replace(/\/api\/?$/, '');
  return `${origin}${relativePath}`;
}

/** For endpoints returning binary content (e.g. a QR code image) that a plain <img src> can't
 *  request with our Authorization header — fetches the bytes and returns an object URL. Callers
 *  must revoke it (URL.revokeObjectURL) when done, e.g. on unmount. */
export async function fetchAuthenticatedObjectUrl(path: string): Promise<string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(buildUrl(path), { headers });
  if (!response.ok) {
    throw new ApiError(response.status, 'Failed to load file');
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
