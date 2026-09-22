const ACCESS_TOKEN_KEY = 'ubot.accessToken';
const REFRESH_TOKEN_KEY = 'ubot.refreshToken';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

function readSessionValue(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return readSessionValue(ACCESS_TOKEN_KEY);
}

export function hasAccessToken(): boolean {
  return Boolean(getAccessToken());
}

export function saveAuthTokens({ accessToken, refreshToken }: AuthTokens): void {
  if (!accessToken) throw new Error('로그인 응답에 access token이 없습니다.');
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearAuthTokens(): void {
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}
