import { api } from '../api/client.js';

const DEFAULT_LOCATION = {
  latitude: 37.497942,
  longitude: 127.027621,
  label: '서울 강남구 역삼동',
};

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

function loadKakaoMaps() {
  if (window.kakao?.maps) {
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
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
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
  const sigunguInput = document.querySelector('#storeSigungu');
  const serviceTypeSelect = document.querySelector('#storeServiceType');
  const regionSearchButton = document.querySelector('#storeRegionSearchButton');
  const statusElement = document.querySelector('#storeSearchStatus');
  const countElement = document.querySelector('#storeResultCount');

  if (!mapElement || !listElement || !searchInput || !searchButton || !statusElement) return;

  let maps;
  let map;
  let infoWindow;
  let markers = [];
  let stores = [];
  let selectedStoreId = null;
  let viewportRequestId = 0;
  let viewportTimer = null;
  let mapInitPromise = null;
  let suppressViewportUntil = 0;

  const setStatus = (message, isError = false) => {
    statusElement.textContent = message;
    statusElement.classList.toggle('error', isError);
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
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="48" viewBox="0 0 42 48"><path d="M21 1C10.5 1 2 9.3 2 19.6c0 13 19 27.4 19 27.4s19-14.4 19-27.4C40 9.3 31.5 1 21 1Z" fill="#17171a" stroke="white" stroke-width="2"/><circle cx="21" cy="19" r="12" fill="#17171a"/><text x="21" y="23" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="white">${number}</text></svg>`;
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

  const renderList = (nextStores) => {
    stores = nextStores;
    listElement.replaceChildren();
    countElement.textContent = `${stores.length}곳`;

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
      number.textContent = String(index + 1);
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
      const selectedService = serviceTypeSelect?.selectedOptions?.[0];
      if (selectedService?.value) {
        const badge = document.createElement('i');
        badge.className = 'accent';
        badge.textContent = selectedService.textContent;
        badges.appendChild(badge);
      }
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

  const renderMarkers = (nextStores) => {
    if (!map || !maps) return;
    clearMarkers();

    nextStores.forEach((store, index) => {
      const position = new maps.LatLng(store.latitude, store.longitude);
      const marker = new maps.Marker({
        map,
        position,
        title: store.storeName,
        image: createNumberedMarkerImage(index + 1),
      });
      maps.event.addListener(marker, 'click', () => selectStore(store, { moveMap: false }));
      markers.push({ storeId: store.storeId, marker });
    });

    if (selectedStoreId) {
      const selected = nextStores.find((store) => store.storeId === selectedStoreId);
      if (selected) selectStore(selected, { moveMap: false });
    }
  };

  const loadStoresInView = async () => {
    if (!map || Date.now() < suppressViewportUntil) return;

    const requestId = ++viewportRequestId;
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    setStatus('현재 지도 영역의 매장을 찾고 있습니다.');

    try {
      const params = new URLSearchParams({
        swLat: String(sw.getLat()),
        swLng: String(sw.getLng()),
        neLat: String(ne.getLat()),
        neLng: String(ne.getLng()),
      });
      const serviceType = serviceTypeSelect?.value.trim();
      if (serviceType) params.set('type', serviceType);
      const response = await api.get(`/stores/map?${params.toString()}`);
      if (requestId !== viewportRequestId) return;

      const nextStores = unwrap(response) || [];
    const sortedStores = [...nextStores].sort((a, b) => {
      const aDistance = Number.isFinite(a.distanceKm) ? a.distanceKm : Infinity;
      const bDistance = Number.isFinite(b.distanceKm) ? b.distanceKm : Infinity;
      return aDistance - bDistance;
    });

    renderList(sortedStores);
    renderMarkers(sortedStores);
      setStatus(`현재 지도 영역에서 매장 ${nextStores.length}곳을 찾았습니다.`);
    } catch (error) {
      if (requestId !== viewportRequestId) return;
      setStatus(`현재 지도 영역 매장 조회 실패: ${error.message}`, true);
    }
  };

  const queueViewportLoad = (delay = 180) => {
    window.clearTimeout(viewportTimer);
    viewportTimer = window.setTimeout(loadStoresInView, delay);
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
        infoWindow = new maps.InfoWindow({ zIndex: 5 });
        maps.event.addListener(map, 'idle', () => {
          if (Date.now() < suppressViewportUntil) return;
          queueViewportLoad();
        });
        maps.event.addListener(map, 'click', clearStoreSelection);

        window.requestAnimationFrame(() => {
          map.relayout();
          map.setCenter(new maps.LatLng(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude));
          map.setLevel(3);
          queueViewportLoad(0);
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
      map.relayout();
      map.setCenter(new maps.LatLng(latitude, longitude));
      map.setLevel(3);
      setStatus(`${label} 중심으로 현재 지도 영역의 매장을 찾고 있습니다.`);
      queueViewportLoad(0);
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

  const searchStoresByRegion = async () => {
    const sido = sidoSelect?.value.trim() || '';
    const sigungu = sigunguInput?.value.trim() || '';
    const type = serviceTypeSelect?.value.trim() || '';
    const params = new URLSearchParams();
    if (sido) params.set('sido', sido);
    if (sigungu) params.set('sigungu', sigungu);
    if (type) params.set('type', type);

    window.clearTimeout(viewportTimer);
    viewportRequestId += 1;
    suppressViewportUntil = Date.now() + 800;
    regionSearchButton.disabled = true;
    setStatus('선택한 지역의 매장을 찾고 있습니다.');

    try {
      await ensureMap();
      const query = params.toString();
      const response = await api.get(query ? `/stores?${query}` : '/stores');
      const nextStores = unwrap(response) || [];
      selectedStoreId = null;
      renderList(nextStores);
      renderMarkers(nextStores);
      fitMapToStores(nextStores);

      const regionLabel = [sido, sigungu].filter(Boolean).join(' ') || '전체 지역';
      const serviceLabel = serviceTypeSelect?.selectedOptions?.[0]?.textContent || '전체 서비스';
      setStatus(`${regionLabel} · ${serviceLabel} 조건으로 매장 ${nextStores.length}곳을 찾았습니다.`);
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
  regionSearchButton?.addEventListener('click', searchStoresByRegion);
  sigunguInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') searchStoresByRegion();
  });

  document.addEventListener('ubot:route-change', (event) => {
    if (event.detail?.route !== 'stores') return;
    window.setTimeout(() => {
      ensureMap().then(() => {
        map.relayout();
        if (!stores.length) queueViewportLoad(0);
      }).catch(() => {});
    }, 80);
  });

  if (document.body.dataset.route === 'stores') {
    ensureMap().catch(() => {});
  } else {
    setStatus(`${DEFAULT_LOCATION.label}을 기본 위치로 사용합니다. 매장 찾기에 들어가면 현재 지도 영역의 매장을 조회합니다.`);
  }
}
