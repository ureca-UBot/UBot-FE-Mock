import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  pageFromLocation,
  pageTitles,
  pageUrl,
  type Page,
} from '../routes';

interface NavigateOptions {
  replace?: boolean;
  fromHistory?: boolean;
}

export function useAppNavigation() {
  const [page, setPage] = useState<Page>(
    () => pageFromLocation(),
  );

  const navigate = useCallback(
    (
      nextPage: Page,
      {
        replace = false,
        fromHistory = false,
      }: NavigateOptions = {},
    ) => {
      setPage(nextPage);

      if (!fromHistory) {
        const method = replace
          ? 'replaceState'
          : 'pushState';

        window.history[method](
          { route: nextPage },
          '',
          pageUrl(nextPage),
        );
      }

      window.scrollTo({
        top: 0,
        behavior: window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches
          ? 'auto'
          : 'smooth',
      });
    },
    [],
  );

  useEffect(() => {
    document.body.dataset.route = page;

    document.title =
      `${pageTitles[page]} · U봇 통신 생활 서비스`;

    document.dispatchEvent(
      new CustomEvent(
        'ubot:route-change',
        {
          detail: {
            route: page,
          },
        },
      ),
    );
  }, [page]);

  useEffect(() => {
    const handlePopState = () => {
      navigate(
        pageFromLocation(),
        {
          fromHistory: true,
        },
      );
    };

    window.addEventListener(
      'popstate',
      handlePopState,
    );

    return () => {
      window.removeEventListener(
        'popstate',
        handlePopState,
      );
    };
  }, [navigate]);

  return {
    page,
    navigate,
  };
}