import { api } from '../api/client.js';

const DEFAULT_LOCATION = {
  latitude: 37.497942,
  longitude: 127.027621,
  label: '서울 강남구 역삼동',
};

const KOREA_MAP_LIMIT = {
  minLatitude: 33,
  maxLatitude: 39,
  minLongitude: 124,
  maxLongitude: 132,
  minLevel: 1,
  maxLevel: 13,
};

const STORE_PAGE_SIZE = 20;
const MAP_LIST_LIMIT = 50;
const SERVER_CLUSTER_MIN_LEVEL = 7;
const INDIVIDUAL_MARKER_MAX_LEVEL = SERVER_CLUSTER_MIN_LEVEL - 1;
const CLUSTER_MARKER_GAP_PX = 8;

let kakaoMapsPromise;

function unwrap(response) {
  if (response?.success === false) {
    throw new Error(response.message || 'API 요청에 실패했습니다.');
  }
  return response?.data ?? response;
}

function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm)) return '';
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))}m`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)}km`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function loadKakaoMaps() {
  if (window.kakao?.maps?.services) {
    return new Promise((resolve) => window.kakao.maps.load(() => resolve(window.kakao.maps)));
  }

  if (kakaoMapsPromise) return kakaoMapsPromise;

  const appKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY?.trim();
  if (!appKey) {
    return Promise.reject(new Error('VITE_KAKAO_JAVASCRIPT_KEY가 설정되지 않았습니다.'));
  }

  kakaoMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-ubot-kakao-map]');
    const script = existing || document.createElement('script');

    const onReady = () => {
      if (!window.kakao?.maps) {
        reject(new Error('카카오 지도 SDK를 불러오지 못했습니다.'));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao.maps));
    };

    if (existing) {
      if (window.kakao?.maps) onReady();
      else existing.addEventListener('load', onReady, { once: true });
      existing.addEventListener('error', () => reject(new Error('카카오 지도 SDK 로드에 실패했습니다.')), { once: true });
      return;
    }

    script.dataset.ubotKakaoMap = '1';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`;
    script.addEventListener('load', onReady, { once: true });
    script.addEventListener('error', () => reject(new Error('카카오 지도 SDK 로드에 실패했습니다.')), { once: true });
    document.head.appendChild(script);
  });

  return kakaoMapsPromise;
}

function buildInfoWindow(store) {
  const root = document.createElement('div');
  root.className = 'store-map-info';

  const name = document.createElement('strong');
  name.textContent = store.storeName;
  const address = document.createElement('span');
  address.textContent = store.address;
  const hours = document.createElement('small');
  hours.textContent = store.businessHours || '영업시간 정보 없음';

  root.append(name, address, hours);
  return root;
}

export function setupStoreLocator() {
  const mapElement = document.querySelector('#storeKakaoMap');
  const listElement = document.querySelector('#storeListItems');
  const searchInput = document.querySelector('#storeSearchInput');
  const searchButton = document.querySelector('#storeSearchButton');
  const locationButton = document.querySelector('#storeCurrentLocation');
  const sidoSelect = document.querySelector('#storeSido');
  const sigunguSelect = document.querySelector('#storeSigungu');
  const serviceTypeInputs = [...document.querySelectorAll('input[name="storeServiceType"]')];
  const serviceToggle = document.querySelector('#storeServiceToggle');
  const servicePanel = document.querySelector('#storeServicePanel');
  const serviceSummary = document.querySelector('#storeServiceSummary');
  const regionSearchButton = document.querySelector('#storeRegionSearchButton');
  const statusElement = document.querySelector('#storeSearchStatus');
  const countElement = document.querySelector('#storeResultCount');
  const paginationElement = document.querySelector('#storePagination');
  const pageInfoElement = document.querySelector('#storePageInfo');
  const prevPageButton = document.querySelector('#storePrevPage');
  const nextPageButton = document.querySelector('#storeNextPage');
  const viewportSearchButton = document.querySelector('#storeViewportSearch');

  if (!mapElement || !listElement || !searchInput || !searchButton || !statusElement) return;

  let maps;
  let map;
  let infoWindow;
  let markers = [];
  let stores = [];
  let selectedStoreId = null;
  let viewportRequestId = 0;
  let viewportAbortController = null;
  let lastViewportRequestKey = '';
  let mapInitPromise = null;
  let suppressViewportUntil = 0;
  let pendingClusterSearchHandler = null;
  let currentRegionPage = 0;
  let regionSearchActive = false;

  const showViewportSearch = () => {
    if (viewportSearchButton) viewportSearchButton.hidden = false;
  };

  const hideViewportSearch = () => {
    if (viewportSearchButton) viewportSearchButton.hidden = true;
  };

  const keepMapInsideKorea = () => {
    if (!map || !maps) return false;
    const center = map.getCenter();
    const latitude = clamp(
      center.getLat(),
      KOREA_MAP_LIMIT.minLatitude,
      KOREA_MAP_LIMIT.maxLatitude,
    );
    const longitude = clamp(
      center.getLng(),
      KOREA_MAP_LIMIT.minLongitude,
      KOREA_MAP_LIMIT.maxLongitude,
    );
    if (latitude === center.getLat() && longitude === center.getLng()) return false;

    map.setCenter(new maps.LatLng(latitude, longitude));
    return true;
  };

  const setStatus = (message, isError = false) => {
    statusElement.textContent = message;
    statusElement.classList.toggle('error', isError);
  };

  const getSelectedServices = () => serviceTypeInputs
    .filter((input) => input.checked)
    .map((input) => ({ code: input.value, label: input.nextElementSibling?.textContent || input.value }));

  const updateServiceSummary = () => {
    const selectedServices = getSelectedServices();
    if (!serviceSummary) return;
    if (!selectedServices.length) serviceSummary.textContent = '전체 서비스';
    else if (selectedServices.length === 1) serviceSummary.textContent = selectedServices[0].label;
    else serviceSummary.textContent = `${selectedServices.length}개 서비스 선택`;
  };

  const closeServicePanel = () => {
    if (!servicePanel || !serviceToggle) return;
    servicePanel.hidden = true;
    serviceToggle.setAttribute('aria-expanded', 'false');
  };

  const toggleServicePanel = () => {
    if (!servicePanel || !serviceToggle) return;
    const shouldOpen = servicePanel.hidden;
    servicePanel.hidden = !shouldOpen;
    serviceToggle.setAttribute('aria-expanded', String(shouldOpen));
  };

  const appendSelectedServiceParams = (params) => {
    getSelectedServices().forEach(({ code }) => params.append('type', code));
    return params;
  };

  const replaceSelectOptions = (select, placeholder, values) => {
    if (!select) return;
    const options = [new Option(placeholder, '')];
    values.forEach((value) => options.push(new Option(value, value)));
    select.replaceChildren(...options);
  };

  const loadSigungus = async (sido) => {
    replaceSelectOptions(sigunguSelect, '전체 시/군/구', []);
    sigunguSelect.disabled = !sido;
    if (!sido) return;

    try {
      const response = await api.get(`/stores/regions/sigungus?sido=${encodeURIComponent(sido)}`);
      replaceSelectOptions(sigunguSelect, '전체 시/군/구', unwrap(response) || []);
      sigunguSelect.disabled = false;
    } catch (error) {
      sigunguSelect.disabled = true;
      setStatus(`시/군/구 목록 조회 실패: ${error.message}`, true);
    }
  };

  const loadSidos = async () => {
    if (!sidoSelect) return;
    sidoSelect.disabled = true;
    try {
      const response = await api.get('/stores/regions/sidos');
      replaceSelectOptions(sidoSelect, '전체 시/도', unwrap(response) || []);
      sidoSelect.disabled = false;
    } catch (error) {
      setStatus(`시/도 목록 조회 실패: ${error.message}`, true);
    }
  };

  const clearMarkers = () => {
    markers.forEach(({ marker }) => marker.setMap(null));
    markers = [];
    infoWindow?.close();
  };

  const clearStoreSelection = () => {
    selectedStoreId = null;
    infoWindow?.close();
    listElement.querySelectorAll('[data-store-id].active').forEach((button) => {
      button.classList.remove('active');
    });
  };

  const createNumberedMarkerImage = (number) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="48" viewBox="0 0 42 48"><path d="M21 1C10.5 1 2 9.3 2 19.6c0 13 19 27.4 19 27.4s19-14.4 19-27.4C40 9.3 31.5 1 21 1Z" fill="#1677FF" stroke="white" stroke-width="2"/><circle cx="21" cy="19" r="11.5" fill="white"/><text x="21" y="23" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#1677FF">${number}</text></svg>`;
    const source = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    return new maps.MarkerImage(
      source,
      new maps.Size(42, 48),
      { offset: new maps.Point(21, 47) },
    );
  };

  const selectStore = (store, { moveMap = true } = {}) => {
    selectedStoreId = store.storeId;
    listElement.querySelectorAll('[data-store-id]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.storeId) === store.storeId);
    });

    document.dispatchEvent(new CustomEvent('ubot:store-selected', {
      detail: { id: store.storeId, name: store.storeName },
    }));

    const markerEntry = markers.find((entry) => entry.storeId === store.storeId);
    if (!map || !markerEntry) return;

    if (moveMap) map.panTo(markerEntry.marker.getPosition());
    infoWindow.setContent(buildInfoWindow(store));
    infoWindow.open(map, markerEntry.marker);
  };

  const renderList = (nextStores, { total = nextStores.length, numberOffset = 0 } = {}) => {
    stores = nextStores;
    listElement.replaceChildren();
    countElement.textContent = `${total}곳`;

    if (!stores.length) {
      const empty = document.createElement('p');
      empty.className = 'store-list-empty';
      empty.textContent = '이 지역에서 조회된 매장이 없습니다.';
      listElement.appendChild(empty);
      return;
    }

    stores.forEach((store, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.storeId = String(store.storeId);
      button.dataset.store = store.storeName;

      const number = document.createElement('span');
      number.className = 'store-list-number';
      number.textContent = String(numberOffset + index + 1);
      const content = document.createElement('div');
      content.className = 'store-list-content';
      const titleRow = document.createElement('div');
      titleRow.className = 'store-list-title-row';
      const name = document.createElement('b');
      name.textContent = store.storeName;
      const distance = document.createElement('em');
      distance.textContent = formatDistance(store.distanceKm);
      titleRow.append(name, distance);
      const address = document.createElement('small');
      address.className = 'store-list-address';
      address.textContent = store.address;
      const meta = document.createElement('div');
      meta.className = 'store-list-meta';
      if (store.phoneNumber) {
        const phone = document.createElement('span');
        phone.textContent = `☎ ${store.phoneNumber}`;
        meta.appendChild(phone);
      }
      if (store.businessHours) {
        const hours = document.createElement('span');
        hours.textContent = `◷ ${store.businessHours}`;
        meta.appendChild(hours);
      }
      const badges = document.createElement('div');
      badges.className = 'store-list-badges';
      if (store.phoneNumber) {
        const badge = document.createElement('i');
        badge.textContent = '전화 문의';
        badges.appendChild(badge);
      }
      if (store.businessHours) {
        const badge = document.createElement('i');
        badge.textContent = '영업시간 안내';
        badges.appendChild(badge);
      }
      getSelectedServices().forEach((selectedService) => {
        const badge = document.createElement('i');
        badge.className = 'accent';
        badge.textContent = selectedService.label;
        badges.appendChild(badge);
      });
      content.append(titleRow, address);
      if (meta.childElementCount) content.appendChild(meta);
      if (badges.childElementCount) content.appendChild(badges);

      const arrow = document.createElement('span');
      arrow.className = 'store-list-arrow';
      arrow.textContent = '›';
      button.append(number, content, arrow);
      button.addEventListener('click', () => selectStore(store));
      listElement.appendChild(button);
    });
  };

  const renderMarkers = (nextStores, { numberOffset = 0 } = {}) => {
    if (!map || !maps) return;
    clearMarkers();

    nextStores.forEach((store, index) => {
      const position = new maps.LatLng(store.latitude, store.longitude);
      const marker = new maps.Marker({
        position,
        title: store.storeName,
        image: createNumberedMarkerImage(numberOffset + index + 1),
      });
      maps.event.addListener(marker, 'click', () => selectStore(store, { moveMap: false }));
      markers.push({ storeId: store.storeId, marker });
    });

    markers.forEach(({ marker }) => marker.setMap(map));

    if (selectedStoreId) {
      const selected = nextStores.find((store) => store.storeId === selectedStoreId);
      if (selected) selectStore(selected, { moveMap: false });
    }
  };

  const getClusterMarkerSize = (count) => (
    clamp(Math.round(40 + Math.sqrt(Math.max(0, count - 1)) * 4), 40, 70)
  );

  const createClusterMarkerImage = (count) => {
    const size = getClusterMarkerSize(count);
    const center = size / 2;
    const radius = center - 3;
    const fontSize = clamp(Math.round(size * (count >= 1_000 ? 0.2 : 0.25)), 11, 16);
    const textY = center + fontSize * 0.35;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${center}" cy="${center}" r="${radius}" fill="#1677FF" stroke="white" stroke-width="5"/><text x="${center}" y="${textY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="white">${count}</text></svg>`;
    const source = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    return new maps.MarkerImage(
      source,
      new maps.Size(size, size),
      { offset: new maps.Point(center, center) },
    );
  };

  const renderPagination = (pageData) => {
    if (!paginationElement || !pageInfoElement || !prevPageButton || !nextPageButton) return;
    if (!pageData || pageData.totalPages <= 1) {
      paginationElement.hidden = true;
      return;
    }

    paginationElement.hidden = false;
    pageInfoElement.textContent = `${pageData.page + 1} / ${pageData.totalPages}`;
    prevPageButton.disabled = pageData.first;
    nextPageButton.disabled = pageData.last;
  };

  const renderClusterSummary = (total) => {
    stores = [];
    selectedStoreId = null;
    listElement.replaceChildren();
    countElement.textContent = `${total}곳`;

    const guide = document.createElement('p');
    guide.className = 'store-list-empty';
    guide.textContent = '파란 클러스터를 선택하거나 지도를 확대하면 개별 매장을 확인할 수 있습니다.';
    listElement.appendChild(guide);
  };

  const mergeOverlappingClusters = (sourceClusters) => {
    if (!map || !maps || sourceClusters.length < 2) return sourceClusters;

    const projection = map.getProjection();
    const project = (cluster) => {
      const point = projection.pointFromCoords(
        new maps.LatLng(cluster.latitude, cluster.longitude),
      );
      return { x: point.x, y: point.y };
    };
    const merge = (left, right) => {
      const count = left.count + right.count;
      return {
        latitude: ((left.latitude * left.count) + (right.latitude * right.count)) / count,
        longitude: ((left.longitude * left.count) + (right.longitude * right.count)) / count,
        count,
      };
    };

    let clusters = sourceClusters
      .map((cluster) => ({
        latitude: Number(cluster.latitude),
        longitude: Number(cluster.longitude),
        count: Number(cluster.count),
      }))
      .filter((cluster) => (
        Number.isFinite(cluster.latitude)
        && Number.isFinite(cluster.longitude)
        && Number.isFinite(cluster.count)
        && cluster.count > 0
      ))
      .sort((a, b) => b.count - a.count);

    for (let pass = 0; pass < 4; pass += 1) {
      const merged = [];

      clusters.forEach((cluster) => {
        const clusterPoint = project(cluster);
        let closestIndex = -1;
        let closestDistance = Infinity;

        merged.forEach((candidate, index) => {
          const candidatePoint = project(candidate);
          const distance = Math.hypot(
            clusterPoint.x - candidatePoint.x,
            clusterPoint.y - candidatePoint.y,
          );
          const minimumDistance = (
            (getClusterMarkerSize(cluster.count) + getClusterMarkerSize(candidate.count)) / 2
          ) + CLUSTER_MARKER_GAP_PX;

          if (distance < minimumDistance && distance < closestDistance) {
            closestIndex = index;
            closestDistance = distance;
          }
        });

        if (closestIndex < 0) merged.push(cluster);
        else merged[closestIndex] = merge(merged[closestIndex], cluster);
      });

      if (merged.length === clusters.length) break;
      clusters = merged.sort((a, b) => b.count - a.count);
    }

    return clusters;
  };

  const renderServerClusters = (clusters) => {
    if (!map || !maps) return 0;
    clearMarkers();

    const displayClusters = mergeOverlappingClusters(clusters);

    displayClusters.forEach((cluster, index) => {
      const marker = new maps.Marker({
        map,
        position: new maps.LatLng(cluster.latitude, cluster.longitude),
        title: `매장 ${cluster.count}곳`,
        image: createClusterMarkerImage(cluster.count),
        zIndex: 10 + Math.min(cluster.count, 1_000),
      });
      maps.event.addListener(marker, 'click', () => {
        if (pendingClusterSearchHandler) {
          maps.event.removeListener(map, 'idle', pendingClusterSearchHandler);
        }

        pendingClusterSearchHandler = () => {
          maps.event.removeListener(map, 'idle', pendingClusterSearchHandler);
          pendingClusterSearchHandler = null;
          window.requestAnimationFrame(() => {
            loadStoresInView({ forceIndividual: true });
          });
        };
        maps.event.addListener(map, 'idle', pendingClusterSearchHandler);
        suppressViewportUntil = Date.now() + 800;
        map.setLevel(Math.max(
          KOREA_MAP_LIMIT.minLevel,
          Math.min(map.getLevel() - 2, INDIVIDUAL_MARKER_MAX_LEVEL),
        ));
        map.setCenter(marker.getPosition());
      });
      markers.push({ storeId: `cluster-${index}`, marker });
    });

    return displayClusters.length;
  };

  const loadStoresInView = async ({ forceIndividual = false } = {}) => {
    if (!map) return;

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const level = map.getLevel();
    const shouldUseClusters = !forceIndividual && level >= SERVER_CLUSTER_MIN_LEVEL;
    const params = new URLSearchParams({
      swLat: clamp(sw.getLat(), KOREA_MAP_LIMIT.minLatitude, KOREA_MAP_LIMIT.maxLatitude).toFixed(6),
      swLng: clamp(sw.getLng(), KOREA_MAP_LIMIT.minLongitude, KOREA_MAP_LIMIT.maxLongitude).toFixed(6),
      neLat: clamp(ne.getLat(), KOREA_MAP_LIMIT.minLatitude, KOREA_MAP_LIMIT.maxLatitude).toFixed(6),
      neLng: clamp(ne.getLng(), KOREA_MAP_LIMIT.minLongitude, KOREA_MAP_LIMIT.maxLongitude).toFixed(6),
    });
    appendSelectedServiceParams(params);
    if (shouldUseClusters) {
      params.set('level', String(level));
    } else {
      const center = map.getCenter();
      params.set('latitude', clamp(
        center.getLat(),
        KOREA_MAP_LIMIT.minLatitude,
        KOREA_MAP_LIMIT.maxLatitude,
      ).toFixed(6));
      params.set('longitude', clamp(
        center.getLng(),
        KOREA_MAP_LIMIT.minLongitude,
        KOREA_MAP_LIMIT.maxLongitude,
      ).toFixed(6));
    }
    const requestKey = `${shouldUseClusters ? 'clusters' : 'stores'}:${level}:${params.toString()}`;
    if (requestKey === lastViewportRequestKey) {
      hideViewportSearch();
      return;
    }

    lastViewportRequestKey = requestKey;
    hideViewportSearch();
    if (viewportSearchButton) viewportSearchButton.disabled = true;
    viewportAbortController?.abort();
    const requestController = new AbortController();
    viewportAbortController = requestController;
    const requestId = ++viewportRequestId;
    setStatus('현재 지도 영역의 매장을 찾고 있습니다.');

    try {
      if (shouldUseClusters) {
        const response = await api.get(
          `/stores/map/clusters?${params.toString()}`,
          { signal: requestController.signal },
        );
        if (requestId !== viewportRequestId) return;

        const clusters = unwrap(response) || [];
        const total = clusters.reduce((sum, cluster) => sum + cluster.count, 0);
        regionSearchActive = false;
        renderPagination(null);
        renderClusterSummary(total);
        const displayedClusterCount = renderServerClusters(clusters);
        setStatus(`현재 지도 영역의 매장 ${total}곳을 ${displayedClusterCount}개 클러스터로 표시했습니다.`);
        return;
      }

      const response = await api.get(
        `/stores/map?${params.toString()}`,
        { signal: requestController.signal },
      );
      const nextStores = unwrap(response) || [];
      if (requestId !== viewportRequestId) return;

      const sortedStores = [...nextStores].sort((a, b) => {
        const aDistance = Number.isFinite(a.distanceKm) ? a.distanceKm : Infinity;
        const bDistance = Number.isFinite(b.distanceKm) ? b.distanceKm : Infinity;
        return aDistance - bDistance || a.storeId - b.storeId;
      });

      regionSearchActive = false;
      renderPagination(null);
      renderList(sortedStores.slice(0, MAP_LIST_LIMIT), { total: sortedStores.length });
      renderMarkers(sortedStores);
      const listNotice = sortedStores.length > MAP_LIST_LIMIT
        ? ` 목록에는 ${MAP_LIST_LIMIT}곳만 표시합니다.`
        : '';
      setStatus(`현재 지도 영역에서 매장 ${nextStores.length}곳을 찾았습니다.${listNotice}`);
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (requestId !== viewportRequestId) return;
      lastViewportRequestKey = '';
      showViewportSearch();
      setStatus(`현재 지도 영역 매장 조회 실패: ${error.message}`, true);
    } finally {
      if (viewportAbortController === requestController) {
        viewportAbortController = null;
      }
      if (viewportSearchButton) viewportSearchButton.disabled = false;
    }
  };

  const fitMapToStores = (nextStores) => {
    if (!map || !maps || !nextStores.length) return;

    suppressViewportUntil = Date.now() + 600;
    if (nextStores.length === 1) {
      map.setCenter(new maps.LatLng(nextStores[0].latitude, nextStores[0].longitude));
      map.setLevel(3);
      return;
    }

    const bounds = new maps.LatLngBounds();
    nextStores.forEach((store) => {
      bounds.extend(new maps.LatLng(store.latitude, store.longitude));
    });
    map.setBounds(bounds);
  };

  const ensureMap = () => {
    if (map) return Promise.resolve(map);
    if (mapInitPromise) return mapInitPromise;

    setStatus('카카오 지도를 준비하고 있습니다.');
    mapInitPromise = loadKakaoMaps()
      .then((loadedMaps) => {
        maps = loadedMaps;
        mapElement.replaceChildren();
        map = new maps.Map(mapElement, {
          center: new maps.LatLng(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude),
          level: 3,
        });
        map.setMinLevel(KOREA_MAP_LIMIT.minLevel);
        map.setMaxLevel(KOREA_MAP_LIMIT.maxLevel);
        map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
        infoWindow = new maps.InfoWindow({ zIndex: 5 });
        maps.event.addListener(map, 'idle', () => {
          if (Date.now() < suppressViewportUntil) return;
          if (keepMapInsideKorea()) return;
          showViewportSearch();
        });
        maps.event.addListener(map, 'click', clearStoreSelection);

        window.requestAnimationFrame(() => {
          suppressViewportUntil = Date.now() + 600;
          map.relayout();
          map.setCenter(new maps.LatLng(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude));
          map.setLevel(3);
          loadStoresInView();
        });

        return map;
      })
      .catch((error) => {
        mapInitPromise = null;
        mapElement.innerHTML = `<div class="stores-map-placeholder"></div>`;
        mapElement.querySelector('.stores-map-placeholder').textContent = `${error.message} .env.local에 카카오 JavaScript 키를 설정해 주세요.`;
        throw error;
      });

    return mapInitPromise;
  };

  const focusMap = async (latitude, longitude, label) => {
    try {
      await ensureMap();
      suppressViewportUntil = Date.now() + 600;
      map.relayout();
      map.setCenter(new maps.LatLng(latitude, longitude));
      map.setLevel(3);
      setStatus(`${label} 중심으로 현재 지도 영역의 매장을 찾고 있습니다.`);
      await loadStoresInView();
    } catch {
      // ensureMap already exposes the user-facing error in the map/status area.
    }
  };

  const searchLocation = async () => {
    const query = searchInput.value.trim();
    if (!query) {
      setStatus('검색할 주소나 지역명을 입력해 주세요.', true);
      return;
    }

    searchButton.disabled = true;
    setStatus(`“${query}” 위치를 찾고 있습니다.`);
    try {
      const response = await api.get(`/locations/search?query=${encodeURIComponent(query)}`);
      const locations = unwrap(response) || [];
      const location = locations[0];
      if (!location) {
        setStatus('검색 결과가 없습니다. 다른 주소나 지역명을 입력해 주세요.', true);
        return;
      }
      searchInput.value = location.roadAddress || location.address || location.name || query;
      await focusMap(location.latitude, location.longitude, location.name || query);
    } catch (error) {
      setStatus(`지역 검색 실패: ${error.message}`, true);
    } finally {
      searchButton.disabled = false;
    }
  };

  const searchStoresByRegion = async (page = 0) => {
    const sido = sidoSelect?.value.trim() || '';
    const sigungu = sigunguSelect?.value.trim() || '';
    const params = new URLSearchParams();
    if (sido) params.set('sido', sido);
    if (sigungu) params.set('sigungu', sigungu);
    params.set('page', String(page));
    params.set('size', String(STORE_PAGE_SIZE));
    appendSelectedServiceParams(params);

    viewportAbortController?.abort();
    viewportAbortController = null;
    lastViewportRequestKey = '';
    viewportRequestId += 1;
    suppressViewportUntil = Date.now() + 800;
    regionSearchButton.disabled = true;
    setStatus('선택한 지역의 매장을 찾고 있습니다.');

    try {
      await ensureMap();
      const response = await api.get(`/stores?${params.toString()}`);
      const pageData = unwrap(response);
      const nextStores = pageData?.content || [];
      currentRegionPage = pageData?.page || 0;
      regionSearchActive = true;
      selectedStoreId = null;
      const numberOffset = currentRegionPage * STORE_PAGE_SIZE;
      renderList(nextStores, { total: pageData?.totalElements || 0, numberOffset });
      renderMarkers(nextStores, { numberOffset });
      renderPagination(pageData);
      fitMapToStores(nextStores);

      const regionLabel = [sido, sigungu].filter(Boolean).join(' ') || '전체 지역';
      const selectedServices = getSelectedServices();
      const serviceLabel = selectedServices.length
        ? selectedServices.map(({ label }) => label).join(' + ')
        : '전체 서비스';
      setStatus(`${regionLabel} · ${serviceLabel} 조건으로 매장 ${pageData?.totalElements || 0}곳을 찾았습니다.`);
    } catch (error) {
      setStatus(`지역별 매장 조회 실패: ${error.message}`, true);
    } finally {
      regionSearchButton.disabled = false;
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus('이 브라우저에서는 현재 위치를 사용할 수 없습니다.', true);
      return;
    }

    locationButton.disabled = true;
    setStatus('현재 위치를 확인하고 있습니다.');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await focusMap(coords.latitude, coords.longitude, '현재 위치');
        } finally {
          locationButton.disabled = false;
        }
      },
      () => {
        locationButton.disabled = false;
        setStatus('위치 권한을 허용하면 현재 위치 주변 매장을 찾을 수 있습니다.', true);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  };

  searchButton.addEventListener('click', searchLocation);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') searchLocation();
  });
  locationButton?.addEventListener('click', useCurrentLocation);
  viewportSearchButton?.addEventListener('click', loadStoresInView);
  regionSearchButton?.addEventListener('click', () => searchStoresByRegion(0));
  prevPageButton?.addEventListener('click', () => {
    if (regionSearchActive && currentRegionPage > 0) searchStoresByRegion(currentRegionPage - 1);
  });
  nextPageButton?.addEventListener('click', () => {
    if (regionSearchActive) searchStoresByRegion(currentRegionPage + 1);
  });
  sidoSelect?.addEventListener('change', () => loadSigungus(sidoSelect.value));
  serviceToggle?.addEventListener('click', toggleServicePanel);
  serviceTypeInputs.forEach((input) => input.addEventListener('change', updateServiceSummary));
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.store-service-filter')) closeServicePanel();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeServicePanel();
  });

  document.addEventListener('ubot:route-change', (event) => {
    if (event.detail?.route !== 'stores') return;
    window.setTimeout(() => {
      ensureMap().then(() => {
        map.relayout();
        if (!stores.length) loadStoresInView();
      }).catch(() => {});
    }, 80);
  });

  loadSidos();

  if (document.body.dataset.route === 'stores') {
    ensureMap().catch(() => {});
  } else {
    setStatus(`${DEFAULT_LOCATION.label}을 기본 위치로 사용합니다. 매장 찾기에 들어가면 현재 지도 영역의 매장을 조회합니다.`);
  }
}
