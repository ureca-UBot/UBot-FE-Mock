const ACCESS_TOKEN_KEY = 'ubot.accessToken';
const REFRESH_TOKEN_KEY = 'ubot.refreshToken';

function readSessionValue(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return readSessionValue(ACCESS_TOKEN_KEY);
}

export function hasAccessToken() {
  return Boolean(getAccessToken());
}

export function saveAuthTokens({ accessToken, refreshToken }) {
  if (!accessToken) throw new Error('로그인 응답에 access token이 없습니다.');
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearAuthTokens() {
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}
