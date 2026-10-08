/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_SUPABASE_URL: string | undefined;
  readonly REACT_APP_SUPABASE_KEY: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
