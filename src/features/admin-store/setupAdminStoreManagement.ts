import {
  createAdminStore,
  deleteAdminStore,
  getAdminStoreDetail,
  getAdminStorePage,
  updateAdminStore,
} from '../../api/adminStores';
import { ApiError } from '../../api/client';
import { coordinatesForAddress, loadDaumPostcode } from '../../shared/kakao/sdk';
import type { AdminStorePayload, Store } from '../../types/store';

const PAGE_SIZE = 20;
const KOREA_BOUNDS = {
  minLatitude: 33,
  maxLatitude: 39,
  minLongitude: 124,
  maxLongitude: 132,
};

function adminErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return '요청을 처리하지 못했습니다.';
  const apiError = error instanceof ApiError ? error : null;
  if (apiError?.status === 401) return '로그인이 필요합니다.';
  if (apiError?.status === 403) return '관리자 권한이 필요합니다.';
  if (apiError?.code === 'STORE-002' || apiError?.code === 'DUPLICATE_STORE') return '이미 등록된 매장입니다.';
  if (apiError?.code === 'STORE-003') {
    return '삭제된 동일 매장이 존재합니다. 기존 매장 복구가 필요합니다.';
  }
  return error.message || '요청을 처리하지 못했습니다.';
}

function optionalValue(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

export function setupAdminStoreManagement(): () => void {
  const root = document.querySelector<HTMLElement>('[data-page="admin"]');
  const dialog = document.querySelector<HTMLDialogElement>('#adminStoreDialog');
  const form = document.querySelector<HTMLFormElement>('#adminStoreForm');
  const rows = document.querySelector<HTMLTableSectionElement>('#adminStoreRows');
  if (!root || !dialog || !form || !rows || root.dataset.storeManagementReady) return () => {};

  const tabs = [...root.querySelectorAll<HTMLElement>('[data-admin-tab]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-admin-panel]')];
  const pageTitle = document.querySelector<HTMLElement>('#adminPageTitle');
  const pageDescription = document.querySelector<HTMLElement>('#adminPageDescription');
  const notice = document.querySelector<HTMLElement>('#adminStoreNotice');
  const empty = document.querySelector<HTMLElement>('#adminStoreEmpty');
  const pageInfo = document.querySelector<HTMLElement>('#adminStorePageInfo');
  const prevButton = document.querySelector<HTMLButtonElement>('#adminStorePrev');
  const nextButton = document.querySelector<HTMLButtonElement>('#adminStoreNext');
  const createButton = document.querySelector<HTMLButtonElement>('#adminStoreCreate');
  const closeButton = document.querySelector<HTMLButtonElement>('#adminStoreDialogClose');
  const submitButton = document.querySelector<HTMLButtonElement>('#adminStoreSubmit');
  const formTitle = document.querySelector<HTMLElement>('#adminStoreFormTitle');
  const formMessage = document.querySelector<HTMLElement>('#adminStoreFormMessage');
  const addressSearchButton = document.querySelector<HTMLButtonElement>('#adminStoreAddressSearch');
  const idInput = document.querySelector<HTMLInputElement>('#adminStoreId');
  const nameInput = document.querySelector<HTMLInputElement>('#adminStoreName');
  const sidoInput = document.querySelector<HTMLInputElement>('#adminStoreSido');
  const sigunguInput = document.querySelector<HTMLInputElement>('#adminStoreSigungu');
  const addressInput = document.querySelector<HTMLInputElement>('#adminStoreAddress');
  const latitudeInput = document.querySelector<HTMLInputElement>('#adminStoreLatitude');
  const longitudeInput = document.querySelector<HTMLInputElement>('#adminStoreLongitude');
  const phoneInput = document.querySelector<HTMLInputElement>('#adminStorePhone');
  const hoursInput = document.querySelector<HTMLInputElement>('#adminStoreHours');
  const serviceInputs = [...form.querySelectorAll<HTMLInputElement>('input[name="adminServiceCode"]')];
  const toast = document.querySelector<HTMLElement>('#toast');

  if (!pageTitle || !pageDescription || !notice || !empty || !pageInfo
    || !prevButton || !nextButton || !createButton || !closeButton || !submitButton
    || !formTitle || !formMessage || !addressSearchButton || !idInput || !nameInput
    || !sidoInput || !sigunguInput || !addressInput || !latitudeInput || !longitudeInput
    || !phoneInput || !hoursInput) return () => {};
  root.dataset.storeManagementReady = 'true';

  let currentPage = 0;
  let totalPages = 1;
  let listLoaded = false;
  let visibleStores = new Map<number, Store>();
  let editingStoreId: number | null = null;
  let toastTimer: number | undefined;
  let editFrameId: number | undefined;
  let disposed = false;
  const abortController = new AbortController();

  const showSuccess = (message: string) => {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
  };

  const setNotice = (message: string, type = '') => {
    notice.textContent = message;
    notice.dataset.type = type;
    notice.hidden = !message;
  };

  const setFormMessage = (message = '', isError = true) => {
    formMessage.textContent = message;
    formMessage.classList.toggle('success', Boolean(message) && !isError);
  };

  const renderRows = (stores: Store[]) => {
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
      const pageData = await getAdminStorePage(page, PAGE_SIZE, abortController.signal);
      if (disposed) return;
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

  const selectTab = (name: string) => {
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

  const fillForm = (store: Store, fallbackStoreId: number) => {
    editingStoreId = Number(store.storeId ?? fallbackStoreId);
    idInput.defaultValue = String(editingStoreId);
    idInput.value = String(editingStoreId);
    nameInput.value = store.storeName || '';
    sidoInput.value = store.sido || '';
    sigunguInput.value = store.sigungu || '';
    addressInput.value = store.address || '';
    latitudeInput.value = String(store.latitude ?? '');
    longitudeInput.value = String(store.longitude ?? '');
    phoneInput.defaultValue = store.phoneNumber || '';
    phoneInput.value = store.phoneNumber || '';
    hoursInput.value = store.businessHours || '';
    const serviceCodes = new Set((store.services || []).map((service) => service.code));
    serviceInputs.forEach((input) => { input.checked = serviceCodes.has(input.value); });
  };

  const openEditDialog = async (storeId: number) => {
    resetForm();
    formTitle.textContent = '매장 정보 수정';
    submitButton.textContent = '수정 내용 저장';
    submitButton.disabled = true;
    setNotice('매장 상세 정보를 불러오고 있습니다.');
    try {
      const detail = await getAdminStoreDetail(storeId, abortController.signal);
      if (disposed) return;
      const store = { ...(visibleStores.get(storeId) || {}), ...detail };
      fillForm(store, storeId);
      dialog.showModal();
      editFrameId = window.requestAnimationFrame(() => {
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

  const buildPayload = (): AdminStorePayload => ({
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

  const validatePayload = (payload: AdminStorePayload) => {
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
            setFormMessage(adminErrorMessage(error));
          }
        },
      }).open();
    } catch (error) {
      setFormMessage(adminErrorMessage(error));
    } finally {
      addressSearchButton.disabled = false;
    }
  };

  const tabHandlers = new Map<HTMLElement, () => void>();
  tabs.forEach((tab) => {
    const handler = () => selectTab(tab.dataset.adminTab || 'operations');
    tabHandlers.set(tab, handler);
    tab.addEventListener('click', handler);
  });
  const closeDialog = () => dialog.close();
  const previousPage = () => { void loadStores(currentPage - 1); };
  const nextPage = () => { void loadStores(currentPage + 1); };
  createButton.addEventListener('click', openCreateDialog);
  closeButton.addEventListener('click', closeDialog);
  addressSearchButton.addEventListener('click', searchAddress);
  prevButton.addEventListener('click', previousPage);
  nextButton.addEventListener('click', nextPage);

  const handleRowsClick = async (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('[data-store-action]');
    if (!button) return;
    const row = button.closest<HTMLTableRowElement>('tr[data-store-id]');
    if (!row) return;
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
      await deleteAdminStore(storeId, abortController.signal);
      await loadStores(currentPage);
      showSuccess('매장이 삭제되었습니다.');
    } catch (error) {
      setNotice(`매장을 삭제하지 못했습니다. ${adminErrorMessage(error)}`, 'error');
      button.disabled = false;
    }
  };
  rows.addEventListener('click', handleRowsClick);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setFormMessage();
    const payload = buildPayload();
    if (!validatePayload(payload)) return;

    const storeId = editingStoreId;
    submitButton.disabled = true;
    submitButton.textContent = storeId ? '수정 중…' : '등록 중…';
    try {
      await (storeId
        ? updateAdminStore(storeId, payload, abortController.signal)
        : createAdminStore(payload, abortController.signal));
      dialog.close();
      await loadStores(storeId ? currentPage : 0);
      showSuccess(storeId ? '매장 정보가 수정되었습니다.' : '새 매장이 등록되었습니다.');
    } catch (error) {
      setFormMessage(adminErrorMessage(error));
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = storeId ? '수정 내용 저장' : '등록하기';
    }
  };
  form.addEventListener('submit', handleSubmit);

  const handleRouteChange = (event: Event) => {
    const routeEvent = event as CustomEvent<{ route?: string }>;
    if (routeEvent.detail?.route === 'admin') selectTab('operations');
  };
  document.addEventListener('ubot:route-change', handleRouteChange);

  selectTab('operations');

  return () => {
    disposed = true;
    abortController.abort();
    tabHandlers.forEach((handler, tab) => tab.removeEventListener('click', handler));
    createButton.removeEventListener('click', openCreateDialog);
    closeButton.removeEventListener('click', closeDialog);
    addressSearchButton.removeEventListener('click', searchAddress);
    prevButton.removeEventListener('click', previousPage);
    nextButton.removeEventListener('click', nextPage);
    rows.removeEventListener('click', handleRowsClick);
    form.removeEventListener('submit', handleSubmit);
    document.removeEventListener('ubot:route-change', handleRouteChange);
    window.clearTimeout(toastTimer);
    if (editFrameId !== undefined) window.cancelAnimationFrame(editFrameId);
    if (dialog.open) dialog.close();
    delete root.dataset.storeManagementReady;
  };
}

