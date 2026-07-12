import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabaseConfigurationError =
  !supabaseUrl || !supabasePublishableKey
    ? 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    : null;

// Creating a non-networked placeholder keeps module imports safe so the app can
// render a configuration error. Production auth never mounts when config is absent.
export const supabase = createClient(
  supabaseUrl ?? 'https://configuration-required.invalid',
  supabasePublishableKey ?? 'configuration-required',
  {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  },
);
