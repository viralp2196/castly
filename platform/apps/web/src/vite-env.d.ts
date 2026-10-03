/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute API origin when the web app is hosted separately (e.g. https://api.castly.app). Empty = same origin. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
