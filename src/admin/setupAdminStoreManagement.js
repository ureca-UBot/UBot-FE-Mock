import {
  createAdminStore,
  deleteAdminStore,
  getAdminStoreDetail,
  getAdminStorePage,
  updateAdminStore,
} from '../api/adminStores.js';
import { loadKakaoMaps } from '../stores/storeLocator.js';

const PAGE_SIZE = 20;
const KOREA_BOUNDS = {
  minLatitude: 33,
  maxLatitude: 39,
  minLongitude: 124,
  maxLongitude: 132,
};

function adminErrorMessage(error) {
  if (error.status === 401) return '로그인이 필요합니다.';
  if (error.status === 403) return '관리자 권한이 필요합니다.';
  if (error.code === 'STORE-002' || error.code === 'DUPLICATE_STORE') return '이미 등록된 매장입니다.';
  if (error.code === 'STORE-003') {
    return '삭제된 동일 매장이 존재합니다. 기존 매장 복구가 필요합니다.';
  }
  return error.message || '요청을 처리하지 못했습니다.';
}

let postcodePromise;

function loadDaumPostcode() {
  const loadedPostcode = window.kakao?.Postcode || window.daum?.Postcode;
  if (loadedPostcode) return Promise.resolve(loadedPostcode);
  if (postcodePromise) return postcodePromise;

  postcodePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-ubot-daum-postcode]');
    const script = existing || document.createElement('script');
    const onReady = () => {
      const Postcode = window.kakao?.Postcode || window.daum?.Postcode;
      if (Postcode) resolve(Postcode);
      else reject(new Error('주소 검색 서비스를 불러오지 못했습니다.'));
    };

    if (existing) {
      existing.addEventListener('load', onReady, { once: true });
      existing.addEventListener('error', () => reject(new Error('주소 검색 서비스 로드에 실패했습니다.')), { once: true });
      return;
    }

    script.dataset.ubotDaumPostcode = '1';
    script.async = true;
    script.src = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.addEventListener('load', onReady, { once: true });
    script.addEventListener('error', () => reject(new Error('주소 검색 서비스 로드에 실패했습니다.')), { once: true });
    document.head.appendChild(script);
  });

  return postcodePromise;
}

function coordinatesForAddress(address) {
  return loadKakaoMaps().then((maps) => new Promise((resolve, reject) => {
    if (!maps.services?.Geocoder) {
      reject(new Error('카카오 주소 좌표 변환 서비스를 사용할 수 없습니다.'));
      return;
    }

    const geocoder = new maps.services.Geocoder();
    geocoder.addressSearch(address, (results, status) => {
      if (status !== maps.services.Status.OK || !results.length) {
        reject(new Error('선택한 주소의 좌표를 찾지 못했습니다.'));
        return;
      }
      resolve({ latitude: Number(results[0].y), longitude: Number(results[0].x) });
    });
  }));
}

function optionalValue(value) {
  const normalized = value.trim();
  return normalized || null;
}

