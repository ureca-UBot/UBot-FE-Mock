import { getAccessToken } from '../auth/tokenStorage';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;
}

interface ApiErrorOptions {
  status?: number;
  code?: string;
  data?: unknown;
}

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly data?: unknown;

  constructor(message: string, { status, code, data }: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export interface ApiRequestOptions extends RequestInit {
  auth?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }
  return response.text().catch(() => '');
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const { auth = false, ...fetchOptions } = options;
  const accessToken = auth ? getAccessToken() : null;
  const headers = new Headers(fetchOptions.headers);

  if (typeof fetchOptions.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const body = await parseResponse(response);
    const message = isRecord(body) && typeof body.message === 'string'
      ? body.message
      : (typeof body === 'string' && body) || `API 요청에 실패했습니다. (${response.status})`;
    throw new ApiError(message, {
      status: response.status,
      code: isRecord(body) && typeof body.code === 'string' ? body.code : undefined,
      data: isRecord(body) ? body.data : undefined,
    });
  }

  if (response.status === 204) {
    return null as T;
  }

  return await parseResponse(response) as T;
}

export const api = {
  get<T = unknown>(path: string, options?: ApiRequestOptions) {
    return apiRequest<T>(path, { ...options, method: 'GET' });
  },
  post<T = unknown>(path: string, body?: unknown, options?: ApiRequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  put<T = unknown>(path: string, body?: unknown, options?: ApiRequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  patch<T = unknown>(path: string, body?: unknown, options?: ApiRequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  delete<T = null>(path: string, options?: ApiRequestOptions) {
    return apiRequest<T>(path, { ...options, method: 'DELETE' });
  },
};
