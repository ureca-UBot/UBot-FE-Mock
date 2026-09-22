import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveAuthTokens } from '../auth/tokenStorage';
import { api } from './client';

const values = new Map<string, string>();
const sessionStorage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
  removeItem: (key: string) => values.delete(key),
  clear: () => values.clear(),
  key: (index: number) => [...values.keys()][index] ?? null,
  get length() {
    return values.size;
  },
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client 인증 헤더', () => {
  beforeEach(() => {
    values.clear();
    vi.stubGlobal('window', { sessionStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('공개 요청은 저장된 토큰과 skipAuth 옵션을 fetch에 전달하지 않는다', async () => {
    saveAuthTokens({ accessToken: 'expired-token' });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await api.get('/stores', { skipAuth: true });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit & { skipAuth?: boolean }];
    const headers = new Headers(options.headers);
    expect(headers.has('Authorization')).toBe(false);
    expect(options.skipAuth).toBeUndefined();
  });

  it('관리자 요청은 저장된 access token을 Bearer 헤더로 전송한다', async () => {
    saveAuthTokens({ accessToken: 'admin-token' });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await api.post('/admin/stores', { storeName: '강남역점' });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(options.headers);
    expect(headers.get('Authorization')).toBe('Bearer admin-token');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('204 응답은 null을 반환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(api.delete('/admin/stores/1')).resolves.toBeNull();
  });
});
