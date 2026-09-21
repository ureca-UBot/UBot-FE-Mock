import { api, ApiError } from './client.js';
import { saveAuthTokens } from '../auth/tokenStorage.js';

function unwrap(response) {
  if (response?.success === false) {
    throw new ApiError(response.message || '로그인에 실패했습니다.', {
      code: response.code,
      data: response.data,
    });
  }
  return response?.data ?? response;
}

export async function loginUser(email, password) {
  const tokens = unwrap(await api.post('/auth/login', { email, password }, { skipAuth: true }));
  saveAuthTokens(tokens);
  return tokens;
}
