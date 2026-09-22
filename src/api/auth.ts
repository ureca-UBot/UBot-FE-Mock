import type { AuthTokens } from '../auth/tokenStorage';
import { saveAuthTokens } from '../auth/tokenStorage';
import { api, ApiError, type ApiResponse } from './client';

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new ApiError(response.message || '로그인에 실패했습니다.', {
      code: response.code,
      data: response.data,
    });
  }
  return response.data;
}

export async function loginUser(email: string, password: string): Promise<AuthTokens> {
  const response = await api.post<ApiResponse<AuthTokens>>(
    '/auth/login',
    { email, password },
    { skipAuth: true },
  );
  const tokens = unwrap(response);
  saveAuthTokens(tokens);
  return tokens;
}
