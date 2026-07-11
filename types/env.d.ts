declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    EXPO_PUBLIC_SUPABASE_KEY?: string;
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_APP_MODE?: 'production' | 'demo';
    EXPO_PUBLIC_ENABLE_DEMO_APP?: 'true' | 'false';
  }
}

declare module '*.css';
