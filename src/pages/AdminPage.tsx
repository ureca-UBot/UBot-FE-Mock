import { useEffect } from 'react';
import { setupAdminStoreManagement } from '../features/admin-store/setupAdminStoreManagement';

interface PageProps {
  active: boolean;
  questionCount: number;
  cacheHit: boolean;
  faqSatellite: boolean;
}

export function AdminPage({
  active,
  questionCount,
  cacheHit,
  faqSatellite,
}: PageProps) {
  useEffect(
    () => setupAdminStoreManagement(),
    [],
  );

  return (
    <>
      <section
        className={`route admin-route${active ? ' active' : ''}`}
        data-page="admin"
      >
        <div className="admin-head">
          <div>
            <span>OPERATIONS</span>

            <h1 id="adminPageTitle">
              AI 상담 운영 대시보드
            </h1>

            <p id="adminPageDescription">
              1~9번 시연에서 발생한 질문·캐시·미응답·지연 지표를 확인합니다.
            </p>
          </div>

          <button data-route="home">
            서비스 화면으로
          </button>
        </div>

        <div className="admin-wrap">
          <div
            className="admin-tabs"
            role="tablist"
            aria-label="관리자 메뉴"
          >
            <button
              className="active"
              type="button"
              role="tab"
              aria-selected="true"
              data-admin-tab="operations"
            >
              운영 대시보드
            </button>

            <button
              type="button"
              role="tab"
              aria-selected="false"
              data-admin-tab="stores"
            >
              매장 관리
            </button>
          </div>

          <div data-admin-panel="operations">
            <div className="kpi-grid">
              <article>
                <span>오늘 질문</span>

                <b id="kpiQuestions">
                  {questionCount.toLocaleString('ko-KR')}
                </b>

                <small>
                  어제 대비 +12.4%
                </small>
              </article>

              <article>
                <span>
                  캐시 히트율
                </span>

                <b id="kpiCache">
                  {cacheHit ? '44.1%' : '41.8%'}
                </b>

                <small id="cacheDelta">
                  {cacheHit
                    ? '+5.5%p'
                    : '+3.2%p'}
                </small>
              </article>

              <article>
                <span>
                  미응답 질문
                </span>

                <b id="kpiUnanswered">
                  {faqSatellite ? '16' : '17'}
                </b>

                <small>
                  최근 1시간 3건
                </small>
              </article>

              <article>
                <span>
                  응답 지연
                </span>

                <b id="kpiLatency">
                  p95 2.8s
                </b>

                <small>
                  p50 0.9s
                </small>
              </article>
            </div>

            <div className="admin-main-grid">
              <section className="admin-panel metrics-panel">
                <div className="panel-head">
                  <div>
                    <small>
                      질문 추이
                    </small>

                    <h2>
                      카테고리별 질문량
                    </h2>
                  </div>

                  <span>
                    최근 24시간
                  </span>
                </div>

                <div className="bar-chart">
                  <div>
                    <span>요금제</span>

                    <i>
                      <b
                        style={{
                          width: '86%',
                        }}
                      />
                    </i>

                    <em>382</em>
                  </div>

                  <div>
                    <span>휴대폰</span>

                    <i>
                      <b
                        style={{
                          width: '72%',
                        }}
                      />
                    </i>

                    <em>321</em>
                  </div>

                  <div>
                    <span>인터넷</span>

                    <i>
                      <b
                        style={{
                          width: '55%',
                        }}
                      />
                    </i>

                    <em>244</em>
                  </div>

                  <div>
                    <span>매장</span>

                    <i>
                      <b
                        style={{
                          width: '35%',
                        }}
                      />
                    </i>

                    <em>154</em>
                  </div>

                  <div>
                    <span>혜택</span>

                    <i>
                      <b
                        style={{
                          width: '28%',
                        }}
                      />
                    </i>

                    <em>126</em>
                  </div>
                </div>
              </section>

              <section className="admin-panel latency-panel">
                <div className="panel-head">
                  <div>
                    <small>
                      응답 시간
                    </small>

                    <h2>
                      캐시 효과 비교
                    </h2>
                  </div>

                  <span>
                    시나리오 8
                  </span>
                </div>

                <div className="latency-compare">
                  <div>
                    <span>
                      최초 생성
                    </span>

                    <b id="firstLatency">
                      1.84s
                    </b>

                    <i>
                      <u
                        style={{
                          height: '84%',
                        }}
                      />
                    </i>
                  </div>

                  <div>
                    <span>
                      유사 질문 캐시
                    </span>

                    <b id="cachedLatency">
                      0.12s
                    </b>

                    <i>
                      <u
                        className="cachebar"
                        style={{
                          height: '12%',
                        }}
                      />
                    </i>
                  </div>
                </div>

                <p id="cacheStory">
                  "5G 요금제 뭐 있어요?" → "5G플랜 종류 알려줘" 비교
                </p>
              </section>

              <section className="admin-panel unanswered-panel">
                <div className="panel-head">
                  <div>
                    <small>
                      미응답 로그
                    </small>

                    <h2>
                      FAQ 보완 필요 질문
                    </h2>
                  </div>

                  <button id="refreshUnanswered">
                    새로고침
                  </button>
                </div>

                <div
                  className="unanswered-list"
                  id="unansweredList"
                >
                  {!faqSatellite && (
                    <article data-question="위성 인터넷 서비스도 되나요?">
                      <div>
                        <span className="risk">
                          유사도 0.41
                        </span>

                        <b>
                          위성 인터넷 서비스도 되나요?
                        </b>

                        <small>
                          FAQ 검색 신뢰도 임계치 0.78 미달
                        </small>
                      </div>

                      <button className="register-faq">
                        FAQ 등록
                      </button>
                    </article>
                  )}

                  <article>
                    <div>
                      <span>
                        유사도 0.52
                      </span>

                      <b>
                        해외에서 eSIM을 바로 개통할 수 있나요?
                      </b>

                      <small>
                        관련 FAQ 부족
                      </small>
                    </div>

                    <button>
                      FAQ 등록
                    </button>
                  </article>
                </div>
              </section>

              <section className="admin-panel cache-panel">
                <div className="panel-head">
                  <div>
                    <small>
                      CACHE
                    </small>

                    <h2>
                      최근 캐시 히트
                    </h2>
                  </div>

                  <span id="cacheHitBadge">
                    {cacheHit
                      ? '44.1%'
                      : '41.8%'}
                  </span>
                </div>

                <div className="cache-table">
                  <div className="row head">
                    <span>질문</span>
                    <span>유형</span>
                    <span>시간</span>
                  </div>

                  <div className="row">
                    <span>
                      5G플랜 종류 알려줘
                    </span>

                    <b>
                      SEMANTIC HIT
                    </b>

                    <em>
                      120ms
                    </em>
                  </div>

                  <div className="row">
                    <span>
                      납부방법 변경
                    </span>

                    <b>
                      CANONICAL
                    </b>

                    <em>
                      84ms
                    </em>
                  </div>

                  <div className="row">
                    <span>
                      인터넷 이전 설치
                    </span>

                    <b>
                      SEMANTIC HIT
                    </b>

                    <em>
                      146ms
                    </em>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <section
            className="admin-store-view hidden"
            data-admin-panel="stores"
            aria-labelledby="adminStoreTitle"
          >
            <div className="admin-store-toolbar">
              <div>
                <small>
                  STORE MANAGEMENT
                </small>

                <h2 id="adminStoreTitle">
                  매장 관리
                </h2>

                <p>
                  등록된 매장 정보를 확인하고 신규 등록, 수정, 삭제할 수 있습니다.
                </p>
              </div>

              <button
                className="admin-store-create"
                id="adminStoreCreate"
                type="button"
              >
                매장 등록
              </button>
            </div>

            <div
              className="admin-store-notice"
              id="adminStoreNotice"
              role="status"
            >
              매장 정보를 불러오고 있습니다.
            </div>

            <div className="admin-store-table-wrap">
              <table className="admin-store-table">
                <thead>
                  <tr>
                    <th>매장</th>
                    <th>지역</th>
                    <th>연락처</th>
                    <th>영업시간</th>

                    <th>
                      <span className="sr-only-title">
                        관리
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody id="adminStoreRows" />
              </table>
            </div>

            <div
              className="admin-store-empty hidden"
              id="adminStoreEmpty"
            >
              조회된 매장이 없습니다.
            </div>

            <div className="admin-store-pagination">
              <button
                id="adminStorePrev"
                type="button"
              >
                이전
              </button>

              <span id="adminStorePageInfo">
                1 / 1
              </span>

              <button
                id="adminStoreNext"
                type="button"
              >
                다음
              </button>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}