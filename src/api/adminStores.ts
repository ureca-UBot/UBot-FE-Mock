import { api, ApiError, type ApiResponse } from './client';

export interface StoreService {
  code: string;
  name: string;
}

export interface AdminStore {
  storeId: number;
  storeName: string;
  sido: string;
  sigungu: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber: string | null;
  businessHours: string | null;
  services?: StoreService[];
}

export interface StorePage {
  content: AdminStore[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AdminStorePayload {
  storeName: string;
  sido: string;
  sigungu: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber: string | null;
  businessHours: string | null;
  serviceCodes: string[];
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new ApiError(response.message || 'API 요청에 실패했습니다.', {
      code: response.code,
      data: response.data,
    });
  }
  return response.data;
}

export async function getAdminStorePage(page = 0, size = 20): Promise<StorePage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  const response = await api.get<ApiResponse<StorePage>>(
    `/stores?${params.toString()}`,
    { skipAuth: true },
  );
  return unwrap(response);
}

export async function getAdminStoreDetail(storeId: number): Promise<AdminStore> {
  const response = await api.get<ApiResponse<AdminStore>>(
    `/stores/${storeId}`,
    { skipAuth: true },
  );
  return unwrap(response);
}

export async function createAdminStore(payload: AdminStorePayload): Promise<AdminStore> {
  return unwrap(await api.post<ApiResponse<AdminStore>>('/admin/stores', payload));
}

export async function updateAdminStore(
  storeId: number,
  payload: AdminStorePayload,
): Promise<AdminStore> {
  return unwrap(await api.patch<ApiResponse<AdminStore>>(`/admin/stores/${storeId}`, payload));
}

export function deleteAdminStore(storeId: number): Promise<null> {
  return api.delete(`/admin/stores/${storeId}`);
}

export async function activateAdminStore(storeId: number): Promise<AdminStore> {
  return unwrap(await api.patch<ApiResponse<AdminStore>>(`/admin/stores/${storeId}/activate`));
}
