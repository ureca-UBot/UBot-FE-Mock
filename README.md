# U봇 Responsive Service Mock v4

이번 버전은 10개 시연 시나리오를 실제로 클릭해서 보여줄 수 있게 만든 HTML/CSS/Vanilla JS 프론트 Mock입니다.

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
python -m http.server 8080
```
브라우저에서 `http://localhost:8080`

모바일은 Chrome DevTools에서 360x616 또는 Android/iPhone viewport로 확인하면 됩니다.

모든 상품/고객/위치/응답 데이터는 프로젝트 시연용 Mock입니다.


## Branding update
- Generated U봇 image logo integrated in desktop/mobile header
- Removed O+/ONE+ text mark and the mobile 멤버십/◇ clutter
- Added `assets/ubot-logo.png`, `assets/ubot-mark.png`
