import type {
  LocationSearchResult,
  MapBoundsQuery,
  MapCluster,
  MapStore,
  PageResponse,
  Store,
} from '../types/store';
import { api, ApiError, type ApiResponse } from './client';

export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new ApiError(response.message || 'API 요청에 실패했습니다.', {
      code: response.code,
      data: response.data,
    });
  }
  return response.data;
}

function appendTypes(params: URLSearchParams, types: string[] = []) {
  types.forEach((type) => params.append('type', type));
}

export async function getStorePage(
  page = 0,
  size = 20,
  filters: { sido?: string; sigungu?: string; types?: string[] } = {},
  signal?: AbortSignal,
): Promise<PageResponse<Store>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (filters.sido) params.set('sido', filters.sido);
  if (filters.sigungu) params.set('sigungu', filters.sigungu);
  appendTypes(params, filters.types);
  return unwrapApiResponse(await api.get<ApiResponse<PageResponse<Store>>>(
    `/stores?${params.toString()}`,
    { signal },
  ));
}

export async function getStoreDetail(storeId: number, signal?: AbortSignal): Promise<Store> {
  return unwrapApiResponse(await api.get<ApiResponse<Store>>(`/stores/${storeId}`, { signal }));
}

export async function getSidos(): Promise<string[]> {
  return unwrapApiResponse(await api.get<ApiResponse<string[]>>('/stores/regions/sidos'));
}

export async function getSigungus(sido: string): Promise<string[]> {
  return unwrapApiResponse(await api.get<ApiResponse<string[]>>(
    `/stores/regions/sigungus?sido=${encodeURIComponent(sido)}`,
  ));
}

export async function getMapStores(
  bounds: MapBoundsQuery,
  center: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<MapStore[]> {
  const params = new URLSearchParams({
    swLat: bounds.swLat.toFixed(6),
    swLng: bounds.swLng.toFixed(6),
    neLat: bounds.neLat.toFixed(6),
    neLng: bounds.neLng.toFixed(6),
    latitude: center.latitude.toFixed(6),
    longitude: center.longitude.toFixed(6),
  });
  appendTypes(params, bounds.types);
  return unwrapApiResponse(await api.get<ApiResponse<MapStore[]>>(
    `/stores/map?${params.toString()}`,
    { signal },
  ));
}

export async function getMapClusters(
  bounds: MapBoundsQuery,
  level: number,
  signal?: AbortSignal,
): Promise<MapCluster[]> {
  const params = new URLSearchParams({
    swLat: bounds.swLat.toFixed(6),
    swLng: bounds.swLng.toFixed(6),
    neLat: bounds.neLat.toFixed(6),
    neLng: bounds.neLng.toFixed(6),
    level: String(level),
  });
  appendTypes(params, bounds.types);
  return unwrapApiResponse(await api.get<ApiResponse<MapCluster[]>>(
    `/stores/map/clusters?${params.toString()}`,
    { signal },
  ));
}

export async function searchLocations(query: string): Promise<LocationSearchResult[]> {
  // TODO(BE contract): /locations/search is currently protected by backend security.
  // Keep this authenticated until the backend explicitly makes it public.
  return unwrapApiResponse(await api.get<ApiResponse<LocationSearchResult[]>>(
    `/locations/search?query=${encodeURIComponent(query)}`,
    { auth: true },
  ));
}
