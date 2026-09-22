import type { AdminStorePayload, PageResponse, Store } from '../types/store';
import { api, type ApiResponse } from './client';
import { getStoreDetail, getStorePage, unwrapApiResponse } from './stores';

export type AdminStore = Store;
export type StorePage = PageResponse<Store>;
export type { AdminStorePayload };

export async function getAdminStorePage(
  page = 0,
  size = 20,
  signal?: AbortSignal,
): Promise<StorePage> {
  return getStorePage(page, size, {}, signal);
}

export async function getAdminStoreDetail(storeId: number, signal?: AbortSignal): Promise<AdminStore> {
  return getStoreDetail(storeId, signal);
}

export async function createAdminStore(
  payload: AdminStorePayload,
  signal?: AbortSignal,
): Promise<AdminStore> {
  return unwrapApiResponse(await api.post<ApiResponse<AdminStore>>(
    '/admin/stores', payload, { auth: true, signal },
  ));
}

export async function updateAdminStore(
  storeId: number,
  payload: AdminStorePayload,
  signal?: AbortSignal,
): Promise<AdminStore> {
  return unwrapApiResponse(await api.patch<ApiResponse<AdminStore>>(
    `/admin/stores/${storeId}`, payload, { auth: true, signal },
  ));
}

export function deleteAdminStore(storeId: number, signal?: AbortSignal): Promise<null> {
  return api.delete(`/admin/stores/${storeId}`, { auth: true, signal });
}

export async function activateAdminStore(storeId: number): Promise<AdminStore> {
  return unwrapApiResponse(await api.patch<ApiResponse<AdminStore>>(
    `/admin/stores/${storeId}/activate`, undefined, { auth: true },
  ));
}
