let kakaoMapsPromise;
let postcodePromise;

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
      existing.addEventListener(
        'error',
        () => reject(new Error('카카오 지도 SDK 로드에 실패했습니다.')),
        { once: true },
      );
      return;
    }

    script.dataset.ubotKakaoMap = '1';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`;
    script.addEventListener('load', onReady, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('카카오 지도 SDK 로드에 실패했습니다.')),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return kakaoMapsPromise;
}

export function loadDaumPostcode() {
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
      existing.addEventListener(
        'error',
        () => reject(new Error('주소 검색 서비스 로드에 실패했습니다.')),
        { once: true },
      );
      return;
    }

    script.dataset.ubotDaumPostcode = '1';
    script.async = true;
    script.src = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.addEventListener('load', onReady, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('주소 검색 서비스 로드에 실패했습니다.')),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return postcodePromise;
}

export function coordinatesForAddress(address) {
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
