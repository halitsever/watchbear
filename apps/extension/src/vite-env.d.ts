/// <reference types="vite/client" />
/// <reference types="chrome" />
/// <reference types="unplugin-icons/types/react" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  readonly VITE_INVITE_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