export function setupAdminStoreManagement() {
  const root = document.querySelector('[data-page="admin"]');
  const dialog = document.querySelector('#adminStoreDialog');
  const form = document.querySelector('#adminStoreForm');
  const rows = document.querySelector('#adminStoreRows');
  if (!root || !dialog || !form || !rows || root.dataset.storeManagementReady) return;
  root.dataset.storeManagementReady = 'true';

  const tabs = [...root.querySelectorAll('[data-admin-tab]')];
  const panels = [...root.querySelectorAll('[data-admin-panel]')];
  const pageTitle = document.querySelector('#adminPageTitle');
  const pageDescription = document.querySelector('#adminPageDescription');
  const notice = document.querySelector('#adminStoreNotice');
  const empty = document.querySelector('#adminStoreEmpty');
  const pageInfo = document.querySelector('#adminStorePageInfo');
  const prevButton = document.querySelector('#adminStorePrev');
  const nextButton = document.querySelector('#adminStoreNext');
  const createButton = document.querySelector('#adminStoreCreate');
  const closeButton = document.querySelector('#adminStoreDialogClose');
  const submitButton = document.querySelector('#adminStoreSubmit');
  const formTitle = document.querySelector('#adminStoreFormTitle');
  const formMessage = document.querySelector('#adminStoreFormMessage');
  const addressSearchButton = document.querySelector('#adminStoreAddressSearch');
  const idInput = document.querySelector('#adminStoreId');
  const nameInput = document.querySelector('#adminStoreName');
  const sidoInput = document.querySelector('#adminStoreSido');
  const sigunguInput = document.querySelector('#adminStoreSigungu');
  const addressInput = document.querySelector('#adminStoreAddress');
  const latitudeInput = document.querySelector('#adminStoreLatitude');
  const longitudeInput = document.querySelector('#adminStoreLongitude');
  const phoneInput = document.querySelector('#adminStorePhone');
  const hoursInput = document.querySelector('#adminStoreHours');
  const serviceInputs = [...form.querySelectorAll('input[name="adminServiceCode"]')];
  const toast = document.querySelector('#toast');

  let currentPage = 0;
  let totalPages = 1;
  let listLoaded = false;
  let visibleStores = new Map();
  let editingStoreId = null;
  let toastTimer;

  const showSuccess = (message) => {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
  };

  const setNotice = (message, type = '') => {
    notice.textContent = message;
    notice.dataset.type = type;
    notice.hidden = !message;
  };

  const setFormMessage = (message = '', isError = true) => {
    formMessage.textContent = message;
    formMessage.classList.toggle('success', Boolean(message) && !isError);
  };

  const renderRows = (stores) => {
    rows.replaceChildren();
    visibleStores = new Map(stores.map((store) => [Number(store.storeId), store]));
    empty.classList.toggle('hidden', stores.length > 0);

    stores.forEach((store) => {
      const row = document.createElement('tr');
      row.dataset.storeId = String(store.storeId);

      const storeCell = document.createElement('td');
      const storeName = document.createElement('strong');
      const address = document.createElement('small');
      storeName.textContent = store.storeName;
      address.textContent = store.address;
      storeCell.append(storeName, address);

      const regionCell = document.createElement('td');
      regionCell.textContent = [store.sido, store.sigungu].filter(Boolean).join(' ') || '-';
      const phoneCell = document.createElement('td');
      phoneCell.textContent = store.phoneNumber || '-';
      const hoursCell = document.createElement('td');
      hoursCell.textContent = store.businessHours || '-';

      const actionCell = document.createElement('td');
      actionCell.className = 'admin-store-actions';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.dataset.storeAction = 'edit';
      editButton.textContent = '수정';
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.dataset.storeAction = 'delete';
      deleteButton.className = 'danger';
      deleteButton.textContent = '삭제';
      actionCell.append(editButton, deleteButton);

      row.append(storeCell, regionCell, phoneCell, hoursCell, actionCell);
      rows.appendChild(row);
    });
  };

  const loadStores = async (page = currentPage) => {
    setNotice('매장 정보를 불러오고 있습니다.');
    prevButton.disabled = true;
    nextButton.disabled = true;
    try {
      const pageData = await getAdminStorePage(page, PAGE_SIZE);
      const stores = pageData?.content || [];
      currentPage = pageData?.page ?? page;
      totalPages = Math.max(pageData?.totalPages || 1, 1);
      renderRows(stores);
      pageInfo.textContent = `${currentPage + 1} / ${totalPages}`;
      prevButton.disabled = currentPage <= 0;
      nextButton.disabled = currentPage + 1 >= totalPages;
      listLoaded = true;
      setNotice(`활성 매장 ${Number(pageData?.totalElements || 0).toLocaleString()}곳`, 'success');
    } catch (error) {
      renderRows([]);
      setNotice(`매장 목록을 불러오지 못했습니다. ${adminErrorMessage(error)}`, 'error');
    }
  };

  const selectTab = (name) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.adminTab === name;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    panels.forEach((panel) => panel.classList.toggle('hidden', panel.dataset.adminPanel !== name));

    const storeView = name === 'stores';
    pageTitle.textContent = storeView ? '매장 운영 관리' : 'AI 상담 운영 대시보드';
    pageDescription.textContent = storeView
      ? '매장 기본 정보와 제공 서비스를 등록하고 관리합니다.'
      : '1~9번 시연에서 발생한 질문·캐시·미응답·지연 지표를 확인합니다.';
    if (storeView && !listLoaded) loadStores(0);
  };

  const resetForm = () => {
    form.reset();
    editingStoreId = null;
    idInput.value = '';
    idInput.defaultValue = '';
    phoneInput.value = '';
    phoneInput.defaultValue = '';
    serviceInputs.forEach((input) => { input.checked = false; });
    setFormMessage();
  };

  const openCreateDialog = () => {
    resetForm();
    formTitle.textContent = '매장 등록';
    submitButton.textContent = '등록하기';
    dialog.showModal();
    nameInput.focus();
  };

  const fillForm = (store, fallbackStoreId) => {
    editingStoreId = Number(store.storeId ?? fallbackStoreId);
    idInput.defaultValue = String(editingStoreId);
    idInput.value = String(editingStoreId);
    nameInput.value = store.storeName || '';
    sidoInput.value = store.sido || '';
    sigunguInput.value = store.sigungu || '';
    addressInput.value = store.address || '';
    latitudeInput.value = store.latitude ?? '';
    longitudeInput.value = store.longitude ?? '';
    phoneInput.defaultValue = store.phoneNumber || '';
    phoneInput.value = store.phoneNumber || '';
    hoursInput.value = store.businessHours || '';
    const serviceCodes = new Set((store.services || []).map((service) => service.code));
    serviceInputs.forEach((input) => { input.checked = serviceCodes.has(input.value); });
  };

  const openEditDialog = async (storeId) => {
    resetForm();
    formTitle.textContent = '매장 정보 수정';
    submitButton.textContent = '수정 내용 저장';
    submitButton.disabled = true;
    setNotice('매장 상세 정보를 불러오고 있습니다.');
    try {
      const detail = await getAdminStoreDetail(storeId);
      const store = { ...(visibleStores.get(storeId) || {}), ...detail };
      fillForm(store, storeId);
      dialog.showModal();
      window.requestAnimationFrame(() => {
        idInput.value = String(editingStoreId);
        phoneInput.value = store.phoneNumber || '';
      });
      setNotice('매장 상세 정보를 불러왔습니다.', 'success');
    } catch (error) {
      setNotice(`매장 상세 정보를 불러오지 못했습니다. ${adminErrorMessage(error)}`, 'error');
    } finally {
      submitButton.disabled = false;
    }
  };

  const buildPayload = () => ({
    storeName: nameInput.value.trim(),
    sido: sidoInput.value.trim(),
    sigungu: sigunguInput.value.trim(),
    address: addressInput.value.trim(),
    latitude: Number(latitudeInput.value),
    longitude: Number(longitudeInput.value),
    phoneNumber: optionalValue(phoneInput.value),
    businessHours: optionalValue(hoursInput.value),
    serviceCodes: serviceInputs.filter((input) => input.checked).map((input) => input.value),
  });

  const validatePayload = (payload) => {
    if (!form.reportValidity()) return false;
    const { latitude, longitude } = payload;
    if (latitude < KOREA_BOUNDS.minLatitude || latitude > KOREA_BOUNDS.maxLatitude
      || longitude < KOREA_BOUNDS.minLongitude || longitude > KOREA_BOUNDS.maxLongitude) {
      setFormMessage('위도는 33~39, 경도는 124~132 범위여야 합니다.');
      return false;
    }
    return true;
  };

  const searchAddress = async () => {
    addressSearchButton.disabled = true;
    setFormMessage('주소 검색 서비스를 불러오고 있습니다.', false);
    try {
      const Postcode = await loadDaumPostcode();
      setFormMessage('주소 검색 창에서 주소를 선택해 주세요.', false);
      new Postcode({
        oncomplete: async (data) => {
          const address = data.roadAddress || data.jibunAddress;
          addressInput.value = address;
          sidoInput.value = data.sido || '';
          sigunguInput.value = data.sigungu || '';
          latitudeInput.value = '';
          longitudeInput.value = '';
          setFormMessage('주소의 좌표를 확인하고 있습니다.', false);
          try {
            const coordinates = await coordinatesForAddress(address);
            latitudeInput.value = coordinates.latitude.toFixed(7);
            longitudeInput.value = coordinates.longitude.toFixed(7);
            setFormMessage('주소와 좌표가 자동 입력되었습니다.', false);
          } catch (error) {
            setFormMessage(error.message);
          }
        },
      }).open();
    } catch (error) {
      setFormMessage(error.message);
    } finally {
      addressSearchButton.disabled = false;
    }
  };

  tabs.forEach((tab) => tab.addEventListener('click', () => selectTab(tab.dataset.adminTab)));
  createButton.addEventListener('click', openCreateDialog);
  closeButton.addEventListener('click', () => dialog.close());
  addressSearchButton.addEventListener('click', searchAddress);
  prevButton.addEventListener('click', () => loadStores(currentPage - 1));
  nextButton.addEventListener('click', () => loadStores(currentPage + 1));

  rows.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-store-action]');
    if (!button) return;
    const row = button.closest('tr[data-store-id]');
    const storeId = Number(row?.dataset.storeId);
    if (!storeId) return;

    if (button.dataset.storeAction === 'edit') {
      await openEditDialog(storeId);
      return;
    }

    const storeName = row.querySelector('strong')?.textContent || '이 매장';
    if (!window.confirm(`“${storeName}” 매장을 삭제할까요?\n삭제된 매장은 사용자 화면에서 조회되지 않습니다.`)) return;
    button.disabled = true;
    try {
      await deleteAdminStore(storeId);
      await loadStores(currentPage);
      showSuccess('매장이 삭제되었습니다.');
    } catch (error) {
      setNotice(`매장을 삭제하지 못했습니다. ${adminErrorMessage(error)}`, 'error');
      button.disabled = false;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setFormMessage();
    const payload = buildPayload();
    if (!validatePayload(payload)) return;

    const storeId = editingStoreId;
    submitButton.disabled = true;
    submitButton.textContent = storeId ? '수정 중…' : '등록 중…';
    try {
      await (storeId ? updateAdminStore(storeId, payload) : createAdminStore(payload));
      dialog.close();
      await loadStores(storeId ? currentPage : 0);
      showSuccess(storeId ? '매장 정보가 수정되었습니다.' : '새 매장이 등록되었습니다.');
    } catch (error) {
      setFormMessage(adminErrorMessage(error));
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = storeId ? '수정 내용 저장' : '등록하기';
    }
  });

  document.addEventListener('ubot:route-change', (event) => {
    if (event.detail?.route === 'admin') selectTab('operations');
  });

  selectTab('operations');
}
