import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { hasAccessToken } from '../auth/tokenStorage';
import { LoginModal } from '../components/auth/LoginModal';
import { DesktopHeader } from '../components/layout/DesktopHeader';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { MobileHeader } from '../components/layout/MobileHeader';
import {
  AppDialogs,
  type AppDialog,
} from '../components/modals/AppDialogs';
import { useAiDemo } from '../features/ai-demo/useAiDemo';
import { AdminPage } from '../pages/AdminPage';
import { AiPage } from '../pages/AiPage';
import { BenefitsPage } from '../pages/BenefitsPage';
import { HomePage } from '../pages/HomePage';
import { MyPage } from '../pages/MyPage';
import { NetworkPage } from '../pages/NetworkPage';
import { ProductPage } from '../pages/ProductPage';
import { StoreLocatorPage } from '../pages/StoreLocatorPage';
import { StorePage } from '../pages/StorePage';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useHeroCarousel } from './hooks/useHeroCarousel';
import { useScrollReveal } from './hooks/useScrollReveal';
import {
  isPage,
  pageTitles,
} from './routes';

export default function App() {
  const {
    page,
    navigate,
  } = useAppNavigation();

  const {
    heroIndex,
    previous: previousHero,
    next: nextHero,
    goTo: goToHero,
  } = useHeroCarousel();

  useScrollReveal();

  const [
    loggedIn,
    setLoggedIn,
  ] = useState(
    () => hasAccessToken(),
  );

  const [
    scrolled,
    setScrolled,
  ] = useState(false);

  const [
    loginOpen,
    setLoginOpen,
  ] = useState(false);

  const [
    activeDialog,
    setActiveDialog,
  ] = useState<AppDialog>(
    null,
  );

  const [
    toast,
    setToast,
  ] = useState('');

  const [
    selectedStore,
    setSelectedStore,
  ] = useState(
    'U봇 강남직영점',
  );

  const [
    productTitle,
    setProductTitle,
  ] = useState(
    'Galaxy S26',
  );

  const pendingAiPrompt =
    useRef('');

  const ai = useAiDemo({
    loggedIn,
  });

  const sendAi = ai.sendAi;

  useEffect(() => {
    const handleScroll =
      () => {
        setScrolled(
          (
            current,
          ) => current
            ? window.scrollY >= 16
            : window.scrollY > 96,
        );
      };

    window.addEventListener(
      'scroll',
      handleScroll,
      {
        passive: true,
      },
    );

    handleScroll();

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll,
      );
    };
  }, []);

  useEffect(() => {
    const handleStoreSelected =
      (
        event: Event,
      ) => {
        const detail = (
          event as CustomEvent<{
            name?: string;
          }>
        ).detail;

        if (
          detail?.name
        ) {
          setSelectedStore(
            detail.name,
          );
        }
      };

    document.addEventListener(
      'ubot:store-selected',
      handleStoreSelected,
    );

    return () => {
      document.removeEventListener(
        'ubot:store-selected',
        handleStoreSelected,
      );
    };
  }, []);

  useEffect(() => {
    if (
      page !== 'ai'
      || !pendingAiPrompt.current
    ) {
      return;
    }

    const prompt =
      pendingAiPrompt.current;

    pendingAiPrompt.current = '';

    const timer =
      window.setTimeout(
        () => {
          void sendAi(
            prompt,
          );
        },
        180,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    page,
    sendAi,
  ]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setToast('');
        },
        1900,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [toast]);

  const runDemo =
    useCallback(
      async (
        scenario: string,
      ) => {
        setActiveDialog(
          null,
        );

        if (
          scenario === '7'
          || scenario === '10'
        ) {
          navigate(
            'admin',
          );

          return;
        }

        if (
          scenario === '3'
        ) {
          ai.markNextFailure();
        }

        if (
          scenario === '5'
        ) {
          setLoggedIn(
            false,
          );

          ai.resetConversation();
        }

        navigate(
          'ai',
        );

        await new Promise<void>(
          (
            resolve,
          ) => {
            window.setTimeout(
              resolve,
              150,
            );
          },
        );

        const prompts:
          Record<
            string,
            string
          > = {
            '1':
              '최신 폰 어떤게 있어?',
            '2':
              '위성 인터넷 서비스도 되나요?',
            '3':
              '인터넷 이전 설치 방법 알려줘',
            '4':
              '나의 혜택 알려줘',
            '5':
              '최신 폰 어떤게 있어?',
            '6':
              '내 요금제에 맞는 결합상품 추천해줘',
            '9':
              '가까운 대리점을 찾고 싶어',
          };

        if (
          scenario === '8'
        ) {
          await ai.sendAi(
            '5G 요금제 뭐 있어요?',
          );

          await new Promise<void>(
            (
              resolve,
            ) => {
              window.setTimeout(
                resolve,
                250,
              );
            },
          );

          await ai.sendAi(
            '5G플랜 종류 알려줘',
          );

          return;
        }

        const prompt =
          prompts[
            scenario
          ];

        if (prompt) {
          await ai.sendAi(
            prompt,
          );
        }

        if (
          scenario === '5'
        ) {
          ai.queueAfterLogin(
            '나의 혜택 알려줘',
          );

          setLoginOpen(
            true,
          );
        }
      },
      [
        ai,
        navigate,
      ],
    );

  const handleClick =
    useCallback(
      (
        event:
          MouseEvent<HTMLDivElement>,
      ) => {
        if (
          !(
            event.target
            instanceof Element
          )
        ) {
          return;
        }

        const target =
          event.target.closest<HTMLElement>(
            'button, a, article[data-route]',
          );

        if (!target) {
          return;
        }

        const route =
          target.dataset.route;

        if (
          isPage(
            route,
          )
        ) {
          event.preventDefault();

          if (
            target.dataset.aiPrompt
          ) {
            pendingAiPrompt.current =
              target.dataset.aiPrompt;
          }

          navigate(
            route,
          );

          return;
        }

        if (
          target.classList.contains(
            'open-login',
          )
          || target.hasAttribute(
            'data-login-required',
          )
        ) {
          setLoginOpen(
            true,
          );

          return;
        }

        if (
          target.id
            === 'demoOpen'
          || target.id
            === 'mobileDemoOpen'
        ) {
          setActiveDialog(
            'demo',
          );

          return;
        }

        if (
          target.id
            === 'demoClose'
        ) {
          setActiveDialog(
            null,
          );

          return;
        }

        if (
          target.dataset.demo
        ) {
          void runDemo(
            target.dataset.demo,
          );

          return;
        }

        if (
          target.classList.contains(
            'hero-prev',
          )
        ) {
          previousHero();

          return;
        }

        if (
          target.classList.contains(
            'hero-next',
          )
        ) {
          nextHero();

          return;
        }

        if (
          target.dataset.heroGo
          !== undefined
        ) {
          goToHero(
            Number(
              target.dataset.heroGo,
            ),
          );

          return;
        }

        if (
          target.classList.contains(
            'product-detail',
          )
        ) {
          const product =
            target
              .closest<HTMLElement>(
                '.phone-product',
              )
              ?.dataset.product
            ?? 'Galaxy S26';

          setProductTitle(
            product,
          );

          navigate(
            'product',
          );

          return;
        }

        if (
          target.classList.contains(
            'reserve-main',
          )
          || target.hasAttribute(
            'data-reserve',
          )
        ) {
          setActiveDialog(
            'reserve',
          );

          return;
        }

        if (
          target.id
            === 'reportOpen'
        ) {
          setToast(
            '통신 불편 제보가 접수되었습니다. (Mock)',
          );

          return;
        }

        if (
          target.id
            === 'reserveSubmit'
        ) {
          setToast(
            '방문 예약 완료 · 예약 확인 알림이 발송됐어요. (Mock)',
          );

          return;
        }

        if (
          target.id
            === 'bundleSubmit'
        ) {
          setToast(
            '결합 변경이 완료되었습니다. (Mock)',
          );

          return;
        }

        if (
          target.hasAttribute(
            'data-bundle',
          )
        ) {
          setActiveDialog(
            'bundle',
          );

          return;
        }

        if (
          target.classList.contains(
            'register-faq',
          )
        ) {
          setActiveDialog(
            'faq',
          );

          return;
        }

        if (
          target.hasAttribute(
            'data-admin',
          )
        ) {
          navigate(
            'admin',
          );

          return;
        }

        if (
          target.id
            === 'faqSubmit'
        ) {
          ai.registerSatelliteFaq();

          setToast(
            'FAQ 등록 완료 · Vector DB 즉시 반영 (Mock)',
          );

          return;
        }

        if (
          target.id
            === 'refreshUnanswered'
        ) {
          setToast(
            '미응답 로그를 새로고침했어요.',
          );

          return;
        }

        if (
          target.id
            === 'newChat'
        ) {
          ai.resetConversation();

          return;
        }

        if (
          target.classList.contains(
            'send-ai',
          )
        ) {
          const value =
            target
              .closest(
                '.ai-searchbox',
              )
              ?.querySelector<HTMLTextAreaElement>(
                'textarea',
              )
              ?.value;

          void ai.sendAi(
            value,
          );

          return;
        }

        if (
          target.dataset.aiQ
        ) {
          void ai.sendAi(
            target.dataset.aiQ,
          );

          return;
        }

        if (
          target.dataset.retry
        ) {
          void ai.sendAi(
            target.dataset.retry,
            true,
          );

          return;
        }

        if (
          target.dataset.choice
        ) {
          void ai.sendAi(
            target.dataset.choice,
          );

          return;
        }

        if (
          target.dataset.chatRoute
          && isPage(
            target.dataset.chatRoute,
          )
        ) {
          navigate(
            target.dataset.chatRoute,
          );

          return;
        }

        if (
          target.dataset.productLink
        ) {
          setProductTitle(
            target.dataset.productLink,
          );

          navigate(
            'product',
          );
        }
      },
      [
        ai,
        goToHero,
        navigate,
        nextHero,
        previousHero,
        runDemo,
      ],
    );

  const handleKeyDown =
    useCallback(
      (
        event:
          KeyboardEvent<HTMLDivElement>,
      ) => {
        if (
          event.key
            !== 'Enter'
          || event.shiftKey
          || !(
            event.target
            instanceof HTMLTextAreaElement
          )
        ) {
          return;
        }

        event.preventDefault();

        void ai.sendAi(
          event.target.value,
        );
      },
      [
        ai,
      ],
    );

  const handleLoginSuccess =
    useCallback(
      () => {
        setLoggedIn(
          true,
        );

        setLoginOpen(
          false,
        );

        setToast(
          '로그인 완료 · 비회원 대화가 이어졌어요.',
        );

        navigate(
          'ai',
        );

        const prompt =
          ai.takePendingAfterLogin();

        if (!prompt) {
          return;
        }

        window.setTimeout(
          () => {
            void ai.sendAi(
              prompt,
            );
          },
          260,
        );
      },
      [
        ai,
        navigate,
      ],
    );

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="site">
        <DesktopHeader
          loggedIn={
            loggedIn
          }
          scrolled={
            scrolled
          }
          page={
            page
          }
        />

        <MobileHeader
          title={
            pageTitles[
              page
            ]
          }
        />

        <main>
          <HomePage
            active={
              page
              === 'home'
            }
            heroIndex={
              heroIndex
            }
            loggedIn={
              loggedIn
            }
          />

          <StorePage
            active={
              page
              === 'store'
            }
          />

          <ProductPage
            active={
              page
              === 'product'
            }
            productTitle={
              productTitle
            }
          />

          <MyPage
            active={
              page
              === 'my'
            }
            loggedIn={
              loggedIn
            }
          />

          <BenefitsPage
            active={
              page
              === 'benefits'
            }
          />

          <NetworkPage
            active={
              page
              === 'network'
            }
          />

          <StoreLocatorPage
            active={
              page
              === 'stores'
            }
          />

          <AiPage
            active={
              page
              === 'ai'
            }
            loggedIn={
              loggedIn
            }
            chatActive={
              ai.chatActive
            }
            messages={
              ai.messages
            }
            context={
              ai.context
            }
          />

          <AdminPage
            active={page === 'admin'}
            questionCount={ai.questionCount}
            cacheHit={ai.cacheHit}
            faqSatellite={ai.faqSatellite}
          />
        </main>

        <MobileBottomNav
          page={
            page
          }
        />

        <button
          className="desktop-only floating-ai"
          data-route="ai"
        >
          <span>
            ✦
          </span>

          <b>
            AI 검색
          </b>
        </button>
      </div>

      <LoginModal
        open={
          loginOpen
        }
        onClose={
          () => {
            setLoginOpen(
              false,
            );
          }
        }
        onSuccess={
          handleLoginSuccess
        }
      />

      <AppDialogs
        activeDialog={
          activeDialog
        }
        selectedStore={
          selectedStore
        }
        onClose={
          () => {
            setActiveDialog(
              null,
            );
          }
        }
      />

      <div
        className={
          `toast${
            toast
              ? ' show'
              : ''
          }`
        }
        id="toast"
      >
        {
          toast
          || '완료되었습니다.'
        }
      </div>
    </div>
  );
}