/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_BASE_PATH?: string;
  readonly VITE_DEV_PORT?: string;
  readonly VITE_KAKAO_JAVASCRIPT_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
