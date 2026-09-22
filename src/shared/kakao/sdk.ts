import type { DaumPostcodeConstructor, KakaoMapsApi } from '../../types/kakao';

let kakaoMapsPromise: Promise<KakaoMapsApi> | undefined;
let postcodePromise: Promise<DaumPostcodeConstructor> | undefined;

export function loadKakaoMaps(): Promise<KakaoMapsApi> {
  if (window.kakao?.maps?.services) {
    const maps = window.kakao.maps;
    return new Promise((resolve) => maps.load(() => resolve(maps)));
  }

  if (kakaoMapsPromise) return kakaoMapsPromise;

  const appKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY?.trim();
  if (!appKey) {
    return Promise.reject(new Error('VITE_KAKAO_JAVASCRIPT_KEY가 설정되지 않았습니다.'));
  }

  kakaoMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-ubot-kakao-map]');
    const script = existing ?? document.createElement('script');

    const onReady = () => {
      const maps = window.kakao?.maps;
      if (!maps) {
        reject(new Error('카카오 지도 SDK를 불러오지 못했습니다.'));
        return;
      }
      maps.load(() => resolve(maps));
    };
    const onError = () => reject(new Error('카카오 지도 SDK 로드에 실패했습니다.'));

    if (existing) {
      if (window.kakao?.maps) onReady();
      else existing.addEventListener('load', onReady, { once: true });
      existing.addEventListener('error', onError, { once: true });
      return;
    }

    script.dataset.ubotKakaoMap = '1';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`;
    script.addEventListener('load', onReady, { once: true });
    script.addEventListener('error', onError, { once: true });
    document.head.appendChild(script);
  });

  return kakaoMapsPromise;
}

export function loadDaumPostcode(): Promise<DaumPostcodeConstructor> {
  const loadedPostcode = window.kakao?.Postcode ?? window.daum?.Postcode;
  if (loadedPostcode) return Promise.resolve(loadedPostcode);
  if (postcodePromise) return postcodePromise;

  postcodePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-ubot-daum-postcode]');
    const script = existing ?? document.createElement('script');
    const onReady = () => {
      const Postcode = window.kakao?.Postcode ?? window.daum?.Postcode;
      if (Postcode) resolve(Postcode);
      else reject(new Error('주소 검색 서비스를 불러오지 못했습니다.'));
    };
    const onError = () => reject(new Error('주소 검색 서비스 로드에 실패했습니다.'));

    if (existing) {
      existing.addEventListener('load', onReady, { once: true });
      existing.addEventListener('error', onError, { once: true });
      return;
    }

    script.dataset.ubotDaumPostcode = '1';
    script.async = true;
    script.src = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.addEventListener('load', onReady, { once: true });
    script.addEventListener('error', onError, { once: true });
    document.head.appendChild(script);
  });

  return postcodePromise;
}

export async function coordinatesForAddress(
  address: string,
): Promise<{ latitude: number; longitude: number }> {
  const maps = await loadKakaoMaps();
  if (!maps.services?.Geocoder) {
    throw new Error('카카오 주소 좌표 변환 서비스를 사용할 수 없습니다.');
  }

  return new Promise((resolve, reject) => {
    const geocoder = new maps.services.Geocoder();
    geocoder.addressSearch(address, (results, status) => {
      if (status !== maps.services.Status.OK || !results.length) {
        reject(new Error('선택한 주소의 좌표를 찾지 못했습니다.'));
        return;
      }
      resolve({ latitude: Number(results[0].y), longitude: Number(results[0].x) });
    });
  });
}
