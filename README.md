# U봇 Responsive Service Mock v4 · Vite + React

기존 HTML/CSS/Vanilla JS Mock을 Vite + React 개발 환경으로 옮긴 버전입니다. 기존 화면과 10개 시연 시나리오는 그대로 유지합니다.

현재 1차 마이그레이션 단계에서는 기존 마크업과 시연 로직을 React 엔트리에서 재사용합니다. 이후 화면별 컴포넌트와 React 상태로 순차 분리할 수 있습니다.

핵심 변경:
- AI를 서비스 중심에서 빼고 전체 통신 서비스 안의 하나의 검색 기능으로 배치
- 모바일에서 관측한 56px 헤더 / 흰 배경 / Pretendard / #FF2E98 / pill UI / 하단 5탭 문법 유지
- 데스크톱은 소비자 통신사 웹사이트처럼 Global Navigation + Editorial Landing 구조
- AI 화면은 기존의 단순 카드형 챗봇에서 Thread / 상태 / 실시간 인기 질문 / 상품 카드 / 지도 / 로그인 / 오류 / 재시도 / FAQ 미응답 등 실제 서비스 흐름 중심으로 변경

## 시연 메뉴
데스크톱 상단의 `시연`, 모바일 우측 상단 `⋯` 버튼을 누르면 10개 시나리오를 바로 실행할 수 있습니다.

1. 비회원 → 실시간 인기 질문 → 최신폰 → 상품 상세 + 가까운 대리점
2. FAQ 미응답 → 신뢰도 임계치 미달 → 상담원 연결 + 미응답 로그
3. 답변 생성 실패 → 재시도 → 정상 응답
4. "나의 혜택" → 로그인 유도
5. 로그인 후 비회원 Thread 승계
6. 모호한 결합상품 질문 → 재질문 → 추천 3개 → 결합 변경
7. 관리자 미응답 로그 → FAQ 등록 → Vector DB 즉시 반영 → 동일 질문 정상 응답
8. 최초 5G 질문 1.84s → 유사질문 Semantic Cache 0.12s
9. 위치 기반 가까운 대리점 → 방문 예약 → 알림 Mock
10. 관리자 운영 대시보드

## 실행
```bash
npm install
npm run dev
```

Vite가 출력하는 로컬 주소(기본 `http://localhost:5173`)로 접속합니다.

## 각자 로컬 Spring 서버 연결

두 명이 같은 프론트 저장소를 사용하면서 각자 자신의 Spring Boot 서버를 붙일 수 있습니다.

먼저 `.env.example`을 `.env.local`로 복사합니다.

```bash
copy .env.example .env.local
```

각 개발자는 자신의 Spring 서버 주소만 다르게 설정하면 됩니다.

```env
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:8080
VITE_KAKAO_JAVASCRIPT_KEY=카카오_JavaScript_키
```

프론트에서는 `src/api/client.js`의 공통 API client를 사용합니다.

```js
import { api } from './api/client.js';

const products = await api.get('/products');
const result = await api.post('/login', { id: 'user', password: 'pw' });
```

개발 중 `/api/...` 요청은 Vite가 각자의 `VITE_API_PROXY_TARGET`으로 전달하므로, 기본적인 로컬 개발에서는 Spring 쪽 CORS 설정 없이도 사용할 수 있습니다. `.env.local`을 바꾼 뒤에는 `npm run dev`를 다시 시작해야 합니다.

매장 찾기 화면은 Spring의 `/locations/search`, `/stores/nearby` API와 Kakao Maps JavaScript SDK를 사용합니다. `KAKAO_REST_API_KEY`는 백엔드에만 유지하고, 프론트에는 Kakao Developers에서 발급한 JavaScript 키만 `VITE_KAKAO_JAVASCRIPT_KEY`로 설정합니다.

GitHub Pages에서도 지도를 띄우려면 Repository Settings의 Actions secret에 `VITE_KAKAO_JAVASCRIPT_KEY`, Actions variable에 배포된 백엔드의 HTTPS 주소를 `VITE_API_BASE_URL`로 등록합니다. Kakao Developers의 JavaScript SDK 허용 도메인에도 `https://ureca-ubot.github.io`를 등록해야 합니다.

프로덕션 빌드 확인:

```bash
npm run build
```

또는

`https://ureca-final-project-temp.github.io/UBot-FE-Mock/`

모바일은 Chrome DevTools에서 360x616 또는 Android/iPhone viewport로 확인하면 됩니다.

모든 상품/고객/위치/응답 데이터는 프로젝트 시연용 Mock입니다.


## Branding update
- Generated U봇 image logo integrated in desktop/mobile header
- Removed O+/ONE+ text mark and the mobile 멤버십/◇ clutter
- Added `assets/ubot-logo.png`, `assets/ubot-mark.png`
