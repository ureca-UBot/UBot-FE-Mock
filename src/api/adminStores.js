import { api, ApiError } from './client.js';

function unwrap(response) {
  if (response?.success === false) {
    throw new ApiError(response.message || 'API 요청에 실패했습니다.', {
      code: response.code,
      data: response.data,
    });
  }
  return response?.data ?? response;
}

export async function getAdminStorePage(page = 0, size = 20) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return unwrap(await api.get(`/stores?${params.toString()}`, { skipAuth: true }));
}

export async function getAdminStoreDetail(storeId) {
  return unwrap(await api.get(`/stores/${storeId}`, { skipAuth: true }));
}

export async function createAdminStore(payload) {
  return unwrap(await api.post('/admin/stores', payload));
}

export async function updateAdminStore(storeId, payload) {
  return unwrap(await api.patch(`/admin/stores/${storeId}`, payload));
}

export function deleteAdminStore(storeId) {
  return api.delete(`/admin/stores/${storeId}`);
}

export async function activateAdminStore(storeId) {
  return unwrap(await api.patch(`/admin/stores/${storeId}/activate`));
}
