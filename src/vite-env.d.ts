/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_SUPABASE_URL: string;
  readonly REACT_APP_SUPABASE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
