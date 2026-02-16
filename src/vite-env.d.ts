/// <reference types="vite/client" />

declare const __APP_BUILD_ID__: string;

declare global {
  interface Window {
    __EDUREACH_SW_REG__?: ServiceWorkerRegistration;
  }
}
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  // add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
