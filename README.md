# UBot Frontend

U봇 서비스의 Vite + React 프론트엔드입니다. 매장 검색, Kakao 지도, 관리자 매장 관리와 프로젝트 시연 화면을 포함합니다.

## 기술 구성

- React 19
- TypeScript 6
- Vite 8
- ESLint 10
- Kakao Maps JavaScript SDK
- Daum 우편번호 서비스

## 프로젝트 구조

```text
src/
├── api/                    공통 API client와 도메인 API
├── app/                    React 애플리케이션과 화면 전환
├── auth/                   토큰 저장소
├── components/
│   ├── auth/               로그인 UI
│   ├── layout/             공통 Header / Navigation
│   └── modals/             공통 Dialog UI
├── features/
│   ├── admin-store/        관리자 매장 관리
│   └── store-locator/      매장 검색과 지도
├── pages/                  서비스 화면 단위 React 컴포넌트
├── shared/
│   └── kakao/              Kakao Maps·우편번호 SDK 로더
├── styles/                 공통 스타일
├── types/                  공통 TypeScript 타입
└── main.tsx
```

기존 시연 화면은 React 컴포넌트 구조로 이전했으며,
src/legacy, mockup.html, setupLegacyMock.js 의존성은 제거되었습니다.

매장 검색과 관리자 매장 관리는 기존 검증된 imperative setup 모듈을
React page의 useEffect에서 연결하는 전환 구조를 사용합니다.

## 로컬 실행

Node.js LTS가 필요합니다.

```bash
npm ci
copy .env.example .env.local
npm run dev
```

기본 접속 주소는 `http://localhost:5173`입니다.

## 환경변수

```env
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:8080
VITE_DEV_PORT=5173
VITE_BASE_PATH=/
VITE_KAKAO_JAVASCRIPT_KEY=카카오_JavaScript_키
```

- `VITE_API_BASE_URL`: 브라우저가 호출할 API prefix 또는 배포된 백엔드 주소
- `VITE_API_PROXY_TARGET`: 로컬 Vite proxy가 연결할 Spring Boot 주소
- `VITE_DEV_PORT`: 로컬 개발 서버 포트
- `VITE_BASE_PATH`: 루트 배포는 `/`, GitHub Pages는 `/저장소명/`
- `VITE_KAKAO_JAVASCRIPT_KEY`: Kakao Maps 브라우저용 JavaScript 키

Kakao REST API 키는 백엔드에서만 관리합니다. `.env.local`을 변경한 뒤에는 개발 서버를 다시 시작해야 합니다.

## 검증

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

PR을 올리기 전에 세 명령이 모두 성공해야 합니다.

## 포트와 배포

Vite 개발 서버는 기본적으로 5173을 사용합니다. 운영 환경의 80/443 포트는 Vite 코드가 아니라 Nginx, Docker 또는 배포 플랫폼에서 설정합니다.

운영에서는 같은 도메인 아래에서 다음 구성을 권장합니다.

```text
/       → React 정적 파일
/api    → Spring Boot
```

SPA 경로를 직접 열 수 있도록 웹 서버에서 존재하지 않는 파일 요청을 `index.html`로 전달해야 합니다.

GitHub Pages 배포 시에는 Actions secret `VITE_KAKAO_JAVASCRIPT_KEY`와 variable `VITE_API_BASE_URL`을 등록하고, Kakao Developers의 JavaScript SDK 허용 도메인에 배포 도메인을 추가합니다.
