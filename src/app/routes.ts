export type Page = 'home' | 'store' | 'product' | 'my' | 'benefits' | 'network' | 'stores' | 'ai' | 'admin';

export const pageTitles: Record<Page, string> = {
  home: 'U봇', store: '스토어', product: '상품 상세', my: 'MY', benefits: '혜택',
  network: '통신 상태', stores: '매장 찾기', ai: 'AI 검색', admin: '운영',
};

const routePaths: Record<Page, string> = {
  home: '', store: 'store', product: 'store/product', my: 'my', benefits: 'benefit',
  network: 'support', stores: 'support/store-address', ai: 'ai', admin: 'admin',
};

const pathAliases: Record<string, Page> = {
  '': 'home', store: 'store', 'store/product': 'product', my: 'my', benefit: 'benefits',
  benefits: 'benefits', support: 'network', network: 'network',
  'support/store-address': 'stores', stores: 'stores', ai: 'ai', admin: 'admin',
};

const appBase = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');

export function pageFromLocation(): Page {
  let path = window.location.pathname;
  if (appBase !== '/' && path.startsWith(appBase)) path = path.slice(appBase.length);
  else path = path.replace(/^\/+/, '');
  return pathAliases[path.replace(/\/+$/g, '')] ?? 'home';
}

export function pageUrl(page: Page) {
  const path = routePaths[page];
  return path ? `${appBase}${path}` : appBase;
}

export function isPage(value: string | undefined): value is Page {
  return Boolean(value && value in pageTitles);
}
