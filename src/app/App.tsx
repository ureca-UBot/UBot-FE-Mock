import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { hasAccessToken } from '../auth/tokenStorage';
import { LoginModal } from '../components/auth/LoginModal';
import { DesktopHeader } from '../components/layout/DesktopHeader';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { MobileHeader } from '../components/layout/MobileHeader';
import { AppDialogs, type AppDialog } from '../components/modals/AppDialogs';
import { AdminPage } from '../pages/AdminPage';
import { AiPage, type AiMessage } from '../pages/AiPage';
import { BenefitsPage } from '../pages/BenefitsPage';
import { HomePage } from '../pages/HomePage';
import { MyPage } from '../pages/MyPage';
import { NetworkPage } from '../pages/NetworkPage';
import { ProductPage } from '../pages/ProductPage';
import { StoreLocatorPage } from '../pages/StoreLocatorPage';
import { StorePage } from '../pages/StorePage';
import { isPage, pageFromLocation, pageTitles, pageUrl, type Page } from './routes';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export default function App() {
  const [page, setPage] = useState<Page>(() => pageFromLocation());
  const [loggedIn, setLoggedIn] = useState(() => hasAccessToken());
  const [scrolled, setScrolled] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<AppDialog>(null);
  const [toast, setToast] = useState('');
  const [selectedStore, setSelectedStore] = useState('U봇 강남직영점');
  const [productTitle, setProductTitle] = useState('Galaxy S26');
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [chatActive, setChatActive] = useState(false);
  const [context, setContext] = useState<string[]>([]);
  const [faqSatellite, setFaqSatellite] = useState(false);
  const [cachePrimed, setCachePrimed] = useState(false);
  const messageId = useRef(0);
  const failNext = useRef(false);
  const pendingAfterLogin = useRef<string | null>(null);
  const pendingAiPrompt = useRef('');

  const navigate = useCallback((nextPage: Page, replace = false, fromHistory = false) => {
    setPage(nextPage);
    if (!fromHistory) window.history[replace ? 'replaceState' : 'pushState']({ route: nextPage }, '', pageUrl(nextPage));
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []);

  const addMessage = useCallback((role: AiMessage['role'], html: string) => {
    setMessages((current) => [...current, { id: ++messageId.current, role, html }]);
  }, []);

  const sendAi = useCallback(async (rawQuestion?: string, retry = false) => {
    const question = rawQuestion?.trim();
    if (!question) return;
    setChatActive(true);
    setContext([]);
    addMessage('user', escapeHtml(question));

    if (failNext.current && !retry) {
      failNext.current = false;
      await wait(420);
      addMessage('ai', `<div class="chat-card error-card"><div class="chat-card-pad"><h4>답변 생성 실패</h4><p>서버 응답이 지연되어 답변을 완료하지 못했어요.</p><div class="answer-actions"><button class="retry-btn" data-retry="${escapeHtml(question)}">재시도</button></div></div></div>`);
      return;
    }

    await wait(360);
    if (/최신\s*폰|최신\s*핸드폰|새로운\s*폰/.test(question)) {
      setContext(['상품 DB', '현재 위치', '실시간 인기검색']);
      addMessage('ai', '<div class="answer-text">최근 많이 찾는 스마트폰을 기준으로 3가지를 정리했어요. 상품을 누르면 상세 페이지로 이동할 수 있어요.</div><div class="product-list-mini"><div class="mini-product"><div class="mini-phone"></div><div><b>Galaxy S26</b><small>월 58,900원부터</small><button data-product-link="Galaxy S26">상품 페이지 보기</button></div></div><div class="mini-product"><div class="mini-phone"></div><div><b>iPhone 17 Pro</b><small>월 69,800원부터</small><button data-product-link="iPhone 17 Pro">상품 페이지 보기</button></div></div></div><div class="answer-actions"><button class="primary" data-chat-route="stores">지도에서 보기</button><button data-reserve>방문 예약</button></div>');
    } else if (/위성\s*인터넷/.test(question)) {
      addMessage('ai', faqSatellite
        ? '<div class="answer-text">현재 U봇에서는 위성 인터넷 상품을 제공하지 않습니다. 이용 가능한 인터넷 상품은 지역별 설치 가능 여부를 확인해 주세요.</div><div class="chat-card success-card"><div class="chat-card-pad"><h4>신규 FAQ 반영 완료</h4><p>관리자가 등록한 FAQ가 Vector DB 검색 결과에 즉시 포함된 시연입니다.</p></div></div>'
        : '<div class="chat-card warning-card"><div class="chat-card-pad"><h4>정확한 답변을 찾지 못했습니다.</h4><p>검색된 FAQ의 유사도가 신뢰도 임계치보다 낮아요. 상담원 연결이 필요하신가요?</p><div class="score-line"><span>최고 유사도 0.41</span><span>임계치 0.78 미달</span></div><div class="answer-actions"><button class="primary">상담원 연결</button><button data-admin>관리자 미응답 로그 보기</button></div></div></div>');
    } else if (/나의\s*혜택|내\s*혜택/.test(question)) {
      if (!loggedIn) {
        pendingAfterLogin.current = question;
        addMessage('ai', '<div class="chat-card notice-card"><div class="chat-card-pad"><h4>로그인이 필요한 질문입니다.</h4><p>내 요금제와 개인 혜택을 확인하려면 로그인해 주세요. 지금까지의 비회원 대화는 그대로 유지됩니다.</p><button class="primary" data-login-required>로그인하기</button></div></div>');
      } else {
        setContext(['고객 DB', '5G 스탠다드', '비회원 Thread 승계']);
        addMessage('ai', '<div class="answer-text">김유저님은 현재 <b>5G 스탠다드</b>를 이용 중이에요. 이번 달에는 VIP 영화 할인과 데이터 선물 혜택을 사용할 수 있어요.</div><button class="primary" data-chat-route="benefits">혜택 전체 보기</button>');
      }
    } else if (/결합상품\s*추천|결합\s*추천/.test(question) && !/으로\s*추천/.test(question)) {
      addMessage('ai', '<div class="answer-text">어떤 결합을 원하시는지 정보가 부족해요.</div><div class="quick-choices"><button class="primary" data-choice="인터넷 결합으로 추천해줘">인터넷</button><button data-choice="OTT 결합으로 추천해줘">OTT</button><button data-choice="가족 결합으로 추천해줘">가족결합</button></div>');
    } else if (/인터넷\s*결합으로\s*추천|OTT\s*결합으로\s*추천|가족\s*결합으로\s*추천/.test(question)) {
      if (!loggedIn) {
        pendingAfterLogin.current = question;
        addMessage('ai', '<div class="chat-card notice-card"><div class="chat-card-pad"><h4>현재 요금제를 확인하려면 로그인이 필요해요.</h4><button class="primary" data-login-required>로그인하기</button></div></div>');
      } else {
        setContext(['현재 요금제 5G 스탠다드', '결합상품 DB']);
        addMessage('ai', '<div class="answer-text">현재 5G 스탠다드 기준으로 인터넷 결합 3가지를 비교했어요.</div><div class="bundle-cards"><div class="bundle-card"><small>절약형</small><b>500M 인터넷 결합</b><p>월 11,000원 예상 할인</p></div><div class="bundle-card"><small>추천</small><b>1G 인터넷 결합</b><p>속도와 할인 균형</p></div></div><button class="primary" data-bundle>결합 변경하기</button>');
      }
    } else if (/5G\s*요금제\s*뭐|5G\s*요금제/.test(question)) {
      setCachePrimed(true);
      setContext(['Qdrant RAG', '응답 1.84s']);
      addMessage('ai', '<div class="answer-text">현재 시연용 5G 요금제는 라이트, 스탠다드, 프리미엄 3가지예요.</div><div class="metric-inline"><b>1.84s</b><span>RAG 검색 + 생성</span></div>');
    } else if (/5G플랜|플랜\s*종류/.test(question) && cachePrimed) {
      setContext(['Semantic Cache HIT', '응답 0.12s']);
      addMessage('ai', '<div class="answer-text">5G 플랜은 라이트, 스탠다드, 프리미엄이 있어요. 앞선 질문과 의미가 유사해 캐시된 답변을 즉시 재사용했어요.</div><div class="metric-inline"><b>0.12s</b><span>최초 생성 1.84s → 캐시 0.12s</span></div>');
    } else if (/가까운\s*대리점|가까운\s*매장|대리점.*찾/.test(question)) {
      setContext(['위치 37.50,127.03', 'PostGIS nearest-store']);
      addMessage('ai', '<div class="answer-text">현재 위치 기준으로 가장 가까운 대리점은 <b>U봇 강남직영점</b>이고 약 420m 떨어져 있어요.</div><button class="primary" data-reserve>방문 예약</button><button data-chat-route="stores">매장 상세</button>');
    } else if (/인터넷\s*이전|이전\s*설치|이사/.test(question)) {
      setContext(['FAQ 3건']);
      addMessage('ai', '<div class="answer-text">인터넷 이전 설치는 새 주소의 설치 가능 여부를 확인한 뒤 희망 일정을 선택하면 돼요. 기존 약정은 이전 설치 후 이어집니다.</div>');
    } else addMessage('ai', '현재는 시연용 Mock이라 준비된 시나리오에 맞춰 동작해요. 실시간 인기 질문에서 질문을 선택해보세요.');
  }, [addMessage, cachePrimed, faqSatellite, loggedIn]);

  useEffect(() => {
    document.body.dataset.route = page;
    document.title = `${pageTitles[page]} · U봇 통신 생활 서비스`;
    document.dispatchEvent(new CustomEvent('ubot:route-change', { detail: { route: page } }));
    if (page !== 'ai' || !pendingAiPrompt.current) return;
    const prompt = pendingAiPrompt.current;
    pendingAiPrompt.current = '';
    const timer = window.setTimeout(() => void sendAi(prompt), 180);
    return () => window.clearTimeout(timer);
  }, [page, sendAi]);

  useEffect(() => {
    const onPopState = () => navigate(pageFromLocation(), false, true);
    const onScroll = () => setScrolled((current) => current ? window.scrollY >= 16 : window.scrollY > 96);
    const onStoreSelected = (event: Event) => {
      const name = (event as CustomEvent<{ name?: string }>).detail?.name;
      if (name) setSelectedStore(name);
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('ubot:store-selected', onStoreSelected);
    onScroll();
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('ubot:store-selected', onStoreSelected);
    };
  }, [navigate]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setHeroIndex((index) => (index + 1) % 3), 5800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 1900);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const runDemo = async (scenario: string) => {
    setActiveDialog(null);
    if (scenario === '7' || scenario === '10') { navigate('admin'); return; }
    if (scenario === '3') failNext.current = true;
    if (scenario === '5') setLoggedIn(false);
    navigate('ai');
    await wait(150);
    const prompts: Record<string, string> = {
      '1': '최신 폰 어떤게 있어?', '2': '위성 인터넷 서비스도 되나요?', '3': '인터넷 이전 설치 방법 알려줘',
      '4': '나의 혜택 알려줘', '5': '최신 폰 어떤게 있어?', '6': '내 요금제에 맞는 결합상품 추천해줘',
      '9': '가까운 대리점을 찾고 싶어',
    };
    if (scenario === '8') {
      await sendAi('5G 요금제 뭐 있어요?');
      await wait(250);
      await sendAi('5G플랜 종류 알려줘');
    } else if (prompts[scenario]) await sendAi(prompts[scenario]);
    if (scenario === '5') { pendingAfterLogin.current = '나의 혜택 알려줘'; setLoginOpen(true); }
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLElement>('button, a, article[data-route]');
    if (!target) return;
    const route = target.dataset.route;
    if (isPage(route)) {
      event.preventDefault();
      if (target.dataset.aiPrompt) pendingAiPrompt.current = target.dataset.aiPrompt;
      navigate(route);
      return;
    }
    if (target.classList.contains('open-login') || target.hasAttribute('data-login-required')) setLoginOpen(true);
    else if (target.id === 'demoOpen' || target.id === 'mobileDemoOpen') setActiveDialog('demo');
    else if (target.id === 'demoClose') setActiveDialog(null);
    else if (target.dataset.demo) void runDemo(target.dataset.demo);
    else if (target.classList.contains('hero-prev')) setHeroIndex((index) => (index + 2) % 3);
    else if (target.classList.contains('hero-next')) setHeroIndex((index) => (index + 1) % 3);
    else if (target.dataset.heroGo) setHeroIndex(Number(target.dataset.heroGo));
    else if (target.classList.contains('product-detail')) {
      setProductTitle(target.closest<HTMLElement>('.phone-product')?.dataset.product || 'Galaxy S26');
      navigate('product');
    } else if (target.classList.contains('reserve-main') || target.hasAttribute('data-reserve')) setActiveDialog('reserve');
    else if (target.id === 'reportOpen') setToast('통신 불편 제보가 접수되었습니다. (Mock)');
    else if (target.id === 'reserveSubmit') setToast('방문 예약 완료 · 예약 확인 알림이 발송됐어요. (Mock)');
    else if (target.id === 'bundleSubmit') setToast('결합 변경이 완료되었습니다. (Mock)');
    else if (target.hasAttribute('data-bundle')) setActiveDialog('bundle');
    else if (target.classList.contains('register-faq')) setActiveDialog('faq');
    else if (target.hasAttribute('data-admin')) navigate('admin');
    else if (target.id === 'faqSubmit') { setFaqSatellite(true); setToast('FAQ 등록 완료 · Vector DB 즉시 반영 (Mock)'); }
    else if (target.id === 'refreshUnanswered') setToast('미응답 로그를 새로고침했어요.');
    else if (target.id === 'newChat') { setMessages([]); setContext([]); setChatActive(false); }
    else if (target.classList.contains('send-ai')) void sendAi(target.closest('.ai-searchbox')?.querySelector<HTMLTextAreaElement>('textarea')?.value);
    else if (target.dataset.aiQ) void sendAi(target.dataset.aiQ);
    else if (target.dataset.retry) void sendAi(target.dataset.retry, true);
    else if (target.dataset.choice) void sendAi(target.dataset.choice);
    else if (target.dataset.chatRoute && isPage(target.dataset.chatRoute)) navigate(target.dataset.chatRoute);
    else if (target.dataset.productLink) { setProductTitle(target.dataset.productLink); navigate('product'); }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || !(event.target instanceof HTMLTextAreaElement)) return;
    event.preventDefault();
    void sendAi(event.target.value);
  };

  const handleLoginSuccess = () => {
    setLoggedIn(true);
    setLoginOpen(false);
    setToast('로그인 완료 · 비회원 대화가 이어졌어요.');
    navigate('ai');
    if (!pendingAfterLogin.current) return;
    const prompt = pendingAfterLogin.current;
    pendingAfterLogin.current = null;
    window.setTimeout(() => void sendAi(prompt), 260);
  };

  return (
    <div onClick={handleClick} onKeyDown={handleKeyDown}>
      <div className="site">
        <DesktopHeader loggedIn={loggedIn} scrolled={scrolled} page={page} />
        <MobileHeader title={pageTitles[page]} />
        <main>
          <HomePage active={page === 'home'} heroIndex={heroIndex} loggedIn={loggedIn} />
          <StorePage active={page === 'store'} />
          <ProductPage active={page === 'product'} productTitle={productTitle} />
          <MyPage active={page === 'my'} loggedIn={loggedIn} />
          <BenefitsPage active={page === 'benefits'} />
          <NetworkPage active={page === 'network'} />
          <StoreLocatorPage active={page === 'stores'} />
          <AiPage active={page === 'ai'} loggedIn={loggedIn} chatActive={chatActive} messages={messages} context={context} />
          <AdminPage active={page === 'admin'} />
        </main>
        <MobileBottomNav page={page} />
        <button className="desktop-only floating-ai" data-route="ai"><span>✦</span><b>AI 검색</b></button>
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={handleLoginSuccess} />
      <AppDialogs activeDialog={activeDialog} selectedStore={selectedStore} onClose={() => setActiveDialog(null)} />
      <div className={`toast${toast ? ' show' : ''}`} id="toast">{toast || '완료되었습니다.'}</div>
    </div>
  );
}
