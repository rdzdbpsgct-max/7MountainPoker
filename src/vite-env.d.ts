/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_APP_TIER?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_BASE_PATH?: string;
  readonly VITE_RELEASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
